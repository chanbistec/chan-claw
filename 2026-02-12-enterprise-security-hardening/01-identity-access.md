# Step 1: Identity & Access Management

## Overview

Identity and access management is the foundation of Copilot Studio security. Configure Entra ID settings to ensure only authorized users can access Copilot Studio.

## Required Entra ID Configuration

### 1) License Requirements

Ensure users have appropriate licenses:

| License | Capability |
|---------|------------|
| **Copilot Studio license** | Create/use agents |
| **Power Apps per user** | Full platform access |
| **Office/Microsoft 365** | Basic Teams integration |

### 2) Security Groups

Create dedicated security groups for Copilot Studio:

| Group Name | Purpose | Members |
|------------|---------|---------|
| `CopilotStudio-Makers` | Create/edit agents | Agent developers |
| `CopilotStudio-Publishers` | Publish agents | Team leads |
| `CopilotStudio-Admins` | Full admin access | IT administrators |
| `CopilotStudio-Users` | Use agents | General workforce |

### 3) Role-Based Access Control

Assign Entra ID roles:

```powershell
# View current role assignments
Get-AzureADDirectoryRole

# Assign Copilot Studio admin role
Add-AzureADDirectoryRoleMember `
  -ObjectId "ROLE-OBJECT-ID" `
  -RefObjectId "USER-OBJECT-ID"
```

## Remove Unnecessary Access

```powershell
# Find users with Copilot Studio access
Get-PowerAppUser -EnvironmentName "DEFAULT"

# Remove former employees or contractors
Remove-AdminFromEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -UserEmail "former-employee@company.com"
```

## Best Practices

| Do | Don't |
|----|-------|
| Use security groups for access | Assign individual permissions |
| Regular access reviews (quarterly) | Orphaned accounts |
| Immediate revocation on termination | Leave access open |
| Least privilege principle | Overly permissive roles |

## Monitor Access

```powershell
# Get access report
Get-PowerAppUser `
  -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object Email, Role, LastAccess

# Export for review
Export-Csv -Path "access-report.csv" -InputObject $users
```

## Next Steps

Proceed to [Step 2: Tenant-Level Governance](02-tenant-settings.md)
