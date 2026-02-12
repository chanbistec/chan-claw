# Step 10: Vendor/Third-Party Access Management

## Overview

Securely manage access for vendors, partners, and contractors who need Copilot Studio access.

## Vendor Access Model

| Access Level | Permissions | Duration | Approval |
|--------------|-------------|----------|----------|
| **Viewer** | Use agents only | Project-based | IT approval |
| **Maker** | Create/edit agents | Project-based | Business + IT |
| **Publisher** | Publish agents | Project-based | IT + Security |
| **Admin** | Full access | Limited | CISO approval |

## Create Vendor Security Group

```powershell
# Create vendor access group
New-AzureADGroup `
  -DisplayName "Vendors-CopilotStudio-Makers" `
  -SecurityEnabled $true `
  -Description "Vendor access to create Copilot Studio agents"

# Add vendor users
Add-AzureADGroupMember `
  -ObjectId "GROUP-OBJECT-ID" `
  -RefObjectId "VENDOR-USER-OBJECT-ID"
```

## Time-Limited Access

### Implement Access Expiration

```powershell
# Add user with expiration (90 days)
Add-AdminToEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -UserEmail "vendor@partner.com" `
  -RoleName "Environment Maker" `
  -AccessExpiration (Get-Date).AddDays(90)
```

### Automated Access Review

```powershell
# Get users with expiration approaching
Get-PowerAppUser `
  -EnvironmentName "PROD-ENVIRONMENT" |
  Where-Object AccessExpiration -lt (Get-Date).AddDays(7) |
  Select-Object Email, AccessExpiration

# Send reminder to business owner
# Extension requires new approval
```

## Vendor Agreement Requirements

Before granting access, require vendors to sign:

- [ ] Data processing agreement (DPA)
- [ ] Security acknowledgment
- [ ] Incident notification procedure
- [ ] Access logging consent
- [ ] Exit procedure (knowledge transfer)

## Remove Vendor Access

```powershell
# Remove on project completion
Remove-AdminFromEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -UserEmail "vendor@partner.com"

# Remove from security group
Remove-AzureADGroupMember `
  -ObjectId "GROUP-OBJECT-ID" `
  -MemberId "VENDOR-USER-OBJECT-ID"
```

## Monitor Vendor Activity

```powershell
# Track vendor actions
CopilotStudioAudit
| where TimeGenerated > ago(30d)
| where UserId contains "vendor"
| summarize Actions = count() by UserId, OperationName
| order by Actions desc
```

## Vendor Security Checklist

| Requirement | Status |
|-------------|--------|
| Signed DPA | ☐ |
| Security training completed | ☐ |
| Access expiration set | ☐ |
| Monitoring enabled | ☐ |
| Business owner assigned | ☐ |
| Exit procedure documented | ☐ |

## Next Steps

Proceed to [Step 11: Incident Response](11-incident-response.md)
