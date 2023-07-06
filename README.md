# Tauri Plugin Workspace README file Generator

This action generates a README for Tauri Plugin Workspace, but it could also generate one for yours:

# How to use for other repo's

This action will also work for other repo's, if they meet these requirements:

- [X] Subprojects are inside a folder
- [X] All subprojects include a README.md
- [X] All README.md's are starting with a banner/image followed by the description (and an optional `- Supported platforms: (platforms here)`) and then `## Install`
Example:
```md
![altname](banner.png)

Automatically launch your application at startup.

- Supported platforms: Windows, Linux, and macOS.

## Install

There are three general methods of installation that we can recommend.

(...)
```

# Using the action

## Inputs

### `filename`

**Required** The path and filename of the output file. Default `README.md`.

### `folder`

**Required** The path of the folder including the plugins. Default `plugins`.

### `github-token`

**Required** Set to `${{ secrets.GITHUB_TOKEN }}`

## Example usage

```yaml
uses: Miniontoby/tauri_plugin_lister_action
with:
  filename: README.md
  folder: plugins
  github-token: ${{ secrets.GITHUB_TOKEN }}
```
