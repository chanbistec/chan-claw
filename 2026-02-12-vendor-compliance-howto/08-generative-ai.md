# Step 8: Configure Generative AI Settings

Control generative AI features at tenant and environment level.

## Via Power Platform Admin Center

```
1. Go to https://admin.powerplatform.microsoft.com
2. Navigate to Settings → Product features
3. Find "Generative AI"
4. Toggle:
   - Allow publishing of custom agents
   - Allow public websites as knowledge sources
   - Allow data movement across geographies
5. Click Save
```

## Via PowerShell

```powershell
# Enable generative AI features
Set-TenantCopilotFeature `
  -AllowPublishing $true `
  -AllowPublicWebsites $true `
  -AllowDataMovement $true

# Disable specific features
Set-TenantCopilotFeature `
  -AllowPublishing $true `
  -AllowPublicWebsites $false `
  -AllowDataMovement $false
```

## Environment-Level Settings

```powershell
# Set environment-specific AI settings
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -GenerativeAnswersEnabled $true `
  -GenerativeActionsEnabled $true `
  -KnowledgeSourcePublicWebsites $false
```

## Data Movement Consideration

Generative AI features may move data outside the configured region. Confirm customer's preference before enabling.

## Next Steps

Proceed to **Step 9: Agent Sharing Controls**
