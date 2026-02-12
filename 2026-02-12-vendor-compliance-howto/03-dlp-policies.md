# Step 3: Apply DLP Policies

DLP (Data Loss Prevention) policies control which connectors are allowed or blocked.

## What Are DLP Policies?

DLP policies block or allow connectors to prevent data leakage between business and non-business data sources.

## View Existing DLP Policies

```powershell
# List all DLP policies
Get-PowerAppDataPolicy

# Get details of a specific policy
Get-PowerAppDataPolicy -PolicyId "POLICY-ID"
```

## Via Power Platform Admin Center

```
1. Go to https://admin.powerplatform.microsoft.com
2. Navigate to Policies → Data policies
3. View existing policies
4. Note which connectors are BLOCKED vs ALLOWED
5. Identify which policy applies to your environment
```

## Common Connector IDs

| Connector ID | Service |
|--------------|---------|
| `shared_teams` | Microsoft Teams |
| `shared_sharepointonline` | SharePoint |
| `shared_azuresql` | Azure SQL |
| `shared_http` | HTTP |
| `shared_powerautomate` | Power Automate |
| `shared_servicenow` | ServiceNow |
| `shared_salesforce` | Salesforce |
| `shared_office365` | Office 365 |

## Add Connectors to Allowed List

```powershell
# Add connector to allowed list
Add-ConnectorToDataPolicy `
  -PolicyId "POLICY-ID" `
  -ConnectorId "shared_teams" `
  -GroupName "Business"
```

## Create New DLP Policy

```powershell
New-PowerAppDataPolicy `
  -DisplayName "Copilot Studio - [PROJECT-NAME]" `
  -Description "DLP policy for [PROJECT-NAME] agent" `
  -ConnectorGroupType "Business"

# Assign policy to environment
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -DataPolicy "NEW-POLICY-ID"
```

## Best Practices

| Do | Don't |
|----|-------|
| Use existing policies when possible | Create new policies without customer approval |
| Document allowed connectors | Add unnecessary connectors |
| Review quarterly | Set and forget |

## Next Steps

Proceed to **Step 4: Configure Customer-Managed Keys**
