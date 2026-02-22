# Step 6: Encryption & Customer-Managed Keys

## Overview

Enable customer-managed encryption keys (CMK) for enhanced data protection and compliance.

## What is CMK?

Customer-Managed Keys allow you to control encryption keys instead of using Microsoft-managed keys. This provides:
- Key lifecycle control
- Key rotation management
- Audit trail for key access
- Compliance with key custody requirements

## Prerequisites

Before enabling CMK:

- [ ] Azure Key Vault exists
- [ ] Key Vault configured with soft-delete
- [ ] Key created (RSA 2048 or larger)
- [ ] IT Security approved CMK usage
- [ ] Key rotation policy defined

## Create Key Vault (If Needed)

```powershell
# Create Key Vault with soft-delete
New-AzKeyVault `
  -Name "CopilotStudio-KeyVault" `
  -ResourceGroupName "Security-RG" `
  -Location "europe" `
  -EnableSoftDelete `
  -EnablePurgeProtection

# Create encryption key
Add-AzKeyVaultKey `
  -VaultName "CopilotStudio-KeyVault" `
  -Name "CopilotStudio-Encryption-Key" `
  -Size 4096 `
  -KeyType RSA
```

## Enable CMK in Copilot Studio

```powershell
# Get Key Vault details
$keyVault = Get-AzKeyVault `
  -VaultName "CopilotStudio-KeyVault"

# Enable CMK for environment
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -CustomerManagedKeyEnabled $true `
  -KeyVaultUri $keyVault.VaultUri `
  -KeyName "CopilotStudio-Encryption-Key"
```

## Verify CMK is Enabled

```powershell
# Check CMK status
Get-AdminCopilotStudioEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" |
  Select-Object DisplayName, CustomerManagedKeyEnabled, KeyVaultUri
```

## Key Rotation

```powershell
# Rotate key (creates new version)
Add-AzKeyVaultKey `
  -VaultName "CopilotStudio-KeyVault" `
  -Name "CopilotStudio-Encryption-Key" `
  -Size 4096 `
  -KeyType RSA

# Update Copilot Studio to use new key version
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -CustomerManagedKeyEnabled $true `
  -KeyVaultUri $keyVault.VaultUri `
  -KeyName "CopilotStudio-Encryption-Key" `
  -KeyVersion "LATEST"
```

## Key Access Policy

Configure Key Vault access policy:

```powershell
# Grant Copilot Studio access
Set-AzKeyVaultAccessPolicy `
  -VaultName "CopilotStudio-KeyVault" `
  -ObjectId "COPILOT-STUDIO-SERVICE-PRINCIPAL" `
  -PermissionsToKeys get, unwrapKey, wrapKey `
  -BypassObjectIdValidation
```

## CMK Audit

```powershell
# Get key access logs
Get-AzKeyVaultKeyOperation `
  -VaultName "CopilotStudio-KeyVault" `
  -Name "CopilotStudio-Encryption-Key"
```

## Next Steps

Proceed to [Step 7: Conditional Access Policies](07-conditional-access.md)
