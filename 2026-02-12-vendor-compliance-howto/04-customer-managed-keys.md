# Step 4: Configure Customer-Managed Keys (CMK)

Enable customer-provided encryption keys for enhanced data protection.

## Prerequisites

- Customer must have Azure Key Vault
- Customer must provide Key Vault URI and key name
- You need Key Vault Contributor role (or equivalent)

## Via Azure Portal

```
1. Go to Azure Portal → Key Vaults
2. Select customer's Key Vault
3. Note: Vault name, Key name
4. Ensure access policies allow your service principal
5. Provide these details to Copilot Studio admin:
   - Key Vault URI: https://YOUR-KEY-VAULT.vault.azure.net/
   - Key name: copilot-studio-key
   - Key version: (latest, or specific version)
```

## Via PowerShell

```powershell
# Connect to customer's Azure
Connect-AzAccount -Tenant "CUSTOMER-TENANT-ID"

# Verify Key Vault access
Get-AzKeyVaultKey -VaultName "CUSTOMER-KEY-VAULT-NAME"

# Enable CMK in Copilot Studio environment
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -CustomerManagedKeyEnabled $true `
  -KeyVaultUri "https://CUSTOMER-KEY-VAULT.vault.azure.net/" `
  -KeyName "copilot-studio-key"
```

## Verify CMK is Enabled

```powershell
Get-AdminCopilotStudioEnvironment -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object DisplayName, CustomerManagedKeyEnabled, KeyVaultUri
```

## Next Steps

Proceed to **Step 5: Conditional Access**
