# Vendor Compliance How-To Guide

**Step-by-step instructions for leveraging customer's existing compliance controls**

## Overview

This guide provides detailed steps for vendors deploying Copilot Studio solutions to enterprise customers, showing how to use the customer's existing controls rather than building compliance from scratch.

## Contents

| Step | Topic |
|------|-------|
| [01](01-customer-access.md) | Customer Access Setup |
| [02](02-data-residency.md) | Configure Data Residency |
| [03](03-dlp-policies.md) | Apply DLP Policies |
| [04](04-customer-managed-keys.md) | Configure Customer-Managed Keys |
| [05](05-conditional-access.md) | Conditional Access |
| [06](06-audit-logging.md) | Audit Logging |
| [07](07-user-access.md) | User Access & Permissions |
| [08](08-generative-ai.md) | Generative AI Settings |
| [09](09-agent-sharing.md) | Agent Sharing Controls |
| [10](10-data-export-testing.md) | Data Export & Testing |

## Quick Reference

### Key PowerShell Modules

```powershell
# Power Platform Admin
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

# Azure (for Key Vault)
Install-Module -Name Az.Accounts
Install-Module -Name Az.KeyVault
```

### Common Commands

```powershell
# List environments
Get-PowerAppEnvironment

# Set region
Set-AdminPowerAppEnvironment -EnvironmentName "NAME" -Location "unitedstates"

# Add user
Add-AdminToEnvironment -EnvironmentName "NAME" -UserEmail "user@email.com" -RoleName "Environment Maker"

# Configure logging
Set-AdminPowerAppEnvironmentDiagnostics -EnvironmentName "NAME" -WorkspaceId "ID" -WorkspaceKey "KEY"
```

## Related Documentation

- [Vendor Compliance Overview](../2026-02-12-vendor-copilot-compliance/README.md)
- [Copilot Studio Compliance Summary](../2026-02-12-copilot-studio-compliance/README.md)

## Questions?

Review the troubleshooting section in Step 10 or consult your customer's IT team.
