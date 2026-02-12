# Step 4: Data Loss Prevention Controls

## Overview

Configure DLP policies to control which connectors agents can use, preventing data leakage.

## DLP Policy Structure

DLP policies categorize connectors into three groups:

| Group | Description | Risk Level |
|-------|-------------|------------|
| **Business** | Approved corporate data sources | Low |
| **Non-Business** | Personal apps,未经授权的服务 | High |
| **Blocked** | Prohibited connectors | N/A |

## Create DLP Policy

```powershell
# Create new DLP policy
New-PowerAppDataPolicy `
  -DisplayName "Copilot Studio - Production" `
  -Description "Strict DLP for production Copilot Studio" `
  -ConnectorGroupType "Business"
```

## Recommended Connector Classifications

### Allow (Business)

| Connector | Data Type | Risk |
|-----------|-----------|------|
| `shared_teams` | Internal communication | Low |
| `shared_sharepointonline` | Internal documents | Low |
| `shared_office365` | Email, calendar | Low |
| `shared_dynamics365` | CRM data | Medium |
| `shared_powerautomate` | Workflows | Medium |
| `shared_azuresql` | Structured data | Medium |
| `shared_http` | Approved APIs | Review |

### Block (Non-Business/Blocked)

| Connector | Reason |
|-----------|--------|
| `shared_gmail` | Personal email |
| `shared_dropbox` | Personal cloud storage |
| `shared_google-drive` | Personal storage |
| `shared_personal-onedrive` | Personal storage |
| `shared_twitter` | Social media |
| `shared_facebook` | Social media |

## Configure DLP Policy

```powershell
# Add connectors to Business group
Add-ConnectorToDataPolicy `
  -PolicyId "POLICY-ID" `
  -ConnectorId "shared_teams" `
  -GroupName "Business"

Add-ConnectorToDataPolicy `
  -PolicyId "POLICY-ID" `
  -ConnectorId "shared_sharepointonline" `
  -GroupName "Business"

# Block high-risk connectors
Add-ConnectorToDataPolicy `
  -PolicyId "POLICY-ID" `
  -ConnectorId "shared_gmail" `
  -GroupName "Blocked"

# Assign policy to environment
Set-AdminPowerAppEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -DataPolicy "POLICY-ID"
```

## DLP Best Practices

| Do | Don't |
|----|-------|
| Start restrictive, relax as needed | Start permissive |
| Document allowed connectors | Add connectors without review |
| Regular quarterly reviews | Set and forget |
| Use exception process | Randomly block connectors |
| Test policies before production | Apply untested policies |

## Test DLP Policy

```powershell
# Test connector access
Test-PowerAppConnector `
  -ConnectorId "shared_teams" `
  -PolicyId "POLICY-ID"
  # Should return: Allowed

Test-PowerAppConnector `
  -ConnectorId "shared_gmail" `
  -PolicyId "POLICY-ID"
  # Should return: Blocked
```

## Next Steps

Proceed to [Step 5: Data Residency](05-data-residency.md)
