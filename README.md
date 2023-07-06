# Tauri Plugin README Generator

This action generates a README for Tauri Plugin Workspace

## Inputs

### `filename`

**Required** The path and filename of the output file. Default `README.md`.

### `folder`

**Required** The path of the folder including the plugins. Default `plugins`.

## Example usage

```yaml
uses: Miniontoby/tauri_plugin_lister_action
with:
  filename: README.md
  folder: plugins
```
