# Step 9: Knowledge Source Restrictions

## Overview

Control what data sources Copilot Studio agents can use for generative answers.

## Available Knowledge Sources

| Source | Risk Level | Recommendation |
|--------|------------|----------------|
| **SharePoint sites** | Low | Allow (internal only) |
| **Public websites** | High | Block or review |
| **Uploaded files** | Medium | Allow with review |
| **Dataverse** | Low | Allow (structured) |
| **Microsoft Graph** | Medium | Allow with limits |

## Configure Knowledge Source Policies

### Via Power Platform Admin Center

```
1. Go to Power Platform admin center
2. Settings → Product features
3. Find "Knowledge sources"
4. Configure:
   - Allow SharePoint: Yes/No
   - Allow public websites: Yes/No
   - Allow file uploads: Yes/No
   - Allow Dataverse: Yes/No
5. Click Save
```

### Via PowerShell

```powershell
# Restrict knowledge sources
Set-TenantCopilotFeature `
  -AllowSharePointOnline $true `
  -AllowPublicWebsites $false `
  -AllowFileUpload $true `
  -AllowDataverse $true

# Block specific sites
Set-PowerAppDataPolicy `
  -PolicyId "POLICY-ID" `
  -BlockedSharePointSites @(
    "https://sites.contoso.com/hr-sensitive",
    "https://sites.contoso.com/finance"
  )
```

## Site-Level Control

### Allowed Sites List

```powershell
# Define approved SharePoint sites
$approvedSites = @(
  "https://sites.company.com/policies",
  "https://sites.company.com/faq",
  "https://sites.company.com/procedures"
)

# Apply to environment
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -AllowedSharePointSites $approvedSites
```

### Public Website Restrictions

```powershell
# Allow only specific domains
$allowedDomains = @(
  "learn.microsoft.com",
  "support.microsoft.com"
)

Set-TenantCopilotFeature `
  -AllowedPublicWebsites $allowedDomains
```

## Content Classification

### Tag Sensitive Content

| Classification | Label | Access |
|----------------|-------|--------|
| **Public** | No label | All users |
| **Internal** | "Internal" | Authenticated users |
| **Confidential** | "Confidential" | Restricted groups |
| **Highly Confidential** | "Restricted" | Named individuals |

### Apply Sensitivity Labels

```powershell
# Enable sensitivity labels
Set-PowerAppSensitivityLabel `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -Enabled $true `
  -DefaultLabel "Internal"
```

## Review Process

### Monthly Knowledge Source Audit

```powershell
# List all knowledge sources in environment
Get-CopilotStudioKnowledgeSource `
  -EnvironmentName "PROD-ENVIRONMENT" |
  Select-Object Name, Type, SiteUrl, LastUpdated

# Report on unused sources
Get-CopilotStudioKnowledgeSource `
  -EnvironmentName "PROD-ENVIRONMENT" |
  Where-Object LastAccess -lt (Get-Date).AddDays(-30)
```

## Best Practices

| Do | Don't |
|----|-------|
| Use internal SharePoint only | Allow public websites |
| Tag sensitive documents | Mix confidential/public |
| Regular review of sources | Orphaned knowledge bases |
| Approve new sites via process | User-provisioned sites |

## Next Steps

Proceed to [Step 10: Vendor/Third-Party Access](10-vendor-access.md)
