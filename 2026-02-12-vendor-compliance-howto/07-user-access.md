# Step 7: User Access & Permissions

Configure who can access and edit Copilot Studio agents.

## Via Power Platform Admin Center

```
1. Go to https://admin.powerplatform.microsoft.com
2. Navigate to Environments → [Your Environment]
3. Click Settings → Users + permissions
4. Add users or groups
5. Assign security role
6. Click Save
```

## Security Roles

| Role | Permissions |
|------|-------------|
| **Environment Admin** | Full control |
| **Environment Maker** | Create/edit agents |
| **Environment User** | Use agents only |
| **Basic User** | Read/write own data |

## Via PowerShell

```powershell
# Add user to environment
Add-AdminToEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -UserEmail "user@customer.com" `
  -RoleName "Environment Maker"

# Add security group to environment
Add-GroupToEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -GroupObjectId "SECURITY-GROUP-OBJECT-ID" `
  -RoleName "Environment User"
```

## Copilot Studio-Specific Roles

```powershell
# Set Copilot Studio permissions
Set-AdminPowerAppUser `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -UserEmail "maker@customer.com" `
  -CopilotPermission "CreateAgents"

Set-AdminPowerAppUser `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -UserEmail "user@customer.com" `
  -CopilotPermission "UseAgents"
```

## Next Steps

Proceed to **Step 8: Generative AI Settings**
