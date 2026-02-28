# Azure IAM (RBAC) Best Practices Guide

> A comprehensive reference for DevOps engineers on securing Azure environments through proper identity and access management.
>
> **Last updated:** 2026-02-28

---

## Table of Contents

1. [Azure RBAC Fundamentals & Least Privilege](#1-azure-rbac-fundamentals--least-privilege)
2. [Group-Based vs Direct User Assignments](#2-group-based-vs-direct-user-assignments)
3. [Privileged Identity Management (PIM)](#3-privileged-identity-management-pim)
4. [Service Principal Security & Managed Identities](#4-service-principal-security--managed-identities)
5. [Scope Strategy: Subscription vs Resource Group](#5-scope-strategy-subscription-vs-resource-group)
6. [Orphaned & Stale Role Assignment Cleanup](#6-orphaned--stale-role-assignment-cleanup)
7. [Conditional Access for Privileged Roles](#7-conditional-access-for-privileged-roles)
8. [Azure Policy for RBAC Governance](#8-azure-policy-for-rbac-governance)
9. [Monitoring & Alerting on Role Changes](#9-monitoring--alerting-on-role-changes)
10. [Custom Role Design Principles](#10-custom-role-design-principles)
11. [Tooling Reference](#11-tooling-reference)
12. [Quick-Reference Checklist](#12-quick-reference-checklist)
13. [Official Microsoft Documentation Links](#13-official-microsoft-documentation-links)

---

## 1. Azure RBAC Fundamentals & Least Privilege

### Core Principle

Grant users **only the access they need** to perform their jobs — nothing more. This is the principle of least privilege and is the single most important RBAC best practice.

### Built-in vs Custom Roles

| Consideration | Built-in Roles | Custom Roles |
|---|---|---|
| **Maintenance** | Managed by Microsoft, auto-updated | You own the lifecycle |
| **Breadth** | 400+ roles covering most scenarios | Tailored to exact needs |
| **Risk** | Well-tested, documented | Can drift or become overly permissive |
| **Recommendation** | **Prefer built-in roles first** | Use only when no built-in role fits |

### Key Practices

- **Start with Reader**, then escalate only as needed.
- **Limit Owner and User Access Administrator** assignments — these are privileged administrator roles.
- **Maximum 3 subscription Owners** to reduce blast radius (Microsoft recommendation, enforced by Defender for Cloud).
- **Prefer job function roles** (e.g., `Virtual Machine Contributor`) over privileged administrator roles (e.g., `Contributor`, `Owner`).
- When a privileged role *is* required, scope it as narrowly as possible.

### Example: Granting Deployment Access

```bash
# Good: Scoped to a specific resource group with a job-function role
az role assignment create \
  --assignee-object-id "<group-object-id>" \
  --role "Web Plan Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>"

# Bad: Owner at subscription scope
az role assignment create \
  --assignee-object-id "<user-object-id>" \
  --role "Owner" \
  --scope "/subscriptions/<sub-id>"
```

---

## 2. Group-Based vs Direct User Assignments

### Why Groups?

- **Scalability** — Onboard/offboard by adding/removing group members, not touching role assignments.
- **Auditability** — Easier to answer "who has Contributor on production?" when roles map to groups.
- **Limit pressure on role assignment quotas** — Azure has a limit of **4,000 role assignments per subscription**. Group-based assignments count as one assignment regardless of group size.
- **Consistency** — Ensures identical permissions for team members in the same function.

### Recommended Pattern

```
Security Group: "sg-platform-contributors"
  └── Role: Contributor
  └── Scope: /subscriptions/<sub-id>/resourceGroups/platform-rg

Security Group: "sg-app-readers"
  └── Role: Reader
  └── Scope: /subscriptions/<sub-id>/resourceGroups/app-rg
```

### Naming Convention

Use a consistent naming scheme:

```
sg-<team/function>-<role>-<scope>
```

Examples:
- `sg-devops-contributor-prod`
- `sg-data-reader-analytics-rg`
- `sg-security-admin-sub`

### Key Practices

- **Never assign roles directly to individual users** in production environments.
- Use **Microsoft Entra security groups** (not M365 groups) for RBAC.
- Consider **role-assignable groups** for PIM-eligible assignments.
- Document group-to-role mappings in a central location (wiki, repo, or Terraform state).

---

## 3. Privileged Identity Management (PIM)

### What Is PIM?

Microsoft Entra Privileged Identity Management provides **just-in-time (JIT)** privileged access. Instead of standing (permanent) admin permissions, users are made *eligible* and must *activate* the role when needed.

### Key Features

| Feature | Description |
|---|---|
| **Just-in-time access** | Roles activated on demand, auto-expire after configured duration |
| **Approval workflows** | Require manager/security team approval before activation |
| **MFA enforcement** | Require MFA at activation time |
| **Justification** | Users must provide a business reason when activating |
| **Notifications** | Alerts when privileged roles are activated |
| **Access reviews** | Periodic recertification of who still needs eligible roles |
| **Audit trail** | Full history of activations for compliance |

### Recommended PIM Settings

```yaml
# Example PIM policy for "Contributor" on production subscription
activation:
  max_duration: 4 hours          # Keep short — 1-8h typical
  require_mfa: true
  require_justification: true
  require_approval: true
  approvers:
    - "sg-security-approvers"
    - "sg-platform-leads"

assignment:
  eligible_duration: 180 days    # Force re-review every 6 months
  permanent_eligible: false       # Avoid permanent eligibility
  permanent_active: false         # Never use permanent active for privileged roles

notifications:
  on_activation: true
  on_assignment: true
  recipients:
    - "security-team@example.com"
```

### Key Practices

- **Enable PIM for all privileged roles**: Owner, Contributor, User Access Administrator, and any custom roles with write/delete actions.
- **Keep activation windows short** — 1-4 hours for most roles.
- **Require approval for Owner and User Access Administrator** at minimum.
- **Schedule quarterly access reviews** via PIM.
- **Use PIM for Groups** to manage both Azure roles and Entra ID roles through group membership.
- **Monitor PIM audit logs** for unusual activation patterns.

### Licensing

PIM requires **Microsoft Entra ID P2** (or **Entra ID Governance**) licenses for each user with eligible assignments.

---

## 4. Service Principal Security & Managed Identities

### The Hierarchy of Preference

```
1. Managed Identity (system-assigned)  ← Best: no credentials to manage
2. Managed Identity (user-assigned)    ← Good: shareable, lifecycle control
3. Workload Identity Federation        ← Good: no secrets, federated trust
4. Service Principal + certificate     ← Acceptable: rotate regularly
5. Service Principal + client secret   ← Avoid: secrets leak easily
```

### Managed Identities

**System-assigned:**
- Tied to the lifecycle of the Azure resource (VM, App Service, Function App, etc.)
- Automatically created and deleted with the resource
- Cannot be shared across resources
- Best for single-resource scenarios

**User-assigned:**
- Created as a standalone Azure resource
- Can be assigned to multiple compute resources
- Managed independently — persists when compute resources are deleted
- Best for shared identity scenarios (e.g., multiple Functions accessing the same storage)

### Service Principal Hardening

When managed identities aren't possible (e.g., external CI/CD, on-premises agents):

- **Use certificate-based authentication** over client secrets.
- **Rotate credentials on a strict schedule:**
  - Client secrets: every 90 days maximum (60 days preferred)
  - Certificates: every 6-12 months
- **Set expiry dates** on all credentials — never create non-expiring secrets.
- **Scope narrowly** — assign roles at the resource group or resource level, never at the subscription level unless absolutely required.
- **Use Workload Identity Federation** for GitHub Actions, Terraform Cloud, and other OIDC-capable platforms to eliminate secrets entirely.

### Example: Federated Credential for GitHub Actions

```bash
# Create federated credential — no secrets needed
az ad app federated-credential create \
  --id <app-object-id> \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:myorg/myrepo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Key Practices

- **Audit all service principals quarterly** — identify unused or over-privileged ones.
- **Tag service principals** with owner, team, and purpose metadata.
- **Monitor sign-in logs** for service principal anomalies.
- **Never embed credentials in code** — use Key Vault, environment variables, or managed identity.

---

## 5. Scope Strategy: Subscription vs Resource Group

### Scope Hierarchy

```
Management Group
  └── Subscription
        └── Resource Group
              └── Resource
```

Roles assigned at a higher scope are **inherited** by all child scopes. This is powerful but dangerous.

### Decision Framework

| Scope | When to Use | Example |
|---|---|---|
| **Management Group** | Organization-wide policies, security team oversight | Security Reader for SOC team across all subs |
| **Subscription** | Platform-level access, networking, shared services | Network Contributor for NetOps team |
| **Resource Group** | Team/application workloads (most common) | Contributor for app team on their RG |
| **Resource** | Highly sensitive individual resources | Key Vault Secrets Officer on a specific vault |

### Key Practices

- **Default to resource-group scope** — this should be the most common assignment level.
- **Use management groups** for governance roles (Reader, Policy Contributor) rather than operational roles.
- **Avoid subscription-level Contributor/Owner** except for platform teams.
- **Structure resource groups by workload/team** to align with access boundaries.
- **Use resource-level scoping** for sensitive resources like Key Vaults, storage accounts with PII, and databases.

### Anti-Patterns to Avoid

```
❌ Contributor at management group level "for convenience"
❌ Owner at subscription level for app developers
❌ Different teams sharing a resource group with broad roles
❌ Granting subscription-level access to service principals
```

---

## 6. Orphaned & Stale Role Assignment Cleanup

### What Are Orphaned Assignments?

When a user, group, or service principal is deleted from Entra ID, the role assignment persists but shows as **"Identity not found"** with an `ObjectType` of `Unknown`. These clutter your RBAC and count toward quota limits.

### Detection

```bash
# Find orphaned role assignments (identity type "Unknown")
az role assignment list --all --query "[?principalType==''].{
  RoleDefinitionName:roleDefinitionName,
  Scope:scope,
  PrincipalId:principalId
}" -o table
```

```powershell
# PowerShell equivalent
Get-AzRoleAssignment | Where-Object {
  $_.ObjectType -eq "Unknown"
} | Select-Object RoleDefinitionName, Scope, ObjectId
```

### Cleanup

```bash
# Remove orphaned assignments
az role assignment delete --ids <assignment-id>
```

### Automation

Create a scheduled runbook or pipeline to:

1. **List** all role assignments across subscriptions
2. **Filter** for `Unknown` principal types
3. **Log** findings to a Log Analytics workspace
4. **Optionally auto-delete** orphaned assignments (with approval gate)
5. **Alert** on new orphaned assignments

### Stale Assignment Detection

Beyond orphaned assignments, look for:

- **Users who haven't signed in** for 90+ days but still have active role assignments
- **Service principals with no recent sign-in activity**
- **Eligible PIM assignments** that have never been activated
- **Role assignments for decommissioned projects/resource groups**

### Key Practices

- Run cleanup **monthly** at minimum.
- Use **Access Reviews** in Entra ID Governance for automated recertification.
- Track role assignment count per subscription to stay within quotas.
- Integrate cleanup into your offboarding/decommissioning procedures.

---

## 7. Conditional Access for Privileged Roles

### Why Conditional Access?

Even with PIM providing JIT access, you should enforce **additional controls** on how and where privileged roles can be activated or used.

### Recommended Policies

**Policy 1: Require MFA + Compliant Device for Admins**
```
Assignments:
  Users: Directory roles → Global Administrator, Owner, Contributor
  Cloud apps: Microsoft Azure Management
Conditions:
  (All conditions)
Grant:
  Require MFA
  Require device to be marked as compliant
```

**Policy 2: Block Legacy Authentication for All Admins**
```
Assignments:
  Users: All admin roles
  Cloud apps: All cloud apps
Conditions:
  Client apps: Exchange ActiveSync, Other clients
Grant:
  Block access
```

**Policy 3: Require Compliant Network for Privileged Operations**
```
Assignments:
  Users: Privileged admin roles
  Cloud apps: Microsoft Azure Management
Conditions:
  Locations: Exclude → Trusted/corporate locations
Grant:
  Block access
```

### Authentication Strength

Use **authentication strengths** (Entra ID feature) to require phishing-resistant MFA (FIDO2, Windows Hello, certificate-based) for privileged roles rather than just any MFA method.

### Key Practices

- **Separate CA policies for admin vs regular users** — admins should have stricter controls.
- **Use "Microsoft Azure Management" cloud app** to target portal, CLI, PowerShell, and API access.
- **Require phishing-resistant MFA** for Global Admin and Owner activations.
- **Enforce compliant/Entra-joined devices** for privileged access where possible.
- **Create break-glass accounts** excluded from CA policies, stored securely, and monitored for use.

---

## 8. Azure Policy for RBAC Governance

### What Can Azure Policy Enforce?

Azure Policy can audit and enforce RBAC-related configurations across your environment.

### Useful Built-in Policies

| Policy | Effect | Purpose |
|---|---|---|
| **Maximum of 3 owners per subscription** | Audit | Limit blast radius |
| **Deprecated accounts with owner permissions should be removed** | Audit | Detect stale assignments |
| **External accounts with owner permissions should be removed** | Audit | Limit external access |
| **MFA should be enabled for accounts with owner permissions** | Audit | Enforce MFA on owners |
| **There should be more than one owner assigned to your subscription** | Audit | Prevent lockout |
| **Service principals should be used to protect subscriptions instead of management certificates** | Audit | Modernize auth |

### Custom Policy Examples

**Deny role assignments with overly broad scope:**

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Authorization/roleAssignments"
        },
        {
          "field": "Microsoft.Authorization/roleAssignments/roleDefinitionId",
          "contains": "8e3af657-a8ff-443c-a75c-2fe8c4bcb635"
        },
        {
          "value": "[subscription().id]",
          "equals": "[field('Microsoft.Authorization/roleAssignments/scope')]"
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }
}
```
*Note: This example pattern audits/denies Owner role (ID: 8e3af657...) at subscription scope.*

### Policy Initiatives

Group related policies into **initiatives** (policy sets):

- **IAM Governance Initiative**: All identity-related audit policies
- **Privileged Access Initiative**: Policies targeting Owner/Admin roles
- **Service Principal Hygiene**: Policies for workload identities

### Key Practices

- Start with **Audit** effect, then move to **Deny** once confident.
- Assign policy initiatives at the **management group** level for org-wide governance.
- Use **exemptions** sparingly and with documented justification.
- Review policy compliance reports in the **Azure Policy dashboard** weekly.

---

## 9. Monitoring & Alerting on Role Changes

### What to Monitor

| Event | Log Source | Why |
|---|---|---|
| Role assignment created/deleted | Azure Activity Log | Detect unauthorized access grants |
| PIM role activation | Entra ID Audit Log | Track privileged access usage |
| Service principal credential added | Entra ID Audit Log | Detect credential stuffing |
| Conditional Access policy changed | Entra ID Audit Log | Detect security policy weakening |
| Custom role definition changed | Azure Activity Log | Detect privilege escalation |
| Break-glass account sign-in | Entra ID Sign-in Log | Emergency access monitoring |

### Log Analytics / Sentinel KQL Queries

**Alert on new Owner role assignments:**

```kql
AzureActivity
| where OperationNameValue == "Microsoft.Authorization/roleAssignments/write"
| where ActivityStatusValue == "Success"
| extend RoleDefinitionId = tostring(parse_json(Properties).roleDefinitionId)
| where RoleDefinitionId contains "8e3af657-a8ff-443c-a75c-2fe8c4bcb635"  // Owner
| project TimeGenerated, Caller, ResourceGroup, SubscriptionId
```

**Alert on service principal credential changes:**

```kql
AuditLogs
| where OperationName in ("Add service principal credentials", "Update application – Certificates and secrets management")
| project TimeGenerated, InitiatedBy, TargetResources, Result
```

**Detect PIM activations outside business hours:**

```kql
AuditLogs
| where LoggedByService == "PIM"
| where OperationName == "Add member to role completed (PIM activation)"
| extend Hour = datetime_part("hour", TimeGenerated)
| where Hour < 7 or Hour > 19  // Outside 7 AM - 7 PM
| project TimeGenerated, InitiatedBy, TargetResources
```

### Alert Configuration

Set up alerts in **Azure Monitor** or **Microsoft Sentinel**:

- **Owner/UA Admin role assigned** → Immediate alert (Severity 1)
- **Custom role modified** → Alert within 15 minutes (Severity 2)
- **Bulk role assignments** (>5 in 10 min) → Immediate alert (Severity 1)
- **PIM activation outside hours** → Alert (Severity 3)
- **Break-glass account used** → Immediate alert + incident (Severity 0)

### Key Practices

- **Send Activity Logs to Log Analytics** — without this, you only have 90 days of retention and no alerting.
- **Send Entra ID audit/sign-in logs to the same workspace** for correlated analysis.
- **Use Microsoft Sentinel** for advanced detection rules and automated response (SOAR).
- Create a **weekly RBAC change report** for security team review.
- **Integrate with ITSM** — auto-create tickets for high-severity RBAC alerts.

---

## 10. Custom Role Design Principles

### When to Create Custom Roles

- No built-in role matches the required permission set
- A built-in role grants **too many** permissions for the use case
- You need to combine permissions from multiple built-in roles into one

### Design Principles

1. **Start from a built-in role** and subtract permissions, rather than starting from zero and adding.
2. **Be explicit** — list every `Action` and `DataAction` explicitly. **Never use wildcards (`*`)** in custom roles.
3. **Use `NotActions`/`NotDataActions`** to exclude specific operations from a broader set.
4. **Scope appropriately** — define `AssignableScopes` to limit where the role can be used.
5. **Version your roles** in source control (Terraform, Bicep, ARM templates).
6. **Document the purpose** of each custom role — who needs it and why.
7. **Use role IDs** (not names) in automation — names can change, IDs don't.

### Template

```json
{
  "Name": "Custom App Deployer",
  "Id": null,
  "IsCustom": true,
  "Description": "Can deploy web apps and manage app settings but cannot modify networking or access keys.",
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/write",
    "Microsoft.Web/sites/restart/action",
    "Microsoft.Web/sites/config/read",
    "Microsoft.Web/sites/config/write",
    "Microsoft.Web/sites/slots/read",
    "Microsoft.Web/sites/slots/write",
    "Microsoft.Web/sites/slots/restart/action",
    "Microsoft.Resources/deployments/*"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/<sub-id>/resourceGroups/<app-rg>"
  ]
}
```

### Governance for Custom Roles

- **Limit who can create custom roles** — only platform/security team.
- **Review custom roles quarterly** — are they still needed? Are permissions still minimal?
- **Track custom role count** — Azure has a limit of **5,000 custom roles per tenant**.
- **Test in dev/staging** before assigning in production.
- **Deprecation process** — mark roles as deprecated in description before deletion.

---

## 11. Tooling Reference

### Microsoft Entra PIM
- **Purpose:** JIT access, eligible role assignments, activation approvals
- **Licensing:** Entra ID P2 or Entra ID Governance
- **Access:** Entra Admin Center → Identity Governance → Privileged Identity Management
- [Documentation](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)

### Access Reviews
- **Purpose:** Periodic recertification of role assignments and group memberships
- **Features:** Auto-remove denied access, multi-stage reviews, guest user reviews
- **Access:** Entra Admin Center → Identity Governance → Access Reviews
- [Documentation](https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview)

### Azure Policy
- **Purpose:** Enforce and audit RBAC governance rules at scale
- **Features:** Built-in IAM policies, custom policy definitions, compliance dashboard
- **Access:** Azure Portal → Policy
- [Documentation](https://learn.microsoft.com/en-us/azure/governance/policy/overview)

### Microsoft Defender for Cloud
- **Purpose:** Security posture management, identity recommendations
- **Relevant features:**
  - "Maximum 3 owners" recommendation
  - "MFA should be enabled for accounts with write permissions"
  - "Deprecated accounts should be removed"
  - Identity security score
- **Access:** Azure Portal → Defender for Cloud → Recommendations
- [Documentation](https://learn.microsoft.com/en-us/azure/defender-for-cloud/recommendations-reference)

### Microsoft Sentinel
- **Purpose:** SIEM/SOAR for security monitoring and automated response
- **RBAC-relevant:** Pre-built analytics rules for identity threats, UEBA for anomalous access
- [Documentation](https://learn.microsoft.com/en-us/azure/sentinel/overview)

### Azure CLI / PowerShell
- **Purpose:** Automation and scripting for role management
- Key commands:
  ```bash
  az role assignment list          # List assignments
  az role assignment create        # Create assignment
  az role definition list          # List role definitions
  az role definition create        # Create custom role
  az ad sp list                    # List service principals
  ```

### Terraform / Bicep
- **Purpose:** Infrastructure-as-Code for RBAC management
- **Benefits:** Version control, PR reviews, drift detection, reproducibility
- **Key resources:**
  - Terraform: `azurerm_role_assignment`, `azurerm_role_definition`
  - Bicep: `Microsoft.Authorization/roleAssignments`, `Microsoft.Authorization/roleDefinitions`

---

## 12. Quick-Reference Checklist

### ✅ Foundations
- [ ] All role assignments go through groups, not individual users
- [ ] Maximum 3 subscription Owners
- [ ] Built-in roles preferred over custom roles
- [ ] Default scope is resource group, not subscription

### ✅ Privileged Access
- [ ] PIM enabled for all privileged roles (Owner, Contributor, UA Admin)
- [ ] PIM activation requires MFA + justification
- [ ] PIM activation requires approval for Owner/UA Admin
- [ ] Activation windows set to 1-4 hours maximum
- [ ] Quarterly access reviews scheduled

### ✅ Service Principals
- [ ] Managed identities used wherever possible
- [ ] Workload Identity Federation for external CI/CD
- [ ] No non-expiring client secrets
- [ ] Credential rotation on 90-day cycle
- [ ] Service principals scoped to resource group level

### ✅ Governance
- [ ] Azure Policy initiative for IAM governance assigned
- [ ] Conditional Access policies for admin roles
- [ ] Break-glass accounts configured and monitored
- [ ] Monthly orphaned assignment cleanup

### ✅ Monitoring
- [ ] Activity Logs sent to Log Analytics
- [ ] Entra ID audit logs sent to Log Analytics
- [ ] Alerts configured for Owner role assignments
- [ ] Alerts for break-glass account usage
- [ ] Weekly RBAC change report generated

---

## 13. Official Microsoft Documentation Links

| Topic | Link |
|---|---|
| Azure RBAC Best Practices | https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices |
| Azure RBAC Overview | https://learn.microsoft.com/en-us/azure/role-based-access-control/overview |
| Built-in Roles | https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles |
| Custom Roles | https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles |
| PIM Overview | https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure |
| PIM for Azure Resources | https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-configure-role-settings |
| Access Reviews | https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview |
| Managed Identities Overview | https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview |
| Workload Identity Federation | https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation |
| Conditional Access | https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview |
| Azure Policy | https://learn.microsoft.com/en-us/azure/governance/policy/overview |
| Defender for Cloud Recommendations | https://learn.microsoft.com/en-us/azure/defender-for-cloud/recommendations-reference |
| Azure Activity Log | https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log |
| Microsoft Sentinel | https://learn.microsoft.com/en-us/azure/sentinel/overview |
| RBAC Limits | https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-rbac-limits |

---

*This guide contains generic best practices only. No real subscription data, principal IDs, or resource names are included. All examples use placeholder values.*

*Contributions welcome via pull request.*
