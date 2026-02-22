# Step 9: Agent Sharing Controls

Configure who can edit and view your Copilot Studio agents.

## Via Copilot Studio UI

```
1. Go to https://copilotstudio.microsoft.com
2. Open your agent
3. Click Settings → Sharing
4. Configure:
   a. Who can edit: [Specific users / Security groups / Everyone]
   b. Who can view: [Specific users / Security groups / Everyone]
   c. Maximum viewers: [Number limit]
5. Click Save
```

## Via PowerShell

```powershell
# Get agent details
$agent = Get-CopilotStudioAgent -Name "AGENT-NAME" -Environment "ENVIRONMENT-NAME"

# Share with user
Share-CopilotStudioAgent `
  -AgentId $agent.Id `
  -UserEmail "user@customer.com" `
  -Role "Viewer"  # or "Editor"

# Share with group
Share-CopilotStudioAgent `
  -AgentId $agent.Id `
  -GroupObjectId "SECURITY-GROUP-OBJECT-ID" `
  -Role "Editor"
```

## Sharing Best Practices

| Scenario | Setting |
|----------|---------|
| Internal team only | Share with specific security group |
| Broad rollout | Share with "Everyone in tenant" |
| Pilot group | Share with specific users |
| External users | Use Teams channel sharing (not direct) |

## Next Steps

Proceed to **Step 10: Data Export & Testing**
