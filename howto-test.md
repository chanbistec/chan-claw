# Vendor Guide: How to Use Enterprise Compliance Controls for Copilot Studio

**Step-by-step instructions for leveraging customer's existing controls**

---

## Prerequisite: Get Customer Access

Before you can configure anything, you need access from the customer's IT team.

### 1) Request These from Customer IT

| Item | Why You Need It |
|------|-----------------|
| **Tenant ID** | To sign into their Power Platform environment |
| **Environment URL** | Direct access to their Copilot Studio admin |
| **Environment Admin role** | To configure settings and policies |
| **Azure AD group names** | To assign permissions to your team |
| **Service account credentials** | For automated deployments |

### 2) Accept Invitation (if needed)

```
1. Customer sends invitation to your work email
2. Click the link in the email
3. Sign in with your Microsoft account
4. Accept permissions
5. You now have access to their tenant
```

### 3) Verify Access

```powershell
# Install Power Platform module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

# Sign in to customer's tenant
Add-PowerAppsAccount -TenantID "CUSTOMER-TENANT-ID"

# List environments (verify you can see them)
Get-PowerAppEnvironment
```

---

## Step 1: Configure Data Residency

### Via Power Platform Admin Center (Web UI)

```
1. Go to https://admin.powerplatform.microsoft.com
2. Sign in with customer tenant credentials
3. Navigate to Environments
4. Select your target environment
5. Click Settings → Product →地理データ residency
6. Select region:
   - United States
   - Europe
   - United Kingdom
   - Australia
   - Japan
   - India
   - Canada
   - France
   - Switzerland
   - Singapore
   - South Korea
   - South Africa
7. Click Save
```

### Via PowerShell

```powershell
# Set environment region
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -Location "unitedstates"

# Available locations:
# - unitedstates
# - europe
# - uk
# - australia
# - japan
# - india
# - canada
# - france
# - switzerland
# - singapore
# - southkorea
# - southafrica
```

### Verify Region

```powershell
Get-AdminPowerAppEnvironment -EnvironmentName "ENVIRONMENT-NAME" | Select-Object DisplayName, Location
```

---

## Step 2: Apply DLP Policies

### What Are DLP Policies?

DLP (Data Loss Prevention) policies block or allow connectors to prevent data leakage.

### View Existing DLP Policies

```powershell
# List all DLP policies
Get-PowerAppDataPolicy

# Get details of a specific policy
Get-PowerAppDataPolicy -PolicyId "POLICY-ID"
```

### Via Power Platform Admin Center

```
1. Go to https://admin.powerplatform.microsoft.com
2. Navigate to Policies → Data policies
3. View existing policies
4. Note which connectors are BLOCKED vs ALLOWED
5. Identify which policy applies to your environment
```

### Add Connectors to Allowed List

```powershell
# Get current policy
$policy = Get-PowerAppDataPolicy -PolicyId "POLICY-ID"

# Add connector to allowed list
Add-ConnectorToDataPolicy `
  -PolicyId "POLICY-ID" `
  -ConnectorId "shared_https" `
  -GroupName "Business"

# Common connector IDs for Copilot Studio:
# - shared_teams                (Microsoft Teams)
# - shared_sharepointonline     (SharePoint)
# - shared_azuresql            (Azure SQL)
# - shared_http                 (HTTP)
# - shared_powerautomate        (Power Automate)
# - shared_servicenow           (ServiceNow)
# - shared_salesforce           (Salesforce)
# - shared_office365            (Office 365)
```

### Create New DLP Policy for Your Project

```powershell
New-PowerAppDataPolicy `
  -DisplayName "Copilot Studio - [PROJECT-NAME]" `
  -Description "DLP policy for [PROJECT-NAME] agent" `
  -ConnectorGroupType "Business"

# Add allowed connectors
Add-ConnectorToDataPolicy `
  -PolicyId "NEW-POLICY-ID" `
  -ConnectorId "shared_teams" `
  -GroupName "Business"

Add-ConnectorToDataPolicy `
  -PolicyId "NEW-POLICY-ID" `
  -ConnectorId "shared_sharepointonline" `
  -GroupName "Business"

# Assign policy to environment
Set-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -DataPolicy "NEW-POLICY-ID"
```

### DLP Policy Best Practices

| Do | Don't |
|----|-------|
| Use existing policies when possible | Create new policies without customer approval |
| Document allowed connectors | Add unnecessary connectors |
| Review quarterly | Set and forget |

---

## Step 3: Configure Customer-Managed Keys (CMK)

### Prerequisites

- Customer must have Azure Key Vault
- Customer must provide Key Vault URI and key name
- You need Key Vault Contributor role (or equivalent)

### Via Azure Portal

```
1. Go to Azure Portal → Key Vaults
2. Select customer's Key Vault
3. Note: Vault name, Key name
4. Ensure access policies allow your service principal
5. Provide these details to Copilot Studio admin:
   - Key Vault URI: https://YOUR-KEY-VAULT.vault.azure.net/
   - Key name: copilot-studio-key
   - Key version: (latest, or specific version)
```

### Via PowerShell (Admin)

```powershell
# Connect to customer's Azure
Connect-AzAccount -Tenant "CUSTOMER-TENANT-ID"

# Verify Key Vault access
Get-AzKeyVaultKey -VaultName "CUSTOMER-KEY-VAULT-NAME"

# Enable CMK in Copilot Studio environment
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -CustomerManagedKeyEnabled $true `
  -KeyVaultUri "https://CUSTOMER-KEY-VAULT.vault.azure.net/" `
  -KeyName "copilot-studio-key"
```

### Verify CMK is Enabled

```powershell
Get-AdminCopilotStudioEnvironment -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object DisplayName, CustomerManagedKeyEnabled, KeyVaultUri
```

---

## Step 4: Set Up Entra ID Conditional Access

### What You'll Configure

You typically don't configure CA policies yourself—customer IT does. But you need to:

1. **Provide requirements** to customer IT
2. **Test your agent** under their CA policies

### Provide This to Customer IT

```
REQUIREMENTS FOR COPILOT STUDIO DEPLOYMENT

Service URL: https://copilotstudio.microsoft.com

Required Access:
- Users must be able to access copilotstudio.microsoft.com
- Users must be able to authenticate via Entra ID
- MFA is required (acceptable methods: Microsoft Authenticator, FIDO2, etc.)

Recommended Conditions:
- Block access from unknown locations (optional)
- Require compliant device (optional)
- Require hybrid joined device (optional)

Required User Roles:
- Copilot Studio User (minimum)
- Copilot Studio Editor (for makers)
- Copilot Studio Admin (for administrators)

Blocked Actions:
- None required
```

### Test Conditional Access

```powershell
# As a regular user, test access
1. Sign out of all sessions
2. Go to https://copilotstudio.microsoft.com
3. Attempt to sign in
4. Verify MFA is prompted
5. Verify you can access your environment

# As admin, check access logs
Get-AzureADUserSignInLog -Filter "AppDisplayName eq 'Copilot Studio'"
```

---

## Step 5: Configure Audit Logging to Customer SIEM

### Connect to Customer's Log Analytics

```powershell
# Get Log Analytics workspace details from customer
$workspaceId = "CUSTOMER-WORKSPACE-ID"
$workspaceKey = "CUSTOMER-WORKSPACE-KEY"

# Set up diagnostic settings (Power Platform admin)
Set-AdminPowerAppEnvironmentDiagnostics `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -WorkspaceId $workspaceId `
  -WorkspaceKey $workspaceKey `
  -LogType @("Analytics", "Audit", "Diagnostics")
```

### What Gets Logged

| Log Type | Contents |
|----------|----------|
| **Analytics** | Conversation transcripts, usage metrics |
| **Audit** | Agent changes, publishing, user actions |
| **Diagnostics** | Performance, errors, API calls |

### Query Logs (Kusto)

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

// Get conversation summaries
CopilotStudioAnalytics
| where TimeGenerated > ago(1d)
| summarize Conversations = dcount(SessionId),
          AvgDuration = avg(DurationSeconds)
by Date = bin(TimeGenerated, 1d)
```

### Forward to Azure Sentinel (Optional)

```powershell
# Customer IT does this in their Sentinel workspace
# 1. Add Power Platform data connector
# 2. Enable analytics rules for Copilot Studio
# 3. Configure alerts and playbooks
```

---

## Step 6: Configure User Access & Permissions

### Via Power Platform Admin Center

```
1. Go to https://admin.powerplatform.microsoft.com
2. Navigate to Environments → [Your Environment]
3. Click Settings → Users + permissions
4. Add users or groups:
   a. Click Add user
   b. Enter email or group name
   c. Assign security role:
      - Environment Admin (full control)
      - Environment Maker (create/edit agents)
      - Environment User (use agents only)
      - Basic User (read/write own data)
5. Click Save
```

### Via PowerShell

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

# Available roles:
# - Environment Admin
# - Environment Maker
# - Environment User
# - Basic User
# - Delegate (custom roles)
```

### Assign Copilot Studio-Specific Roles

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

---

## Step 7: Configure Generative AI Settings

### Enable/Disable Generative AI at Tenant Level

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

### Via PowerShell

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

### Environment-Level Settings

```powershell
# Set environment-specific AI settings
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -GenerativeAnswersEnabled $true `
  -GenerativeActionsEnabled $true `
  -KnowledgeSourcePublicWebsites $false
```

---

## Step 8: Set Up Agent Sharing Controls

### Configure Sharing Rules

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

### Via PowerShell

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

### Sharing Best Practices

| Scenario | Setting |
|----------|---------|
| Internal team only | Share with specific security group |
| Broad rollout | Share with "Everyone in tenant" |
| Pilot group | Share with specific users |
| External users | Use Teams channel sharing (not direct) |

---

## Step 9: Configure Data Export for Compliance

### Export Conversation Transcripts

```powershell
# Get transcripts for date range
Export-CopilotStudioTranscript `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -AgentId "AGENT-ID" `
  -StartDate "2026-01-01" `
  -EndDate "2026-01-31" `
  -OutputPath "/path/to/export.csv"
```

### Automated Export to Blob Storage

```powershell
# Set up Azure Blob export
Set-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" `
  -TranscriptExportEnabled $true `
  -StorageAccount "customerstorageacct" `
  -ContainerName "copilot-transcripts"
```

### Retention Policy

```powershell
# Configure retention (customer IT typically sets this)
Get-AdminPowerAppEnvironmentPolicy `
  -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object RetentionInDays
```

---

## Step 10: Test Your Configuration

### Pre-Go-Live Checklist

```powershell
# Run these tests as part of acceptance

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
Get-AdminPowerAppEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object Location

# 4. Verify CMK is enabled
Get-AdminCopilotStudioEnvironment `
  -EnvironmentName "ENVIRONMENT-NAME" |
  Select-Object CustomerManagedKeyEnabled

# 5. Verify logging is configured
Get-AdminPowerAppEnvironmentDiagnostics `
  -EnvironmentName "ENVIRONMENT-NAME"
```

### Test Script for Customer Validation

```powershell
# Complete validation script
$results = @{}

# Region
$env = Get-AdminPowerAppEnvironment -EnvironmentName "ENVIRONMENT-NAME"
$results["Region"] = $env.Location

# DLP
$dlp = Get-PowerAppDataPolicy -PolicyId $env.DataPolicy
$results["AllowedConnectors"] = ($dlp | ConvertTo-Json)

# CMK
$cmk = Get-AdminCopilotStudioEnvironment -EnvironmentName "ENVIRONMENT-NAME"
$results["CMKEnabled"] = $cmManagedKeyEnabled

# Audit
k.Customer$audit = Get-AdminPowerAppEnvironmentDiagnostics -EnvironmentName "ENVIRONMENT-NAME"
$results["LoggingConfigured"] = ($null -ne $audit)

# Output results
$results | Format-Table
```

---

## Summary: Who Does What

| Task | Who Performs | How |
|------|--------------|-----|
| Set region | Vendor (with approval) | Power Platform Admin Center |
| Configure DLP | Customer IT (or jointly) | Admin Center / PowerShell |
| Enable CMK | Customer IT | Azure Key Vault + PowerShell |
| Conditional Access | Customer IT | Entra ID admin center |
| Set up logging | Vendor (with customer SIEM) | Power Platform / Azure Monitor |
| User permissions | Customer IT or Vendor | Admin Center / PowerShell |
| Generative AI settings | Customer IT | Admin Center |
| Agent sharing | Vendor | Copilot Studio UI |

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Can't access environment | Not added to environment | Request environment access from IT |
| DLP blocks connector | Policy doesn't allow | Request connector addition to DLP |
| MFA blocks sign-in | CA policy too strict | Work with IT to exclude service account |
| Can't enable CMK | No Key Vault access | Request Key Vault Contributor role |
| No logs appearing | Log Analytics not configured | Configure diagnostic settings |

---

## Documentation for Customer Handoff

Provide these documents at project completion:

- [ ] Architecture diagram (data flow)
- [ ] DLP policy applied
- [ ] Environment settings summary
- [ ] CMK configuration details
- [ ] User permission matrix
- [ ] Audit/logging configuration
- [ ] Security roles assigned
- [ ] ALM process followed

---

**Full vendor guide:** https://github.com/chanbistec/chan-claw/blob/main/2026-02-12-vendor-copilot-compliance/README.md