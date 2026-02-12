# Step 2: Tenant-Level Governance

## Overview

Configure organization-wide settings that control Copilot Studio behavior for all users.

## Access Publishing Controls

### Disable Publishing (If Not Ready)

```powershell
# Disable publishing at tenant level
Set-TenantSetting `
  -CopilotStudioPublishing $false

# Enable when ready
Set-TenantSetting `
  -CopilotStudioPublishing $true
```

### Publishing Approval Workflow

Configure requires approval before publishing:

```
1. Go to Power Platform admin center
2. Settings → Product features
3. Find "Publishing approval workflow"
4. Enable required approval
5. Configure approvers
```

## Generative AI Controls

### Enable/Disable Generative AI Features

```powershell
# Disable generative AI entirely
Set-TenantCopilotFeature `
  -AllowGenerativeAnswers $false `
  -AllowGenerativeActions $false

# Enable with restrictions
Set-TenantCopilotFeature `
  -AllowGenerativeAnswers $true `
  -AllowGenerativeActions $true `
  -RequireApprovalForGenerativeContent $true
```

### Knowledge Source Controls

```powershell
# Allow only approved knowledge sources
Set-TenantCopilotFeature `
  -AllowSharePointOnline $true `
  -AllowPublicWebsites $false `
  -AllowDataverse $true
```

## Environment Routing

Configure default environment behavior:

```powershell
# Set default environment routing
Set-AdminPowerPlatformEnvironment `
  -EnvironmentName "DEFAULT" `
  -CopilotStudioEnabled $true `
  -MakerRouting "PowerPlatform"

# Exclude specific users from Copilot Studio
Set-AdminPowerPlatformUser `
  -UserEmail "user@company.com" `
  -CopilotStudioEnabled $false
```

## Tenant Settings Checklist

| Setting | Recommended | Why |
|---------|-------------|-----|
| Publishing | Enable with approval | Control what goes live |
| Generative AI | Enable with restrictions | Balance capability/risk |
| Public websites | Disable | Prevent data leakage |
| SharePoint | Enable | Internal docs only |
| External connectors | Review individually | Control data flow |

## Next Steps

Proceed to [Step 3: Environment Security](03-environment-security.md)
