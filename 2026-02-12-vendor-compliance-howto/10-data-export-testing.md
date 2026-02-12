# Step 10: Data Export & Testing

Export conversation data and validate your configuration before go-live.

## Export Conversation Transcripts

```powershell
# Get transcripts for date range
Export-CopilotStudioTranscript `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AgentId "AGENT-ID" `
  -StartDate "2026-01-01" `
  -EndDate "2026-01-31" `
  -OutputPath "/path/to/export.csv"
```

## Automated Export to Blob Storage

```powershell
# Set up Azure Blob export
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -TranscriptExportEnabled $true `
  -StorageAccount "customerstorageacct" `
  -ContainerName "copilot-transcripts"
```

## Pre-Go-Live Checklist

```powershell
# 1. Verify DLP doesn't block connectors
Test-PowerAppConnector `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -ConnectorId "shared_teams"

# 2. Verify user can access agent
Test-CopilotStudioAccess `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AgentId "AGENT-ID" `
  -UserEmail "testuser@customer.com"

# 3. Verify data residency
Get-AdminPowerAppEnvironment -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object Location

# 4. Verify CMK is enabled
Get-AdminCopilotStudioEnvironment -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object CustomerManagedKeyEnabled

# 5. Verify logging is configured
Get-AdminPowerAppEnvironmentDiagnostics -EnvironmentName "ENVIRONMENT-NAME"
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Can't access environment | Not added to environment | Request environment access from IT |
| DLP blocks connector | Policy doesn't allow | Request connector addition to DLP |
| MFA blocks sign-in | CA policy too strict | Work with IT to exclude service account |
| Can't enable CMK | No Key Vault access | Request Key Vault Contributor role |
| No logs appearing | Log Analytics not configured | Configure diagnostic settings |

## Documentation for Customer Handoff

Provide at project completion:

- [ ] Architecture diagram (data flow)
- [ ] DLP policy applied
- [ ] Environment settings summary
- [ ] CMK configuration details
- [ ] User permission matrix
- [ ] Audit/logging configuration
- [ ] Security roles assigned
- [ ] ALM process followed

## Who Does What

| Task | Who Performs |
|------|--------------|
| Set region | Vendor (with approval) |
| Configure DLP | Customer IT (or jointly) |
| Enable CMK | Customer IT |
| Conditional Access | Customer IT |
| Set up logging | Vendor (with customer SIEM) |
| User permissions | Customer IT or Vendor |
| Generative AI settings | Customer IT |
| Agent sharing | Vendor |
