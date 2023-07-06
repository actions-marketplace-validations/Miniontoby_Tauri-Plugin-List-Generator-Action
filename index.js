const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function generateREADME(branch='v2', folder='plugins', owner='tauri-apps', repo='plugins-workspace') {
	if (folder.endsWith("/")) folder = folder.slice(0,-1);
	const folderslash = folder + '/';

	let longest = { urlstr: 0, description: 0 };

	const pluginTemplate = (p) => `| ${p.urlstr.padEnd(longest.urlstr," ")} | ${p.description.padEnd(longest.description, " ")} | ${(p.supported?.Win===!0)?'✅':'?'}  | ${(p.supported?.Mac===!0)?'✅':'?'}  | ${(p.supported?.Lin===!0)?'✅':'?'}  | ${(p.supported?.iOS===!0)?'✅':'?'}   | ${(p.supported?.And===!0)?'✅':'?'}   |\n`;

	const octokit = github.getOctokit(process?.env?.github_token);
	const { data: json } = await octokit.rest.git.getTree({ owner, repo, tree_sha: branch, recursive: true });

	const pluginTree = json.tree?.filter(t=>t.path.startsWith(folderslash) && t.path.replace(folderslash,'').split('/').length == 2 && (t.path.endsWith("README.md") || t.path.endsWith("ios") || t.path.endsWith("android"))) ?? [];
	if (!json.tree) throw new Error('Git tree response is NOT looking as it should be looking!\n' + JSON.stringify(json));
	if (pluginTree.length == 0) throw new Error(`No plugins are found in folder ${folder}!`);

	for (const plugin of pluginTree) {
		plugin.foldername = plugin.path.replace(folderslash, '').split("/")[0]; // ${folder}/myplugin/README.md

		if (plugin.path.endsWith("ios") || plugin.path.endsWith("android")) {
			let pl = pluginTree.find((p)=>p.foldername==plugin.foldername);
			if (!pl) {
				// Maybe README hasn't been first, so we try to find it and use it
				pl = pluginTree.find((p)=>{
					const f=p.path.replace(folderslash, '').split("/");
					return f[0]==plugin.foldername && f[1]=="README.md";
				});
				if (pl) pl.supported = { Win: null, Mac: null, Lin: null, iOS: null, And: null };
			}
			if (pl && plugin.path.endsWith("ios")) pl.supported.iOS = true;
			if (pl && plugin.path.endsWith("android")) pl.supported.And = true;
			plugin.skip = true;
			continue;
		}

		plugin.urlstr = `[${plugin.foldername}](${folder}/${plugin.foldername})`;
		plugin.description = '';
		if (!plugin.supported) plugin.supported = { Win: null, Mac: null, Lin: null, iOS: null, And: null };
		plugin.content = await octokit.rest.git.getBlob({ owner, repo, file_sha: plugin.url.replace(/.*\/git\/blobs\//,'') }).then(d=>atob(d.data.content)); 

		const regex = /\[([^\]]+)\]\(([^\)]+)\)\n\n(.*)\n\n## Install/s;
		let m, n;
		if ((m = regex.exec(plugin.content)) !== null) {
			plugin.description = m[3].replaceAll("\n", " ").replace(/>.*/s, "");

			// match '- Supported platforms: Windows, Linux, FreeBSD, NetBSD, OpenBSD, and macOS.' OR 'Supports Windows, Mac (via AppleScript or Launch Agent), and Linux.'
			if ((n = /(.*)(\n\n- Supported platforms: (.*))/s.exec(m[3])) || (n = /(.*)( Supports (.*))/s.exec(m[3]))) {
				plugin.description = n[1];
				plugin.supportedstr = n[3].toLowerCase();
				plugin.supported.Win = plugin.supportedstr.includes("windows");
				plugin.supported.Mac = plugin.supportedstr.includes("mac");
				plugin.supported.Lin = plugin.supportedstr.includes("linux");

				// only change if it is in here, unless keep what it was, since it MIGHT have been already set to it
				if (plugin.supportedstr.includes("ios")) plugin.supported.Ios = true;
				if (plugin.supportedstr.includes("android")) plugin.supported.And = true;
			} else plugin.supported = { ...plugin.supported, Win: true, Mac: true, Lin: true };
		}

		if (plugin.urlstr.length > longest.urlstr) longest.urlstr = plugin.urlstr.length;
		if (plugin.description.length > longest.description) longest.description = plugin.description.length;
	}

	let output = `## Plugins Found Here\n\n| ${''.padEnd(longest.urlstr,' ')} | ${''.padEnd(longest.description,' ')} | Win | Mac | Lin | iOS | And |\n| ${''.padEnd(longest.urlstr,'-')} | ${''.padEnd(longest.description,'-')} | --- | --- | --- | --- | --- |\n`;
	for (const plugin of pluginTree) { if (!plugin.skip) output += pluginTemplate(plugin); }
	return output + "\n\n_This repo and all plugins require a Rust version of at least **1.65**_\n";
}

async function run() {
	try {
		let filename = process?.env?.filename ?? 'README.md';
		let folder = process?.env?.folder ?? 'plugins';

		let owner = 'tauri-apps', repo = 'plugins-workspace', branch = 'v2';
		if (github.context.payload?.repository) {
			owner = github.context.payload.repository.owner.login;
			repo = github.context.payload.repository.name;
		}
		if (process?.env?.GITHUB_REPOSITORY) [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
		if (process?.env?.GITHUB_REF_NAME) branch = process?.env?.GITHUB_REF_NAME;
		if (owner == 'Miniontoby' && repo.toLowerCase() == 'tauri-plugin-list-generator-action') {
			owner = 'tauri-apps';
			repo = 'plugins-workspace';
			branch = 'v2';
		}

		const CONTENT = await generateREADME(branch, folder, owner, repo);
		await fs.writeFileSync(filename, CONTENT);
		core.info(`Written new README to ${filename}!`);
	} catch (error) {
		console.error(error);
		await new Promise(res => setTimeout(res, 3000)); // wait 3 seconds so the error can be FULLY consoled
		core.setFailed(error.message);
	}
}

run();