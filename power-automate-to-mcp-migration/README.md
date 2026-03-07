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

    /// <summary>
    /// Creates a folder under the app root or at a specified relative path.
    /// Replaces: Power Automate "Create folder" action
    /// </summary>
    [McpTool("create_folder", Description = "Create a folder in OneDrive. Supports nested paths.")]
    public async Task<DriveItem> CreateFolder(
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
                // Rename if conflict rather than fail
                { "@microsoft.graph.conflictBehavior", "rename" }
            }
        };

        if (string.IsNullOrEmpty(parentPath))
        {
            // Create at app root: /Apps/{AppName}/{folderName}
            return await graph.Me.Drive.Special["approot"].Children
                .PostAsync(driveItem);
        }
        else
        {
            // Create nested: /Apps/{AppName}/{parentPath}/{folderName}
            return await graph.Me.Drive.Special["approot"]
                .ItemWithPath(parentPath).Children
                .PostAsync(driveItem);
        }
    }

    /// <summary>
    /// Creates nested folder structure recursively.
    /// Replaces: Multiple chained "Create folder" actions in Power Automate
    /// </summary>
    [McpTool("create_folder_tree", Description = "Create a nested folder structure (e.g. 'Projects/2026/Q1/Reports')")]
    public async Task<DriveItem> CreateFolderTree(
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
                // Folder already exists — continue
                current = await graph.Me.Drive.Special["approot"]
                    .ItemWithPath(string.IsNullOrEmpty(currentPath) ? segment : $"{currentPath}/{segment}")
                    .GetAsync();
            }

            currentPath = string.IsNullOrEmpty(currentPath) ? segment : $"{currentPath}/{segment}";
        }

        return current!;
    }

    /// <summary>
    /// Upload/create a file at a specified path.
    /// Replaces: Power Automate "Create file" action
    /// </summary>
    [McpTool("upload_file", Description = "Create or overwrite a file in OneDrive")]
    public async Task<DriveItem> UploadFile(
        [McpParameter(Description = "File path relative to app root (e.g. 'Reports/Q1/summary.docx')")] string filePath,
        [McpParameter(Description = "File content as base64 encoded string")] string contentBase64)
    {
        var graph = _graphFactory.CreateForUser();
        var content = Convert.FromBase64String(contentBase64);

        using var stream = new MemoryStream(content);

        // For files <= 4MB, use simple upload
        if (content.Length <= 4 * 1024 * 1024)
        {
            return await graph.Me.Drive.Special["approot"]
                .ItemWithPath(filePath).Content
                .PutAsync(stream);
        }

        // For larger files, use upload session
        var uploadSession = await graph.Me.Drive.Special["approot"]
            .ItemWithPath(filePath)
            .CreateUploadSession
            .PostAsync(new Microsoft.Graph.Drives.Item.Items.Item.CreateUploadSession.CreateUploadSessionPostRequestBody());

        // 3.25 MB chunks
        const int chunkSize = 3_407_872;
        var fileUploadTask = new LargeFileUploadTask<DriveItem>(uploadSession, stream, chunkSize);
        var result = await fileUploadTask.UploadAsync();
        return result.ItemResponse;
    }

    /// <summary>
    /// Read file content.
    /// Replaces: Power Automate "Get file content" action
    /// </summary>
    [McpTool("read_file", Description = "Read a file's content from OneDrive")]
    public async Task<string> ReadFile(
        [McpParameter(Description = "File path relative to app root (e.g. 'Reports/Q1/summary.docx')")] string filePath,
        [McpParameter(Description = "Return as base64 (true) or UTF-8 text (false)")] bool asBase64 = false)
    {
        var graph = _graphFactory.CreateForUser();

        var stream = await graph.Me.Drive.Special["approot"]
            .ItemWithPath(filePath).Content
            .GetAsync();

        using var ms = new MemoryStream();
        await stream!.CopyToAsync(ms);
        var bytes = ms.ToArray();

        return asBase64
            ? Convert.ToBase64String(bytes)
            : System.Text.Encoding.UTF8.GetString(bytes);
    }

    /// <summary>
    /// List files and folders at a path.
    /// Replaces: Power Automate "List files in folder" action
    /// </summary>
    [McpTool("list_files", Description = "List files and folders at a given path")]
    public async Task<List<FileInfo>> ListFiles(
        [McpParameter(Description = "Folder path relative to app root (empty for root)")] string? folderPath = null)
    {
        var graph = _graphFactory.CreateForUser();

        var request = string.IsNullOrEmpty(folderPath)
            ? graph.Me.Drive.Special["approot"].Children
            : graph.Me.Drive.Special["approot"].ItemWithPath(folderPath).Children;

        var items = await request.GetAsync();

        return items!.Value!.Select(i => new FileInfo
        {
            Name = i.Name,
            Path = folderPath is null ? i.Name : $"{folderPath}/{i.Name}",
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
    [McpTool("delete_item", Description = "Delete a file or folder from OneDrive")]
    public async Task DeleteItem(
        [McpParameter(Description = "Path to delete relative to app root")] string path)
    {
        var graph = _graphFactory.CreateForUser();

        await graph.Me.Drive.Special["approot"]
            .ItemWithPath(path)
            .DeleteAsync();
    }
}

public class FileInfo
{
    public string Name { get; set; } = "";
    public string Path { get; set; } = "";
    public bool IsFolder { get; set; }
    public long Size { get; set; }
    public string? LastModified { get; set; }
    public string? MimeType { get; set; }
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
