# Step 8: Monitoring & Audit Logging

## Overview

Configure comprehensive logging to monitor Copilot Studio usage and detect security incidents.

## Enable Diagnostic Settings

### Connect to Log Analytics

```powershell
# Get Log Analytics workspace
$workspace = Get-AzOperationalInsightsWorkspace `
  -ResourceGroupName "Security-RG" `
  -Name "Security-Analytics"

# Enable diagnostics
Set-AdminPowerAppEnvironmentDiagnostics `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -WorkspaceId $workspace.CustomerId `
  -WorkspaceKey $workspace.PrimarySharedKey `
  -LogType @("Analytics", "Audit", "Diagnostics")
```

### What Gets Logged

| Log Type | Contents | Retention |
|----------|----------|-----------|
| **Analytics** | Conversation transcripts, usage metrics | 30 days |
| **Audit** | Agent changes, publishing, user actions | 90 days |
| **Diagnostics** | Performance, errors, API calls | 30 days |

## Kusto Query Examples

### Agent Activity

```kusto
// All Copilot Studio activities
CopilotStudioAudit
| where TimeGenerated > ago(7d)
| where AppName == "copilotstudio"
| summarize count() by OperationName
| order by count_

// Agent creation
CopilotStudioAudit
| where OperationName == "CreateAgent"
| project TimeGenerated, AgentName, CreatedBy, Environment
```

### User Access

```kusto
// Failed sign-ins
CopilotStudioAudit
| where OperationName == "SignInFailed"
| project TimeGenerated, UserId, IpAddress, FailureReason

// High-volume users
CopilotStudioAnalytics
| where TimeGenerated > ago(7d)
| summarize Conversations = dcount(SessionId) by User
| order by Conversations desc
```

### Sensitive Operations

```kusto
// Agent publishing
CopilotStudioAudit
| where OperationName == "PublishAgent"
| project TimeGenerated, AgentName, PublishedBy, Environment

// Data exports
CopilotStudioAudit
| where OperationName == "ExportTranscript"
| project TimeGenerated, ExportedBy, FileSize
```

## Alert Rules

### Create Alerts in Azure Monitor

```powershell
# Alert: Multiple failed sign-ins
New-AzMonitorAlertRule `
  -Name "CopilotStudio-FailedSignIns" `
  -ResourceGroupName "Security-RG" `
  -Condition "CopilotStudioAudit | where OperationName == 'SignInFailed' | count > 10" `
  -ActionGroup "Security-Alerts"

# Alert: Agent published outside business hours
New-AzMonitorAlertRule `
  -Name "CopilotStudio-AfterHoursPublish" `
  -ResourceGroupName "Security-RG" `
  -Condition "CopilotStudioAudit | where OperationName == 'PublishAgent' | where hour_of_day > 18 or hour_of_day < 8"
```

## Export to SIEM

```powershell
# Send to Azure Sentinel
# (Customer IT configures in Sentinel)

# Send to third-party SIEM (Splunk, Sumo, etc.)
# Use Event Hub or Log Analytics export
```

## Log Retention

| Data Type | Retention | Archive |
|-----------|-----------|---------|
| Audit logs | 90 days | 1 year |
| Analytics | 30 days | 90 days |
| Transcripts | 30 days | 1 year |

## Next Steps

Proceed to [Step 9: Knowledge Source Restrictions](09-dlp-knowledge-sources.md)
