# Step 1: Customer Access Setup

**Prerequisite: Get access from customer's IT team before configuring anything.**

## Request These from Customer IT

| Item | Why You Need It |
|------|-----------------|
| **Tenant ID** | To sign into their Power Platform environment |
| **Environment URL** | Direct access to their Copilot Studio admin |
| **Environment Admin role** | To configure settings and policies |
| **Azure AD group names** | To assign permissions to your team |
| **Service account credentials** | For automated deployments |

## Accept Invitation

```
1. Customer sends invitation to your work email
2. Click the link in the email
3. Sign in with your Microsoft account
4. Accept permissions
5. You now have access to their tenant
```

## Verify Access (PowerShell)

```powershell
# Install Power Platform module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

# Sign in to customer's tenant
Add-PowerAppsAccount -TenantID "CUSTOMER-TENANT-ID"

# List environments (verify you can see them)
Get-PowerAppEnvironment
```

## Next Steps

Once access is verified, proceed to **Step 2: Data Residency**
