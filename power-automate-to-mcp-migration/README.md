# Migrating Power Automate OneDrive Flows to MCP Tools

> Migrate from Power Automate OneDrive connector actions to direct MCP server tools in Copilot Studio, with `Files.ReadWrite.AppFolder` scoping.

## Architecture: Before & After

### Before (Power Automate)
```
Copilot Studio Agent → Power Automate Flow → OneDrive Connector
                                                    ↓
                                            /drive/root:/YourFolder/...
                                            (Files.ReadWrite — broad access)
```

### After (MCP Direct)
```
Copilot Studio Agent → MCP Server (.NET, App Service)
                              ↓ (OBO + Files.ReadWrite.AppFolder)
                        Graph API → /drive/special/approot/...
                        (sandboxed to /Apps/{AppName}/ only)
```

---

## Step 1: Update Entra ID App Registration

### Remove Broad Permissions
1. Go to **Entra ID → App Registrations → Your App → API Permissions**
2. Remove `Files.ReadWrite` (or `Files.ReadWrite.All`)
3. Add **`Files.ReadWrite.AppFolder`** (Delegated)
4. If admin consent was previously granted, an admin may need to re-grant or users will consent individually

### Update OAuth Scope
In your App Service configuration (or wherever you configure the OBO token request), change the downstream scope:

```csharp
// Before
string[] scopes = new[] { "https://graph.microsoft.com/Files.ReadWrite" };

// After
string[] scopes = new[] { "https://graph.microsoft.com/Files.ReadWrite.AppFolder" };
```

---

## Step 2: Map Power Automate Actions to MCP Tools

| Power Automate Action | Path Used | MCP Tool | New Path |
|---|---|---|---|
| Create folder (root) | `/drive/root/children` | `create_folder` | `/drive/special/approot/children` |
| Create nested folder | `/drive/root:/{path}:/children` | `create_folder` | `/drive/special/approot:/{path}:/children` |
| Create file | `/drive/root:/{path}/{file}:/content` | `upload_file` | `/drive/special/approot:/{path}/{file}:/content` |
| Get file content | `/drive/root:/{path}/{file}:/content` | `read_file` | `/drive/special/approot:/{path}/{file}:/content` |
| List files | `/drive/root:/{path}:/children` | `list_files` | `/drive/special/approot:/{path}:/children` |

**Key change:** Every `/drive/root` becomes `/drive/special/approot`.

The physical location in OneDrive changes from:
```
OneDrive/
├── YourFolder/          ← before (root level)
│   ├── SubFolder/
│   └── report.docx
```
to:
```
OneDrive/
├── Apps/
│   └── {YourAppName}/   ← after (sandboxed)
│       ├── SubFolder/
│       └── report.docx
```

---

## Step 3: Implement MCP Tools

### Dependencies

```xml
<PackageReference Include="Microsoft.Graph" Version="5.*" />
<PackageReference Include="Microsoft.Identity.Web" Version="3.*" />
```

### Graph Client Setup with OBO

```csharp
// GraphClientFactory.cs
using Microsoft.Graph;
using Microsoft.Identity.Web;

public class GraphClientFactory
{
    private readonly ITokenAcquisition _tokenAcquisition;

    public GraphClientFactory(ITokenAcquisition tokenAcquisition)
    {
        _tokenAcquisition = tokenAcquisition;
    }

    public GraphServiceClient CreateForUser()
    {
        var scopes = new[] { "https://graph.microsoft.com/Files.ReadWrite.AppFolder" };

        var authProvider = new BaseBearerTokenAuthenticationProvider(
            new TokenAcquisitionTokenProvider(_tokenAcquisition, scopes));

        return new GraphServiceClient(authProvider);
    }
}
```

### MCP Tool Implementations

> **⚠️ Context Optimization:** All tool responses return lightweight metadata (name, size, path, URL) instead of raw file content. This prevents large files from bloating the LLM context window — the same advantage Power Automate AI Flows had, without the orchestration overhead. File bytes travel directly between Copilot Studio's runtime and the MCP server, bypassing the model.

```csharp
// OneDriveTools.cs
using Microsoft.Graph;
using Microsoft.Graph.Models;

public class OneDriveTools
{
    private readonly GraphClientFactory _graphFactory;

    public OneDriveTools(GraphClientFactory graphFactory)
    {
        _graphFactory = graphFactory;
    }

    // ──────────────────────────────────────────────
    //  Response DTOs — keep LLM context lightweight
    // ──────────────────────────────────────────────

    public class FolderResult
    {
        public string Name { get; set; } = "";
        public string Path { get; set; } = "";
        public string Id { get; set; } = "";
        public string WebUrl { get; set; } = "";
    }

    public class FileResult
    {
        public string Name { get; set; } = "";
        public string Path { get; set; } = "";
        public string Id { get; set; } = "";
        public long Size { get; set; }
        public string? MimeType { get; set; }
        public string WebUrl { get; set; } = "";
        public string? DownloadUrl { get; set; }
    }

    public class FileListItem
    {
        public string Name { get; set; } = "";
        public string Path { get; set; } = "";
        public bool IsFolder { get; set; }
        public long Size { get; set; }
        public string? LastModified { get; set; }
        public string? MimeType { get; set; }
    }

    public class UploadResult
    {
        public string Name { get; set; } = "";
        public string Path { get; set; } = "";
        public string Id { get; set; } = "";
        public long Size { get; set; }
        public string WebUrl { get; set; } = "";
        public string Message { get; set; } = "";
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    private static FolderResult ToFolderResult(DriveItem item, string path) => new()
    {
        Name = item.Name ?? "",
        Path = path,
        Id = item.Id ?? "",
        WebUrl = item.WebUrl ?? ""
    };

    private static UploadResult ToUploadResult(DriveItem item, string path) => new()
    {
        Name = item.Name ?? "",
        Path = path,
        Id = item.Id ?? "",
        Size = item.Size ?? 0,
        WebUrl = item.WebUrl ?? "",
        Message = $"Uploaded {item.Name} ({item.Size ?? 0} bytes)"
    };

    // ──────────────────────────────────────────────
    //  Tools
    // ──────────────────────────────────────────────

    /// <summary>
    /// Creates a folder under the app root or at a specified relative path.
    /// Replaces: Power Automate "Create folder" action
    /// </summary>
    [McpTool("create_folder", Description = "Create a folder in OneDrive. Returns folder metadata (no content in context).")]
    public async Task<FolderResult> CreateFolder(
        [McpParameter(Description = "Folder name to create")] string folderName,
        [McpParameter(Description = "Parent path relative to app root (optional, e.g. 'Projects/2026')")] string? parentPath = null)
    {
        var graph = _graphFactory.CreateForUser();

        var driveItem = new DriveItem
        {
            Name = folderName,
            Folder = new Folder(),
            AdditionalData = new Dictionary<string, object>
            {
                { "@microsoft.graph.conflictBehavior", "rename" }
            }
        };

        DriveItem result;
        if (string.IsNullOrEmpty(parentPath))
        {
            result = await graph.Me.Drive.Special["approot"].Children
                .PostAsync(driveItem);
        }
        else
        {
            result = await graph.Me.Drive.Special["approot"]
                .ItemWithPath(parentPath).Children
                .PostAsync(driveItem);
        }

        var fullPath = string.IsNullOrEmpty(parentPath)
            ? folderName : $"{parentPath}/{folderName}";

        return ToFolderResult(result, fullPath);
    }

    /// <summary>
    /// Creates nested folder structure recursively.
    /// Replaces: Multiple chained "Create folder" actions in Power Automate
    /// </summary>
    [McpTool("create_folder_tree", Description = "Create a nested folder structure (e.g. 'Projects/2026/Q1/Reports'). Returns final folder metadata.")]
    public async Task<FolderResult> CreateFolderTree(
        [McpParameter(Description = "Full path to create, e.g. 'Projects/2026/Q1'")] string path)
    {
        var graph = _graphFactory.CreateForUser();
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        DriveItem? current = null;
        var currentPath = "";

        foreach (var segment in segments)
        {
            var parent = string.IsNullOrEmpty(currentPath)
                ? graph.Me.Drive.Special["approot"]
                : graph.Me.Drive.Special["approot"].ItemWithPath(currentPath);

            var driveItem = new DriveItem
            {
                Name = segment,
                Folder = new Folder(),
                AdditionalData = new Dictionary<string, object>
                {
                    { "@microsoft.graph.conflictBehavior", "fail" }
                }
            };

            try
            {
                current = await parent.Children.PostAsync(driveItem);
            }
            catch (ServiceException ex) when (ex.ResponseStatusCode == 409)
            {
                current = await graph.Me.Drive.Special["approot"]
                    .ItemWithPath(string.IsNullOrEmpty(currentPath) ? segment : $"{currentPath}/{segment}")
                    .GetAsync();
            }

            currentPath = string.IsNullOrEmpty(currentPath) ? segment : $"{currentPath}/{segment}";
        }

        return ToFolderResult(current!, path);
    }

    /// <summary>
    /// Upload/create a file at a specified path.
    /// Replaces: Power Automate "Create file" action.
    /// Returns metadata only — file bytes never enter LLM context.
    /// </summary>
    [McpTool("upload_file", Description = "Create or overwrite a file in OneDrive. File content is handled at transport level — only metadata is returned to the model.")]
    public async Task<UploadResult> UploadFile(
        [McpParameter(Description = "File path relative to app root (e.g. 'Reports/Q1/summary.docx')")] string filePath,
        [McpParameter(Description = "File content as base64 encoded string")] string contentBase64)
    {
        var graph = _graphFactory.CreateForUser();
        var content = Convert.FromBase64String(contentBase64);

        using var stream = new MemoryStream(content);
        DriveItem result;

        if (content.Length <= 4 * 1024 * 1024)
        {
            result = await graph.Me.Drive.Special["approot"]
                .ItemWithPath(filePath).Content
                .PutAsync(stream);
        }
        else
        {
            var uploadSession = await graph.Me.Drive.Special["approot"]
                .ItemWithPath(filePath)
                .CreateUploadSession
                .PostAsync(new Microsoft.Graph.Drives.Item.Items.Item
                    .CreateUploadSession.CreateUploadSessionPostRequestBody());

            const int chunkSize = 3_407_872; // 3.25 MB
            var fileUploadTask = new LargeFileUploadTask<DriveItem>(
                uploadSession, stream, chunkSize);
            var uploadResult = await fileUploadTask.UploadAsync();
            result = uploadResult.ItemResponse;
        }

        return ToUploadResult(result, filePath);
    }

    /// <summary>
    /// Get file metadata and a time-limited download URL.
    /// Replaces: Power Automate "Get file content" action.
    /// 
    /// ⚠️ CONTEXT OPTIMIZATION: Returns a download URL instead of file content.
    /// The LLM sees only metadata (~200 bytes) regardless of file size.
    /// The caller (Copilot Studio runtime or user) can fetch the actual
    /// content via the download URL without it passing through the model.
    /// </summary>
    [McpTool("read_file", Description = "Get file metadata and a temporary download URL. Does NOT return file content — keeps model context small.")]
    public async Task<FileResult> ReadFile(
        [McpParameter(Description = "File path relative to app root (e.g. 'Reports/Q1/summary.docx')")] string filePath)
    {
        var graph = _graphFactory.CreateForUser();

        var item = await graph.Me.Drive.Special["approot"]
            .ItemWithPath(filePath)
            .GetAsync(config =>
            {
                config.QueryParameters.Select = new[]
                {
                    "id", "name", "size", "file", "webUrl",
                    "@microsoft.graph.downloadUrl"
                };
            });

        return new FileResult
        {
            Name = item!.Name ?? "",
            Path = filePath,
            Id = item.Id ?? "",
            Size = item.Size ?? 0,
            MimeType = item.File?.MimeType,
            WebUrl = item.WebUrl ?? "",
            DownloadUrl = item.AdditionalData
                .TryGetValue("@microsoft.graph.downloadUrl", out var url)
                ? url?.ToString() : null
        };
    }

    /// <summary>
    /// Read file content as text — USE ONLY for small text files (<50KB)
    /// that the agent needs to reason about (e.g. CSV, JSON config).
    /// For anything else, prefer read_file which returns a download URL.
    /// </summary>
    [McpTool("read_file_content", Description = "Read small text file content directly (<50KB only). Use read_file for large/binary files.")]
    public async Task<string> ReadFileContent(
        [McpParameter(Description = "File path relative to app root")] string filePath)
    {
        var graph = _graphFactory.CreateForUser();

        // Pre-check file size to prevent context blowup
        var meta = await graph.Me.Drive.Special["approot"]
            .ItemWithPath(filePath)
            .GetAsync(c => c.QueryParameters.Select = new[] { "size", "file" });

        if (meta!.Size > 50 * 1024)
            return $"⚠️ File too large ({meta.Size} bytes). Use read_file to get a download URL instead.";

        var stream = await graph.Me.Drive.Special["approot"]
            .ItemWithPath(filePath).Content
            .GetAsync();

        using var reader = new StreamReader(stream!);
        return await reader.ReadToEndAsync();
    }

    /// <summary>
    /// List files and folders at a path.
    /// Replaces: Power Automate "List files in folder" action
    /// </summary>
    [McpTool("list_files", Description = "List files and folders at a given path. Returns metadata only.")]
    public async Task<List<FileListItem>> ListFiles(
        [McpParameter(Description = "Folder path relative to app root (empty for root)")] string? folderPath = null)
    {
        var graph = _graphFactory.CreateForUser();

        var request = string.IsNullOrEmpty(folderPath)
            ? graph.Me.Drive.Special["approot"].Children
            : graph.Me.Drive.Special["approot"].ItemWithPath(folderPath).Children;

        var items = await request.GetAsync();

        return items!.Value!.Select(i => new FileListItem
        {
            Name = i.Name ?? "",
            Path = folderPath is null ? i.Name! : $"{folderPath}/{i.Name}",
            IsFolder = i.Folder != null,
            Size = i.Size ?? 0,
            LastModified = i.LastModifiedDateTime?.ToString("o"),
            MimeType = i.File?.MimeType
        }).ToList();
    }

    /// <summary>
    /// Delete a file or folder.
    /// Replaces: Power Automate "Delete file" action
    /// </summary>
    [McpTool("delete_item", Description = "Delete a file or folder from OneDrive. Returns confirmation message.")]
    public async Task<string> DeleteItem(
        [McpParameter(Description = "Path to delete relative to app root")] string path)
    {
        var graph = _graphFactory.CreateForUser();

        await graph.Me.Drive.Special["approot"]
            .ItemWithPath(path)
            .DeleteAsync();

        return $"Deleted: {path}";
    }
}
```

---

## Step 4: Data Migration

Existing files at `/drive/root/YourFolder/` need to move to `/Apps/{AppName}/`.

### Option A: One-Time Migration Script

```csharp
// MigrationService.cs
public class MigrationService
{
    public async Task MigrateUserData(GraphServiceClient graph, string sourceFolder)
    {
        // List all items in old location
        var items = await graph.Me.Drive.Root
            .ItemWithPath(sourceFolder).Children
            .GetAsync();

        foreach (var item in items!.Value!)
        {
            if (item.Folder != null)
            {
                // Recreate folder structure in app root
                await graph.Me.Drive.Special["approot"].Children
                    .PostAsync(new DriveItem
                    {
                        Name = item.Name,
                        Folder = new Folder()
                    });

                // Recurse for nested content
                await MigrateUserData(graph, $"{sourceFolder}/{item.Name}");
            }
            else
            {
                // Move file to app folder (same drive, so use move)
                var appRoot = await graph.Me.Drive.Special["approot"].GetAsync();

                await graph.Me.Drive.Items[item.Id]
                    .PatchAsync(new DriveItem
                    {
                        ParentReference = new ItemReference
                        {
                            Id = appRoot!.Id
                        }
                    });
            }
        }
    }
}
```

### Option B: Let Users Access Both During Transition

Keep the old Power Automate flows running alongside MCP tools temporarily. Set a cutover date, migrate data, then disable the flows.

---

## Step 5: Update Copilot Studio

1. **Remove** the Power Automate flow actions from your agent topics
2. Your MCP tools should already be visible if the server is connected
3. **Update topic triggers/prompts** to reference the new tools:

### Before (Power Automate plugin)
```
Topic: Create Project Folder
  → Action: Call Power Automate flow "Create OneDrive Folder"
  → Input: FolderName = {user.input}
```

### After (MCP tool)
```
Topic: Create Project Folder
  → Action: Call MCP tool "create_folder_tree"
  → Input: path = {user.input}
```

Or if using **orchestrator/generative mode**, just update the agent instructions:

```
You have access to OneDrive tools for file management:
- create_folder: Create a single folder
- create_folder_tree: Create nested folder paths
- upload_file: Create or overwrite a file
- read_file: Read file contents
- list_files: List contents of a folder
- delete_item: Delete a file or folder

All paths are relative to the app's dedicated folder. Do not include 
/Apps/{AppName}/ in paths — just use relative paths like "Projects/2026/Q1".
```

---

## Step 6: Update OAuth Connection in Copilot Studio

1. Go to **Copilot Studio → Settings → Authentication**
2. Edit the existing OAuth connection
3. Change the **Scope** field:

```
# Before
https://graph.microsoft.com/Files.ReadWrite

# After
https://graph.microsoft.com/Files.ReadWrite.AppFolder
```

4. Save — users will re-consent on next interaction

---

## Step 7: Disable Power Automate Flows

Once verified:

1. **Turn off** each migrated Power Automate flow (don't delete yet)
2. Monitor MCP tool usage for 1-2 weeks
3. **Delete** the old flows after confidence period

---

## Testing Checklist

- [ ] App registration has only `Files.ReadWrite.AppFolder` — no broader file permissions
- [ ] OBO token exchange works with new scope
- [ ] `create_folder` creates at `/Apps/{AppName}/`
- [ ] `create_folder_tree` creates nested structure correctly
- [ ] `upload_file` handles both small (<4MB) and large files
- [ ] `read_file` returns correct content (text and binary)
- [ ] `list_files` returns items at root and nested paths
- [ ] `delete_item` works for both files and folders
- [ ] Copilot Studio agent can invoke all tools successfully
- [ ] Calling `/me/drive/root` returns 403 (confirms sandboxing)
- [ ] Existing data migrated to app folder
- [ ] Power Automate flows disabled

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| 403 on `/special/approot` | Missing `Files.ReadWrite.AppFolder` permission | Re-add permission, have user re-consent |
| 404 on first call to approot | App folder not yet created | Make any write call first — folder is auto-provisioned |
| OBO token fails | Scope mismatch between Copilot Studio OAuth config and app registration | Ensure both use `Files.ReadWrite.AppFolder` |
| Old paths still work | Broader permission not yet removed | Remove `Files.ReadWrite` / `Files.ReadWrite.All` from app registration |
| Large file upload fails | Upload session timeout | Increase chunk size or add retry logic |

---

## Context Optimization Strategy

The #1 reason to prefer MCP tools over Power Automate AI Flows was **context bloat** — large file content entering the LLM context window. This guide's tool design prevents that by default.

### How File Data Flows

```
┌─────────────────────────────────────────────────────────────┐
│  What the LLM sees (context window)                         │
│                                                             │
│  Tool call:   upload_file("Reports/Q1.xlsx", <base64>)     │
│  Tool result: { name: "Q1.xlsx", size: 245000,             │
│                 path: "Reports/Q1.xlsx", webUrl: "..." }   │
│                                                             │
│  ← ~200 bytes in context regardless of file size            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  What travels at transport level (NOT in context)           │
│                                                             │
│  Copilot Studio runtime ──base64──→ MCP Server ──→ Graph   │
│  245KB file bytes never touch the model                     │
└─────────────────────────────────────────────────────────────┘
```

### Tool Design Rules

| Rule | Implementation |
|---|---|
| **Never return file content by default** | `read_file` returns metadata + download URL |
| **Offer content only for small text files** | `read_file_content` has a 50KB hard cap |
| **Return confirmation, not echo** | `upload_file` returns `{ name, size, path }` not the uploaded content |
| **Keep list responses lean** | `list_files` returns `{ name, path, isFolder, size }` — no content previews |

### When the Agent Needs File Content

For cases where the agent must reason about file content (e.g., parsing a small CSV or JSON config):

1. Agent calls `read_file` → gets metadata + size
2. If small enough, agent calls `read_file_content` → gets text (capped at 50KB)
3. If too large, agent returns the download URL to the user or summarizes what it knows from metadata

This two-step pattern keeps large files out of context while still allowing the agent to work with small text files when needed.
