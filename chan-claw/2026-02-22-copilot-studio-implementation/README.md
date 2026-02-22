# Copilot Studio Governance Implementation Guide

> A step-by-step guide for IT administrators to implement governance controls for Microsoft Copilot Studio and the Power Platform.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Global Administrator or Power Platform Administrator role
- [ ] Access to the Power Platform Admin Center (https://admin.powerplatform.microsoft.com)
- [ ] Access to Microsoft Entra Admin Center (https://entra.microsoft.com)
- [ ] Access to Microsoft Purview Compliance Portal (https://compliance.microsoft.com)
- [ ] Microsoft 365 E3/E5 or Power Platform per-user/per-app licenses
- [ ] Copilot Studio license (included in some M365 plans or standalone)

---

## Phase 1: Environment Strategy (Week 1)

### Step 1.1: Audit Current Environments

1. Navigate to **Power Platform Admin Center** → **Environments**
2. Export the list of all existing environments
3. Document:
   - Environment name, type, and region
   - Number of apps, flows, and agents in each
   - Who created each environment and when
   - Current security roles assigned

```
Action: Create a spreadsheet tracking all environments
Owner: IT Admin
Timeline: Day 1-2
```

### Step 1.2: Rename the Default Environment

1. Go to **Power Platform Admin Center** → **Environments**
2. Select the default environment (usually named after your tenant)
3. Click **Edit** → rename to **"Personal Productivity"**
4. This signals to makers that this environment is for personal use only

```
Action: Rename default environment
Owner: IT Admin
Timeline: Day 2
```

### Step 1.3: Create the Environment Structure

Create the following environments in **Power Platform Admin Center** → **Environments** → **+ New**:

| Environment Name | Type | Purpose | Who Has Access |
|---|---|---|---|
| Personal Productivity | Default (existing) | Individual experimentation | All makers |
| Development | Developer | Shared development workspace | Dev team |
| Test / UAT | Sandbox | Testing and validation | Dev team + testers |
| Production | Production | Live solutions | Limited admins |

For each environment:
1. Click **+ New**
2. Set **Name**, **Type**, and **Region** (match your tenant region)
3. Enable **Dataverse** if agents need data storage
4. Set **Security group** to control who can access it

```
Action: Create Dev, Test, and Production environments
Owner: IT Admin
Timeline: Day 2-3
```

### Step 1.4: Configure Environment Routing

Route makers to their personal developer environment by default:

1. Go to **Power Platform Admin Center** → **Settings** → **Environment routing**
2. Enable **Environment routing**
3. Set the default target to **Personal Productivity** environment
4. This prevents makers from accidentally building in production

```
Action: Enable environment routing
Owner: IT Admin
Timeline: Day 3
```

### Step 1.5: Enable Managed Environments

For Production (and optionally Test):

1. Go to **Power Platform Admin Center** → **Environments**
2. Select the Production environment
3. Click **Enable Managed Environment**
4. Configure:
   - **Usage insights**: Enabled
   - **Maker welcome content**: Add a custom message with governance guidelines
   - **Solution checker enforcement**: Warn or Block
   - **Sharing controls**: Limit sharing to security groups

```
Action: Enable Managed Environments for Production and Test
Owner: IT Admin
Timeline: Day 3
```

---

## Phase 2: Data Loss Prevention (Week 1-2)

### Step 2.1: Create the Tenant-Wide Baseline DLP Policy

This policy applies to ALL environments as a safety net:

1. Go to **Power Platform Admin Center** → **Policies** → **Data policies** → **+ New Policy**
2. Name: **"Tenant Baseline - Default Deny"**
3. Scope: **Apply to all environments**

Configure connector groups:

**Business group** (can talk to each other):
- Microsoft Dataverse
- Office 365 Outlook
- Office 365 Users
- SharePoint
- Microsoft Teams
- OneDrive for Business
- Approvals
- Microsoft Copilot Studio

**Non-Business group** (can talk to each other but NOT to Business):
- (Leave empty or minimal)

**Blocked group**:
- All social media connectors (Twitter, Facebook, etc.)
- All file-sharing connectors not in Business (Dropbox, Google Drive, Box)
- HTTP connector (blocks arbitrary web calls)
- Custom connectors (block by default)

4. Set **Default group for new connectors** → **Blocked**
5. Click **Create Policy**

```
Action: Create tenant-wide baseline DLP policy
Owner: IT Admin
Timeline: Day 4-5
```

### Step 2.2: Create the Default Environment DLP Policy

A more restrictive policy for the default/Personal Productivity environment:

1. **Power Platform Admin Center** → **Policies** → **Data policies** → **+ New Policy**
2. Name: **"Personal Productivity - Restrictive"**
3. Scope: **Apply to selected environments** → select "Personal Productivity"

Configure:
- **Business group**: Only Microsoft Dataverse, Office 365 Users, Office 365 Outlook
- **Non-Business group**: Empty
- **Blocked group**: Everything else
- **Default group for new connectors**: Blocked

```
Action: Create restrictive DLP for default environment
Owner: IT Admin
Timeline: Day 5
```

### Step 2.3: Create the Production Environment DLP Policy

A balanced policy that allows business connectors:

1. Create new DLP policy
2. Name: **"Production - Controlled Access"**
3. Scope: **Apply to selected environments** → select Production

Configure:
- **Business group**: Core Microsoft connectors + approved third-party connectors
- Add connector endpoint filtering for HTTP/custom connectors (if needed)
- Add action-level controls to restrict specific operations
- **Default group for new connectors**: Blocked

```
Action: Create production DLP policy
Owner: IT Admin
Timeline: Day 5-6
```

### Step 2.4: Configure Connector Endpoint Filtering

For connectors that need granular control:

1. In your DLP policy, select a connector (e.g., HTTP)
2. Click **Configure connector** → **Connector endpoints**
3. Add allowed URL patterns:
   - `https://api.yourcompany.com/*` → Allow
   - `*` → Deny (block all other endpoints)

Apply endpoint filtering to:
- HTTP connector
- Custom connectors
- Any connector accessing external APIs

```
Action: Configure endpoint filtering for sensitive connectors
Owner: IT Admin
Timeline: Day 6
```

---

## Phase 3: Tenant Isolation & Cross-Tenant Controls (Week 2)

### Step 3.1: Activate Tenant Isolation

1. Go to **Power Platform Admin Center** → **Settings** → **Tenant settings**
2. Find **Tenant isolation**
3. Set to **Enabled**
4. This blocks ALL cross-tenant connections by default

```
Action: Enable tenant isolation
Owner: IT Admin / Global Admin
Timeline: Day 7
```

### Step 3.2: Configure Cross-Tenant Allow Lists

For legitimate business scenarios (subsidiaries, partners):

1. In **Tenant isolation** settings, click **New tenant rule**
2. Enter the **Tenant ID** of the partner organization
3. Set direction:
   - **Inbound**: They can connect to your data
   - **Outbound**: Your users can connect to their data
   - **Both**: Bidirectional access
4. Add only approved tenant relationships

```
Action: Configure cross-tenant allow lists
Owner: IT Admin + Legal/Compliance
Timeline: Day 7-8
```

### Step 3.3: Disable Self-Service Environment Creation

Prevent makers from creating their own environments:

1. Go to **Power Platform Admin Center** → **Settings** → **Tenant settings**
2. Find **Who can create production and sandbox environments**
3. Set to **Only specific admins**
4. Find **Who can create developer environments**
5. Set to **Everyone** (allows personal experimentation without risk)
6. Find **Who can create trial environments**
7. Set to **Only specific admins** or **Everyone** based on your policy

```
Action: Restrict environment creation
Owner: IT Admin
Timeline: Day 8
```

---

## Phase 4: Conditional Access & Identity (Week 2)

### Step 4.1: Create Conditional Access Policy for Power Platform

1. Go to **Microsoft Entra Admin Center** → **Protection** → **Conditional Access** → **+ New policy**
2. Name: **"Power Platform - Require MFA + Compliant Device"**
3. Configure:
   - **Users**: All users (exclude break-glass accounts)
   - **Cloud apps**: Select **Power Apps**, **Power Automate**, **Copilot Studio**
   - **Conditions**: All platforms
   - **Grant**: Require MFA AND require compliant device
   - **Session**: Sign-in frequency = 8 hours

```
Action: Create Conditional Access policy for Power Platform
Owner: IT Admin / Identity Team
Timeline: Day 9
```

### Step 4.2: Block Access from Unmanaged Devices (Optional)

For high-security environments:

1. Create a second Conditional Access policy
2. Name: **"Power Platform - Block Unmanaged Devices"**
3. Configure:
   - **Conditions** → **Device platforms** → All
   - **Filter for devices**: Device is not compliant OR not Entra joined
   - **Grant**: Block access

```
Action: Create device compliance policy (if required)
Owner: IT Admin / Identity Team
Timeline: Day 9
```

### Step 4.3: Configure Security Groups for Environment Access

1. Go to **Microsoft Entra Admin Center** → **Groups** → **+ New group**
2. Create groups:
   - `SG-PowerPlatform-Makers` — All authorized makers
   - `SG-PowerPlatform-Admins` — Platform administrators
   - `SG-PowerPlatform-Prod-Deployers` — Can deploy to production
3. Assign groups to environments:
   - **Power Platform Admin Center** → **Environments** → select environment
   - **Settings** → **Users + permissions** → **Security roles**
   - Assign appropriate roles to security groups

```
Action: Create and assign security groups
Owner: IT Admin
Timeline: Day 9-10
```

---

## Phase 5: Deployment Pipelines (Week 3)

### Step 5.1: Install Power Platform Pipelines

1. Go to **Power Platform Admin Center** → **Environments** → select your host environment
2. Install the **Power Platform Pipelines** application from AppSource
3. Or use the Power Platform CLI:
   ```powershell
   pac admin install --environment-id <host-env-id> --application-name "Power Platform Pipelines"
   ```

```
Action: Install Pipelines application
Owner: IT Admin
Timeline: Day 11
```

### Step 5.2: Configure Pipeline Stages

1. Open the **Deployment Pipeline Configuration** app in the host environment
2. Create a new pipeline:
   - **Name**: "Standard Deployment Pipeline"
   - **Stages**:
     1. Development → Test (auto or manual trigger)
     2. Test → Production (requires approval)
3. Map environments to stages:
   - Stage 1: Development environment
   - Stage 2: Test environment
   - Stage 3: Production environment

```
Action: Configure pipeline stages
Owner: IT Admin
Timeline: Day 11-12
```

### Step 5.3: Configure Approval Workflows

1. In the Pipeline Configuration app, edit Stage 3 (Production)
2. Enable **Pre-deployment approval**
3. Add approvers:
   - Primary: Platform Admin
   - Secondary: Business Owner
4. Set timeout: 72 hours
5. Configure notification emails

```
Action: Configure approval workflows
Owner: IT Admin
Timeline: Day 12
```

### Step 5.4: Restrict Direct Production Changes

1. Go to **Power Platform Admin Center** → **Environments** → Production
2. **Settings** → **Product** → **Features**
3. Disable **Allow creation of unmanaged customizations**
4. This forces all changes through the pipeline

```
Action: Lock down direct production modifications
Owner: IT Admin
Timeline: Day 12
```

---

## Phase 6: Monitoring & Auditing (Week 3)

### Step 6.1: Install the Center of Excellence (CoE) Starter Kit

1. Download from [Microsoft CoE Starter Kit](https://aka.ms/CoEStarterKit)
2. Create a dedicated environment for CoE: **"CoE Administration"**
3. Import the solution:
   ```powershell
   pac solution import --path CoEStarterKit_x.x.x_managed.zip --environment <coe-env-id>
   ```
4. Configure the setup wizard:
   - Connect to your tenant
   - Enable inventory sync
   - Configure email notifications

```
Action: Install and configure CoE Starter Kit
Owner: IT Admin
Timeline: Day 13-14
```

### Step 6.2: Configure Microsoft Purview for Power Platform

1. Go to **Microsoft Purview Compliance Portal**
2. Navigate to **Audit** → **Audit log search**
3. Verify Power Platform events are being captured:
   - Search for activities: "Power Apps", "Power Automate", "Copilot Studio"
4. Create an alert policy:
   - **Name**: "Copilot Studio - Agent Published"
   - **Activity**: Agent published
   - **Severity**: Medium
   - **Notify**: Platform admins

```
Action: Configure Purview audit logging and alerts
Owner: IT Admin / Compliance Team
Timeline: Day 14
```

### Step 6.3: Connect to Microsoft Sentinel (Optional)

For advanced threat detection:

1. In **Microsoft Sentinel** → **Data connectors**
2. Search for **Microsoft Power Platform** connector
3. Enable the connector
4. Configure analytics rules:
   - Alert on bulk data exports
   - Alert on new custom connectors
   - Alert on cross-tenant activity
   - Alert on elevated privilege assignments

```
Action: Connect Sentinel for advanced monitoring
Owner: IT Admin / Security Team
Timeline: Day 14-15
```

### Step 6.4: Set Up Weekly Governance Report

Using the CoE Starter Kit:

1. Open the **CoE Dashboard** app
2. Configure the weekly governance digest:
   - New apps/flows/agents created this week
   - Environments approaching capacity
   - DLP policy violations
   - Orphaned resources (creator left org)
3. Schedule email delivery to platform admins

```
Action: Configure weekly governance reports
Owner: IT Admin
Timeline: Day 15
```

---

## Phase 7: Copilot Studio-Specific Controls (Week 3-4)

### Step 7.1: Configure Agent Sharing Controls

1. Go to **Power Platform Admin Center** → **Environments** → Production
2. **Settings** → **Product** → **Features**
3. Configure Copilot Studio settings:
   - **Who can publish agents**: Only users with Copilot Studio maker role
   - **External channel publishing**: Disabled (or restricted to approved channels)
   - **Agent sharing**: Restricted to security groups

```
Action: Configure agent sharing controls
Owner: IT Admin
Timeline: Day 16
```

### Step 7.2: Control AI Builder and Generative AI Features

1. In **Power Platform Admin Center** → **Settings** → **Tenant settings**
2. Configure:
   - **AI Builder**: Enabled for specific environments only
   - **Copilot for makers**: Enabled/Disabled based on policy
   - **Generative AI features**: Review and configure per environment
   - **Bing Search grounding**: Disabled in production (if data sensitivity requires it)
   - **Move data across regions for AI features**: Disabled (data residency compliance)

```
Action: Configure AI and generative AI settings
Owner: IT Admin
Timeline: Day 16
```

### Step 7.3: Configure Knowledge Source Controls

For agents using knowledge bases:

1. Review which data sources agents can connect to:
   - SharePoint sites (restrict to approved sites)
   - Dataverse tables (use security roles)
   - External websites (use DLP to control)
   - Uploaded files (review sensitivity)
2. Create a DLP policy specifically for knowledge source connectors
3. Document approved knowledge sources in your governance guide

```
Action: Define and enforce knowledge source controls
Owner: IT Admin + Data Governance Team
Timeline: Day 17
```

### Step 7.4: Set Up Agent Registration Process

Create a lightweight intake process:

1. Create a SharePoint list or Dataverse table: **"Agent Registry"**
2. Required fields:
   - Agent name
   - Business owner
   - Purpose / use case description
   - Data classification (Public / Internal / Confidential)
   - Data sources used
   - Target audience (internal / external)
   - Environment (Dev / Test / Prod)
   - Approval status
3. Create a Power Automate flow for approval routing
4. Require registration before production deployment

```
Action: Create agent registration process
Owner: IT Admin + Business
Timeline: Day 17-18
```

---

## Phase 8: Communication & Enablement (Week 4)

### Step 8.1: Create the Governance Documentation

Publish an internal governance guide covering:

1. **Rules of engagement**: What makers can and cannot do
2. **Environment guide**: Which environment to use for what
3. **Data classification**: How to classify data in agents
4. **Connector guide**: Approved connectors and how to request new ones
5. **Deployment process**: How to promote from dev to production
6. **Support channels**: Where to get help

Host on SharePoint or your internal wiki.

```
Action: Create and publish governance documentation
Owner: IT Admin + Communications
Timeline: Day 19-20
```

### Step 8.2: Configure Maker Welcome Content

1. Go to **Power Platform Admin Center** → **Environments** → each managed environment
2. **Edit Managed Environment settings**
3. Set **Maker welcome content**:
   - Add a URL to your governance documentation
   - Include a brief message about rules and resources
   - This displays when makers first access the environment

```
Action: Configure maker welcome content
Owner: IT Admin
Timeline: Day 20
```

### Step 8.3: Set Up the Exception Request Process

Makers need a way to request exceptions:

1. Create a **Power App** or **Microsoft Form** for exception requests:
   - Connector unblock requests
   - Cross-tenant access requests
   - Custom connector approval
   - Environment creation requests
2. Route to appropriate approvers via Power Automate
3. Track all exceptions in a central list
4. Review exceptions quarterly

```
Action: Create exception request process
Owner: IT Admin
Timeline: Day 20-21
```

---

## Validation Checklist

After completing all phases, verify:

### Environment Strategy
- [ ] Default environment renamed to "Personal Productivity"
- [ ] Dev, Test, and Production environments created
- [ ] Environment routing enabled
- [ ] Managed environments enabled for Production
- [ ] Self-service environment creation restricted

### Data Loss Prevention
- [ ] Tenant-wide baseline DLP policy active
- [ ] Default environment restrictive DLP policy active
- [ ] Production environment DLP policy active
- [ ] Default group for new connectors = Blocked
- [ ] Endpoint filtering configured for sensitive connectors

### Tenant Isolation
- [ ] Tenant isolation enabled
- [ ] Cross-tenant allow lists configured (if needed)
- [ ] Verified cross-tenant connections blocked by default

### Identity & Access
- [ ] Conditional Access policies applied
- [ ] Security groups created and assigned
- [ ] MFA required for Power Platform access

### Deployment Pipelines
- [ ] Pipelines installed and configured
- [ ] Approval workflows active for production deployments
- [ ] Direct production modifications disabled

### Monitoring
- [ ] CoE Starter Kit installed and syncing
- [ ] Purview audit logging verified
- [ ] Alert policies configured
- [ ] Weekly governance report scheduled

### Copilot Studio Controls
- [ ] Agent sharing controls configured
- [ ] Generative AI settings reviewed
- [ ] Knowledge source controls defined
- [ ] Agent registration process created

### Communication
- [ ] Governance documentation published
- [ ] Maker welcome content configured
- [ ] Exception request process live

---

## Ongoing Maintenance

| Task | Frequency | Owner |
|---|---|---|
| Review DLP policy violations | Weekly | IT Admin |
| Review new apps/agents/flows | Weekly | IT Admin |
| Process exception requests | As needed | IT Admin |
| Update connector allow/block lists | Monthly | IT Admin |
| Review cross-tenant rules | Quarterly | IT Admin + Security |
| Update governance documentation | Quarterly | IT Admin |
| CoE Starter Kit updates | As released | IT Admin |
| Maker training sessions | Monthly | IT Admin + Champions |
| Full governance audit | Annually | IT Admin + Compliance |

---

## PowerShell Quick Reference

### Install Power Platform CLI
```powershell
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
```

### List all environments
```powershell
pac admin list
```

### List DLP policies
```powershell
pac admin list-dlp-policies
```

### Export environment details
```powershell
pac admin list --output table
```

### Create a new environment
```powershell
pac admin create --name "Development" --type Developer --region "unitedstates"
```

### Enable managed environment
```powershell
pac admin set-managed-environment --environment-id <env-id> --protection-level Standard
```

---

## Resources

- [Microsoft Learn: Power Platform Governance](https://learn.microsoft.com/en-us/power-platform/guidance/adoption/admin-best-practices)
- [CoE Starter Kit Documentation](https://learn.microsoft.com/en-us/power-platform/guidance/coe/starter-kit)
- [DLP Policy Documentation](https://learn.microsoft.com/en-us/power-platform/admin/wp-data-loss-prevention)
- [Copilot Studio Admin Guide](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-overview)
- [Power Platform Pipelines](https://learn.microsoft.com/en-us/power-platform/alm/pipelines)
- [Managed Environments](https://learn.microsoft.com/en-us/power-platform/admin/managed-environment-overview)

---

*Document version: 1.0 | Created: 2026-02-22 | Author: ChanClaw*
