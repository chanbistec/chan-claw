# Step 6: Configure Audit Logging

Connect Copilot Studio to customer's SIEM/Log Analytics for compliance monitoring.

## Connect to Customer's Log Analytics

```powershell
# Get Log Analytics workspace details from customer
$workspaceId = "CUSTOMER-WORKSPACE-ID"
$workspaceKey = "CUSTOMER-WORKSPACE-KEY"

# Set up diagnostic settings
Set-AdminPowerAppEnvironmentDiagnostics `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -WorkspaceId $workspaceId `
  -WorkspaceKey $workspaceKey `
  -LogType @("Analytics", "Audit", "Diagnostics")
```

## What Gets Logged

| Log Type | Contents |
|----------|----------|
| **Analytics** | Conversation transcripts, usage metrics |
| **Audit** | Agent changes, publishing, user actions |
| **Diagnostics** | Performance, errors, API calls |

## Kusto Query Examples

```kusto
// Get all Copilot Studio activities
CopilotStudioAudit
| where TimeGenerated > ago(7d)
| where AppName == "copilotstudio"
| summarize count() by OperationName
| order by count_

// Get failed authentication attempts
CopilotStudioAudit
| where OperationName == "SignInFailed"
| project TimeGenerated, UserId, IpAddress, FailureReason
```

## Forward to Azure Sentinel (Optional)

```powershell
# Customer IT does this in their Sentinel workspace
# 1. Add Power Platform data connector
# 2. Enable analytics rules for Copilot Studio
# 3. Configure alerts and playbooks
```

## Next Steps

Proceed to **Step 7: User Access & Permissions**
