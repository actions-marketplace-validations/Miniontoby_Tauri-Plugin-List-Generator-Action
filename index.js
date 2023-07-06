const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function generateREADME(branch='v2', folder='plugins', owner='tauri-apps', repo='plugins-workspace') {
	if (folder.endsWith("/")) folder = folder.slice(0,-1);
	const folderslash = folder + '/';

	let longest = { urlstr: 0, description: 0 };

	const pluginTemplate = (p) => `| ${p.urlstr.padEnd(longest.urlstr," ")} | ${p.description.padEnd(longest.description, " ")} | ${(p.supported?.Win===!0)?'✅':'?'}  | ${(p.supported?.Mac===!0)?'✅':'?'}  | ${(p.supported?.Lin===!0)?'✅':'?'}  | ${(p.supported?.iOS===!0)?'✅':'?'}   | ${(p.supported?.And===!0)?'✅':'?'}   |\n`;

	const octokit = github.getOctokit(process?.env?.github_token)
	const json = await octokit.rest.git.getTree({ owner, repo, tree_sha: branch, recursive: true });
	// const json = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`).then(r=>r.json());

	console.log(json, json?.data?.tree[0]);
	//					      'plugins/'			'plugins/test/abc.txt' -> 'test/abc.txt'		   'plugins/test/README.md'	    'plugins/test/ios'        'plugins/test/android'
	const pluginTree = json.data?.tree?.filter(t=>t.path.startsWith(folderslash) && t.path.replace(folderslash, '').split('/').length == 2 && (t.path.endsWith("README.md") || t.path.endsWith("ios") || t.path.endsWith("android"))) ?? [];
	if (!json.data?.tree || pluginTree.length == 0) throw new Error('Json is NOT how it should be!', pluginTree);

	for (const plugin of pluginTree) {
		console.log(plugin);
		plugin.foldername = plugin.path.replace(folderslash, '').split("/")[0]; // ${folder}/myplugin/README.md

		if (plugin.path.endsWith("ios") || plugin.path.endsWith("android")) {
			const pl = pluginTree.find((p)=>p.foldername==plugin.foldername);
			if (pl && plugin.path.endsWith("ios")) pl.supported.iOS = true;
			if (pl && plugin.path.endsWith("android")) pl.supported.And = true;
			plugin.skip = true;
			continue;
		}

		plugin.urlstr = `[${plugin.foldername}](${folder}/${plugin.foldername})`;
		plugin.description = '';
		plugin.supported = { Win: null, Mac: null, Lin: null, iOS: null, And: null };
		plugin.content = await fetch(plugin.url).then(r=>r.json()).then(d=>atob(d.content));

		const regex = /\[([^\]]+)\]\(([^\)]+)\)\n\n(.*)\n\n## Install/s;
		let m;
		if ((m = regex.exec(plugin.content)) !== null) {
			plugin.description = m[3].replaceAll("\n", " ").replace(/>.*/s, "");
			if ((m = /(.*)(\n\n- Supported platforms: (.*))/s.exec(m[3]))) {
				plugin.description = m[1];
				plugin.supportedstr = m[3]; // Windows, Linux, FreeBSD, NetBSD, OpenBSD, and macOS.
				plugin.supported.Win = plugin.supportedstr.includes("Windows");
				plugin.supported.Mac = plugin.supportedstr.includes("macOS");
				plugin.supported.Lin = plugin.supportedstr.includes("Linux");
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

		let owner = 'tauri-apps', repo = 'plugins-workspace';
		if (github.context.payload?.repository) {
			owner = github.context.payload.repository.owner.login;
			repo = github.context.payload.repository.name;
		}
		if (process?.env?.GITHUB_REPOSITORY) [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

		const CONTENT = await generateREADME(process?.env?.GITHUB_REF_NAME ?? 'v2', folder, owner, repo);
		await fs.writeFileSync(filename, CONTENT);
	} catch (error) {
		console.error(error);
		core.setFailed(error.message);
	}
}

run();