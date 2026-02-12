# Step 11: Incident Response

## Overview

Define procedures for detecting, responding to, and recovering from Copilot Studio security incidents.

## Incident Types

| Severity | Type | Examples |
|----------|------|----------|
| **Critical** | Data breach | Sensitive data exposed, unauthorized access |
| **High** | Policy violation | Agent publishing without approval |
| **Medium** | Anomalous activity | Unusual conversation patterns |
| **Low** | Policy warning | Minor policy violation |

## Detection

### Alert Rules

```powershell
# Alert: Unauthorized agent publishing
New-AzMonitorAlertRule `
  -Name "CopilotStudio-UnauthorizedPublish" `
  -ResourceGroupName "Security-RG" `
  -Condition "CopilotStudioAudit | where OperationName == 'PublishAgent' | where User not in ('approved-publishers')"

# Alert: Data exfiltration attempt
New-AzMonitorAlertRule `
  -Name "CopilotStudio-DataExfiltration" `
  -ResourceGroupName "Security-RG" `
  -Condition "CopilotStudioAudit | where OperationName == 'ExportTranscript' | where FileSize > 10000000"
```

### Anomaly Detection

```kusto
// Unusual conversation volume
CopilotStudioAnalytics
| where TimeGenerated > ago(1d)
| summarize Conversations = dcount(SessionId) by User
| where Conversations > 100
| project User, Conversations

// After-hours access
CopilotStudioAudit
| where TimeGenerated > ago(7d)
| where hour_of_day(TimeGenerated) < 6 or hour_of_day(TimeGenerated) > 20
| project User, TimeGenerated, OperationName
```

## Response Procedures

### Critical Incident (Data Breach)

```
IMMEDIATE ACTIONS (0-1 hour):

1. Isolate affected environment
   - Disable user access
   - Set environment to read-only

2. Preserve evidence
   - Export audit logs
   - Capture conversation transcripts
   - Document timeline

3. Notify stakeholders
   - IT Security team
   - Data Protection Officer
   - Legal department

4. Engage incident response team
   - Follow corporate IR procedure
   - Engage external IR if needed

WITHIN 24 HOURS:

5. Assessment
   - Scope of breach
   - Data types affected
   - Users impacted
   - Attack vector

6. Regulatory notification (if required)
   - Supervisory authority
   - Affected individuals

7. Containment
   - Remove unauthorized access
   - Patch vulnerability
   - Reset credentials
```

### High Severity (Policy Violation)

```
1. Document violation
2. Engage agent owner
3. Unpublish agent if needed
4. Review and update policies
5. Train users
```

## Recovery

```powershell
# Restore from backup (if available)
Restore-CopilotStudioAgent `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AgentId "AGENT-ID" `
  -RestorePoint "2026-02-10T12:00:00Z"

# Resume normal operations
Set-AdminPowerAppEnvironment `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -AccessMode "Full"
```

## Post-Incident Review

| Item | Description |
|------|-------------|
| **Timeline** | Detailed event sequence |
| **Root cause** | What allowed the incident |
| **Impact** | Scope and severity |
| **Response** | What worked, what didn't |
| **Remediation** | Steps to prevent recurrence |
| **Lessons learned** | Process improvements |

## Contact Matrix

| Contact | Role | Escalation Time |
|---------|------|-----------------|
| IT Security On-Call | Initial response | Immediate |
| Data Protection Officer | Data breach | 1 hour |
| CISO | Critical incident | 2 hours |
| Legal | Regulatory | 4 hours |
| PR/Communications | Public incident | 4 hours |

## Next Steps

Proceed to [Step 12: Compliance Mapping](12-compliance-mapping.md)
