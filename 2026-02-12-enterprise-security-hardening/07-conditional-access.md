# Step 7: Conditional Access Policies

## Overview

Configure Entra ID Conditional Access policies to enforce security requirements for Copilot Studio access.

## Required Policies

### Policy 1: Require MFA

```json
{
  "Name": "Copilot Studio - Require MFA",
  "Conditions": {
    "Applications": {
      "IncludeApplications": ["ab9d8e8f-2d9d-4067-bd21-7b8d2e8f7c3d"]
    }
  },
  "GrantControls": {
    "Operator": "OR",
    "BuiltInControls": ["mfa"]
  }
}
```

### Policy 2: Require Compliant Device

```json
{
  "Name": "Copilot Studio - Compliant Device Only",
  "Conditions": {
    "Applications": {
      "IncludeApplications": ["ab9d8e8f-2d9d-4067-bd21-7b8d2e8f7c3d"]
    },
    "Devices": {
      "IncludeDevices": ["Compliant"]
    }
  },
  "GrantControls": {
    "Operator": "AND",
    "BuiltInControls": ["deviceCompliance"]
  }
}
```

### Policy 3: Block Access from Untrusted Locations

```json
{
  "Name": "Copilot Studio - Trusted Locations Only",
  "Conditions": {
    "Applications": {
      "IncludeApplications": ["ab9d8e8f-2d9d-4067-bd21-7b8d2e8f7c3d"]
    },
    "Locations": {
      "IncludeLocations": ["AllTrustedLocations"]
    }
  },
  "GrantControls": {
    "Operator": "OR",
    "BuiltInControls": ["block"]
  }
}
```

## Via Azure Portal

```
1. Go to Azure Portal → Entra ID → Protection → Conditional Access
2. Click New Policy
3. Configure:
   - Name: "Copilot Studio - Require MFA"
   - Assignments → Users and groups: Select Copilot Studio users
   - Assignments → Cloud apps: Select Copilot Studio
   - Access controls → Grant: Require multi-factor authentication
4. Enable policy
5. Click Create
```

## Exclude Service Accounts

```powershell
# Create security group for service accounts
New-AzureADGroup `
  -DisplayName "CopilotStudio-ServiceAccounts" `
  -SecurityEnabled $true

# Exclude from MFA policy (service accounts may not support MFA)
Set-ConditionalAccessPolicy `
  -PolicyId "POLICY-ID" `
  -ExcludedUsers "service-account@company.com"
```

## Policy Best Practices

| Policy | Priority | Notes |
|--------|----------|-------|
| Require MFA | High | All users |
| Compliant device | Medium | Production only |
| Block legacy auth | High | Disable Basic Auth |
| Trusted locations | Medium | Define trusted IPs |
| Session timeout | Medium | 4-8 hours |

## Monitor Conditional Access

```powershell
# Get sign-in logs for Copilot Studio
Get-AzureADUserSignInLog `
  -Filter "AppDisplayName eq 'Copilot Studio'" |
  Select-Object UserDisplayName, Status, ConditionalAccessStatus
```

## Next Steps

Proceed to [Step 8: Monitoring & Audit Logging](08-monitoring-audit.md)
