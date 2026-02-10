# OneDrive File Upload — Delegated Permissions Endpoints

**Source:** https://learn.microsoft.com/en-us/graph/api/driveitem-put-content  
**Source:** https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession

---

## Quick Reference

| Operation | HTTP Method | Endpoint |
|-----------|-------------|----------|
| Upload small file (<4 MB) | `PUT` | `/me/drive/items/{parent-id}:/{filename}:/content` |
| Create upload session | `POST` | `/me/drive/items/{parent-id}:/{filename}:/createUploadSession` |
| Upload fragment | `PUT` | `{uploadUrl}` (from session response) |
| List files | `GET` | `/me/drive/root/children` |

---

## 1) Simple Upload (Files < 4 MB)

```http
PUT /me/drive/items/{parent-id}:/{filename}:/content
Authorization: Bearer {token}
Content-Type: text/plain

<binary file content>
```

**Example:**
```http
PUT /me/drive/root:/report.pdf:/content
Authorization: Bearer eyJ0eXAiOiJKV1Q...
Content-Type: application/pdf

<binary content of report.pdf>
```

---

## 2) Large File Upload (Resumable)

### Step 1: Create Upload Session

```http
POST /me/drive/items/{parent-id}:/{filename}:/createUploadSession
Authorization: Bearer {token}
Content-Type: application/json

{
  "item": {
    "@microsoft.graph.conflictBehavior": "rename"
  }
}
```

**Response:**
```json
{
  "uploadUrl": "https://sn3302.up.1drv.com/up/fe6987415ace7X4e1eF866337",
  "expirationDateTime": "2025-01-29T09:21:55.523Z"
}
```

### Step 2: Upload Fragments

```http
PUT {uploadUrl}
Content-Length: {size}
Content-Range: bytes {start}-{end}/{total}

<bytes {start}-{end} of file>
```

**Example (first 26 bytes of 128-byte file):**
```http
PUT https://sn3302.up.1drv.com/up/fe6987415ace7X4e1eF866337
Content-Length: 26
Content-Range: bytes 0-25/128

<first 26 bytes>
```

**Rules:**
- Max fragment size: **60 MiB**
- Fragment size must be a **multiple of 320 KiB** (327,680 bytes)
- Fragments must be uploaded **sequentially**
- Each fragment extends the expiration time

### Step 3: Complete Upload

If `deferCommit` was `false` (default), upload completes automatically when final byte range is sent.

If `deferCommit` was `true`, send:
```http
POST {uploadUrl}
Content-Length: 0
```

---

## Shortcuts

| Path | Meaning |
|------|---------|
| `/me/drive/root` | OneDrive root folder |
| `/me/drive/root:/FolderName:/children` | Items in a specific folder |
| `/me/drive/items/{item-id}` | Specific item by ID |

---

## Required Permissions (Delegated)

| Scope | Description |
|-------|-------------|
| `Files.Read` | Read user's files |
| `Files.ReadWrite` | Read and write user's files |
| `Files.ReadWrite.All` | Read and write all user files |

---

## Common Patterns

### Upload to Root
```http
PUT /me/drive/root:/filename.txt:/content
```

### Upload to Specific Folder
```http
PUT /me/drive/items/{folder-id}:/filename.txt:/content
```

### Upload with Conflict Behavior
```json
{
  "item": {
    "@microsoft.graph.conflictBehavior": "rename"  // or "fail", "replace"
  }
}
```

---

## Error Handling

| Status | Meaning |
|--------|---------|
| `200 OK` / `201 Created` | Success |
| `401 Unauthorized` | Invalid token |
| `403 Forbidden` | Insufficient permissions |
| `416 Range Not Satisfiable` | Invalid byte range |
| `507 Insufficient Storage` | Exceeds quota |

---

## Notes

- Always use **HTTPS**
- Include `Authorization` header only in the initial `POST` to create session (not in PUT to uploadUrl)
- Use `Content-Range` header with format: `bytes start-end/total`
- For large files, implement retry logic on network failures
