# Step 3: Environment Security

## Overview

Secure individual Copilot Studio environments with appropriate controls and restrictions.

## Environment Types

| Environment Type | Purpose | Security Level |
|------------------|---------|----------------|
| **Development** | Testing, prototyping | Medium |
| **User Acceptance Testing** | QA before production | High |
| **Production** | Live agents | Highest |

## Create Secure Environment

```powershell
# Create environment with security
New-AdminPowerAppEnvironment `
  -DisplayName "Secure Production" `
  -EnvironmentName "SECURE-PROD" `
  -Location "europe" `
  -Sku "Production" `
  -SecurityEnabled $true
```

## Security Settings

### Restrict Who Can Create Agents

```powershell
# Only specific users can create agents
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -MakerSecurityGroup "CopilotStudio-Makers"
```

### Disable Guest Access

```powershell
# Prevent guest users from accessing
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AllowGuestAccess $false
```

### Set Sharing Limits

```powershell
# Limit number of viewers per agent
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -MaxViewerLimit 100
```

## Environment Security Checklist

| Setting | Dev | UAT | Production |
|---------|-----|-----|------------|
| Maker security group | Optional | Required | Required |
| Guest access | Disabled | Disabled | Disabled |
| Viewer limits | 500 | 200 | 100 |
| Publishing approval | No | Yes | Yes |
| DLP policy | Relaxed | Standard | Strict |

## Next Steps

Proceed to [Step 4: DLP Controls](04-dlp-controls.md)