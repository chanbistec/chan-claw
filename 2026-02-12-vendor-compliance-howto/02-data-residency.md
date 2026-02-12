# Step 2: Configure Data Residency

Control where your Copilot Studio data is stored geographically.

## Available Regions

| Region Code | Location |
|-------------|----------|
| `unitedstates` | United States |
| `europe` | Europe |
| `uk` | United Kingdom |
| `australia` | Australia |
| `japan` | Japan |
| `india` | India |
| `canada` | Canada |
| `france` | France |
| `switzerland` | Switzerland |
| `singapore` | Singapore |
| `southkorea` | South Korea |
| `southafrica` | South Africa |

## Via Power Platform Admin Center (Web UI)

```
1. Go to https://admin.powerplatform.microsoft.com
2. Sign in with customer tenant credentials
3. Navigate to Environments
4. Select your target environment
5. Click Settings → Product →地理データ residency
6. Select region
7. Click Save
```

## Via PowerShell

```powershell
# Set environment region
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -Location "unitedstates"
```

## Verify Region

```powershell
Get-AdminPowerAppEnvironment -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object DisplayName, Location
```

## Best Practices

- Confirm data residency requirements with customer before deployment
- Use customer's preferred region for compliance
- Document region selection in solution design

## Next Steps

Proceed to **Step 3: Apply DLP Policies**
