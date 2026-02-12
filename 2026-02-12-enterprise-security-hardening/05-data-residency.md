# Step 5: Data Residency & Sovereignty

## Overview

Control where Copilot Studio data is stored, processed, and managed to comply with regional regulations.

## Available Regions

| Region | Location | Compliance |
|--------|----------|------------|
| `unitedstates` | United States | SOC, FedRAMP |
| `europe` | European Union | GDPR, ENISA |
| `uk` | United Kingdom | UK GDPR |
| `australia` | Australia | APRA, Privacy Act |
| `japan` | Japan | APPI |
| `canada` | Canada | PIPEDA |
| `france` | France | GDPR |
| `switzerland` | Switzerland | GDPR, FADP |
| `singapore` | Singapore | PDPA |
| `southkorea` | South Korea | PIPA |
| `southafrica` | South Africa | POPIA |
| `india` | India | DPDP |

## Configure Data Residency

### Via Admin Center

```
1. Go to Power Platform admin center
2. Environments → [Select Environment]
3. Settings → Product →地理データ residency
4. Select required region
5. Click Save
```

### Via PowerShell

```powershell
# Set environment to EU region
Set-AdminPowerAppEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -Location "europe"

# Verify setting
Get-AdminPowerAppEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" |
  Select-Object DisplayName, Location
```

## EU Data Boundary (EUDB)

For EU customers requiring data to stay within EU:

```powershell
# Verify EUDB compliance
Get-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object DisplayName, Location, IsEUDbCompliant
```

### EUDB Requirements

1. Customer tenant billing address in EU/EFTA
2. All environments created in EU regions
3. No data movement outside EU

## Generative AI Data Movement

Generative AI features may move data outside the configured region:

```powershell
# Disable data movement for generative AI
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AllowDataMovementOutsideGeography $false

# Enable only if required (with approval)
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AllowDataMovementOutsideGeography $true
```

## Compliance Mapping

| Regulation | Required Region | Key Requirements |
|------------|-----------------|------------------|
| **GDPR** | EU/EEA | Data subject rights, consent |
| **UK GDPR** | UK | UK data residency |
| **HIPAA** | US | PHI protection |
| **PIPEDA** | Canada | Consumer privacy |
| **APPI** | Japan | Personal data protection |
| **PDPA** | Singapore | Data protection |

## Next Steps

Proceed to [Step 6: Encryption & Customer-Managed Keys](06-encryption-keys.md)
