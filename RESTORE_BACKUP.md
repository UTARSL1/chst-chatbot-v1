# How to Restore Backup (V1.9)

You have successfully backed up the codebase to the folder: `V1.9_before_MCP_integration`.

To restore this version and revert the MCP integration changes, run the following command in your terminal. 

**Warning:** This will overwrite your current files with the backup versions.

### Restore Command (Windows)

```powershell
robocopy V1.9_before_MCP_integration . /E /XD V1.9_before_MCP_integration node_modules .next .git .swc utar-staff-mcp
```

### Explanation of flags:
- `/E`: Copy subdirectories, including empty ones.
- `/XD ...`: Exclude specific directories from being copied back (prevents recursion or overwriting build artifacts).
  - We exclude `utar-staff-mcp` so we don't accidentally copy old state over it (though the backup likely excludes it too).
  - We exclude `.git` to preserve version control history.

### What about the `utar-staff-mcp` folder?
The restore command above does **not** delete the `utar-staff-mcp` folder. If you want to completely remove the MCP integration, you can manually delete that folder after restoring:
```powershell
rmdir /s /q utar-staff-mcp
```
