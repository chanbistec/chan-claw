# SharePoint Embedded File Storage Containers — Copilot Studio Context

**Source:** https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview

---

## What are File Storage Containers?

- **API‑only storage entities** for applications (no UI)
- Created within a Microsoft 365 tenant
- Files accessible **only via Microsoft Graph APIs**

---

## Key Properties

| Property | Description |
| --- | --- |
| **Isolation** | Each container is dedicated to one app — isolated and secure per tenant |
| **Capacity** | Can store many files with **multiple terabytes** of content |
| **Permissions** | Each container can have **separate permissions** |
| **Analogy** | API‑only Document Library in SharePoint, with slight differences |

---

## In Copilot Studio

Used for **File Synchronization** via **Copilot Studio Kit**.

### Configuration fields:
- **Site Address** — e.g., `https://organization.sharepoint.com/sites/sitename`
- **Library Name** — e.g., `Documents`
- **Include Nested Items** — Yes/No
- **Limit Entries to Folder** — Optional path filter
- **SharePoint Files Filter Query** — OData filter (e.g., `PublicContent eq 'true'`)
- **Include SharePoint Pages** — Yes/No
- **SharePoint Pages Filter Query** — Optional filter

### Supported file types:
- Word: `.doc`, `.docx`
- PowerPoint: `.ppt`, `.pptx`
- PDF: `.pdf`
- Excel: `.xls`, `.xlsx`

### Size limits:
- **Without M365 Copilot license:** 7 MB max (generative answers)
- **With M365 Copilot license:** 200 MB max (generative answers)
- **Direct upload (file upload method):** 512 MB max

### Important notes:
- Files stored in **Dataverse** after synchronization (consumes storage)
- User credentials verified before access (per‑user permissions)
- Changes to SharePoint files **auto‑synchronize**
- Document libraries are **not supported** in the SharePoint knowledge source

---

## Compliance & Governance

- Containers are targeted via **"All SharePoint Sites"** scope in Microsoft Purview
- Retention policies apply across all containers
- Container URLs available in SharePoint Admin Center for Purview targeting

---

## Use Cases in Copilot Studio

1. **Knowledge grounding** — Sync SharePoint files as agent knowledge
2. **File Synchronization Kit** — Bulk index documents for enterprise agents
3. **Tenant‑wide document management** — Centralized storage per tenant

---

## Quick Links

- Overview: https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview
- Copilot Studio integration: https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-add-sharepoint
- File Synchronization Kit: https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/kit-configure-agents#configure-a-new-agent-for-file-synchronization
