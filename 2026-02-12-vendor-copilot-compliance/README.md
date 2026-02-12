# Vendor Guide: Leveraging Enterprise Controls for Copilot Studio Compliance

**Target Audience:** System integrators and vendors deploying Copilot Studio solutions to enterprise customers

---

## Overview

As a vendor, you don't need to build compliance from scratch—you can leverage the **customer's existing enterprise controls, policies, and governance frameworks** to ensure your Copilot Studio deployment meets their requirements.

---

## 1) Identity & Access Management

### Leverage Customer's Entra ID (Azure AD)

| What to Use | Description |
|-------------|-------------|
| **Customer's tenant** | Deploy agents within customer's Entra ID tenant |
| **Customer's groups** | Use existing security groups for agent permissions |
| **Customer's MFA** | Rely on customer's Conditional Access policies for MFA |
| **Customer's roles** | Assign Copilot Studio roles via customer's RBAC |

### Key Actions
- Request **tenant ID** and **environment access** from customer IT
- Use **customer's Azure AD groups** for Editor/Viewer assignments
- Ensure your deployment follows customer's **Conditional Access policies**
- Map your Copilot Studio roles to customer's **existing role definitions**

### Questions to Ask Customer IT
1. Which tenant should we deploy to?
2. What security groups should have access?
3. Are there Conditional Access policies we need to comply with?
4. What MFA requirements apply to our service account?

---

## 2) Data Residency & Sovereignty

### Use Customer's Region Settings

| Customer Need | Your Action |
|---------------|-------------|
| EU data only | Deploy to EU Azure regions |
| US data only | Deploy to US Azure regions |
| Multi-region | Configure environments per region |
| Data sovereignty | Respect customer's geo requirements |

### Key Actions
- Confirm **data residency requirements** with customer
- Select appropriate **Azure region** during environment setup
- Enable **EU Data Boundary** if required (for EU customers)
- Document data flow locations in your solution design

### Generator AI Data Movement
- Generative AI features may move data outside the region
- Customer admin can **enable/disable** data movement across geographies
- Confirm customer's preference before enabling generative AI

---

## 3) Data Loss Prevention (DLP)

### Respect Customer's DLP Policies

| DLP Control | How to Leverage |
|-------------|-----------------|
| **Power Platform DLP** | Customer's existing DLP policies apply to Copilot Studio |
| **Connector blocking** | Don't use connectors the customer has blocked |
| **Data policies** | Apply customer's data policies to your environments |

### Key Actions
1. Review customer's **DLP policy** in Power Platform admin center
2. Ensure your agent only uses **allowed connectors**
3. Apply **customer's data policies** to your deployment environment
4. Avoid using **blocked data sources** in knowledge bases

### Common DLP Restrictions
- Blocked: Certain SaaS connectors, personal storage
- Allowed: SharePoint, Teams, approved enterprise connectors
- Monitor: Data classification requirements

---

## 4) Security & Compliance Certifications

### Align with Customer's Requirements

| Customer Certification | Your Compliance Approach |
|------------------------|--------------------------|
| **SOC 2** | Copilot Studio is SOC 2 compliant (use this) |
| **ISO 27001** | Copilot Studio is ISO 27001 certified |
| **HIPAA** | Enable HIPAA compliance mode in environment |
| **FedRAMP** | Deploy to FedRAMP-authorized regions |
| **GDPR** | Enable GDPR settings, respect data residency |
| **PCI DSS** | Use PCI-compliant regions, block card data |

### Key Actions
- Verify which **certifications customer requires**
- Document **Copilot Studio's compliance** with those standards
- Enable **customer-specific compliance modes** if applicable
- Provide **compliance documentation** as evidence

---

## 5) Monitoring & Audit Logging

### Use Customer's Existing Tools

| Tool | Purpose |
|------|---------|
| **Customer's SIEM** | Forward Copilot Studio audit logs to customer's SIEM |
| **Azure Monitor** | Use customer's Log Analytics workspace |
| **Application Insights** | Connect to customer's telemetry infrastructure |
| **Purview** | Integrate with customer's compliance portal |

### Key Actions
1. Configure **audit logs** to export to customer's Log Analytics
2. Set up **Application Insights** in customer's Azure subscription
3. Forward **security events** to customer's SIEM (Splunk, Sentinel, etc.)
4. Enable **Purview integration** for compliance monitoring

### What to Log
- Conversation transcripts (per customer retention policy)
- Agent activities and changes
- User interactions and feedback
- Connector usage and API calls

---

## 6) Governance & ALM

### Follow Customer's ALM Process

| Customer Process | Your Approach |
|------------------|---------------|
| **Environment tiers** | Use dev/test/prod as customer defines |
| **Change management** | Follow customer's approval workflows |
| **Solution deployment** | Use customer's solution import process |
| **Release pipeline** | Integrate with customer's CI/CD |

### Key Actions
- Map your deployment to customer's **environment strategy**
- Use **solutions** for portable, version-controlled deployments
- Follow customer's **change advisory board (CAB)** process
- Implement **gated releases** per customer requirements

### Recommended ALM Flow
```
Development → Test → UAT → Production
     ↓           ↓      ↓        ↓
  Dev env    Test   Customer   Prod
  (vendor)   env    review     env
                          (customer)
```

---

## 7) Customer-Managed Keys (CMK)

### Enable Customer's Encryption Keys

| Scenario | Action |
|----------|--------|
| Customer requires CMK | Enable CMK in their environment |
| Customer provides key | Use customer's key vault |
| Default Microsoft keys | Use if customer doesn't require CMK |

### Key Actions
1. Confirm **CMK requirement** with customer
2. If required, use **customer's Azure Key Vault**
3. Document key **rotation policy** in your runbook
4. Test **key access** before go-live

---

## 8) Secure Integration Patterns

### Respect Customer's Security Architecture

| Customer Control | How to Use |
|------------------|------------|
| **Virtual Networks** | Deploy connectors within customer's VNet |
| **IP Firewall** | Ensure Copilot Studio endpoints are allowlisted |
| **Private endpoints** | Use private links where available |
| **Service tags** | Configure firewall rules using service tags |

### Key Actions
- Provide Copilot Studio **IP ranges** to customer's network team
- Configure **private endpoints** for sensitive connectors
- Use **service tags** for Azure resource access
- Document **network requirements** in solution design

---

## 9) Vendor-Specific Checklist

### Before Deployment

- [ ] Obtain customer's tenant ID and environment access
- [ ] Confirm data residency requirements
- [ ] Review customer's DLP policies
- [ ] Identify relevant Conditional Access policies
- [ ] Determine CMK requirements
- [ ] Map ALM process to customer's standards
- [ ] Document integration requirements

### During Deployment

- [ ] Deploy to customer's specified region
- [ ] Apply customer's data policies
- [ ] Configure audit logs to customer's Log Analytics
- [ ] Set up connectors per DLP allowed list
- [ ] Enable CMK if required
- [ ] Test access with customer's Entra ID

### After Deployment

- [ ] Verify governance controls are active
- [ ] Test failover and disaster recovery
- [ ] Document runbook for customer's operations team
- [ ] Provide compliance evidence documentation
- [ ] Schedule periodic compliance reviews

---

## 10) Documentation to Provide Customer

| Document | Purpose |
|----------|---------|
| **Architecture diagram** | Show data flow and integrations |
| **Compliance matrix** | Map controls to certifications |
| **Security runbook** | Operational security procedures |
| **Incident response plan** | How to handle security events |
| **Data processing agreement** | GDPR/artificial data handling |
| **Penetration test results** | Third-party security validation |

---

## Key Takeaways for Vendors

1. **Don't rebuild compliance** — leverage customer's existing controls
2. **Ask the right questions** — get customer's policy requirements upfront
3. **Integrate with their stack** — use customer's SIEM, monitoring, DLP
4. **Document everything** — provide compliance evidence for audits
5. **Respect their governance** — follow ALM and change management processes
6. **Enable their controls** — CMK, DLP, Conditional Access are their tools

---

## Sources

- https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/sec-gov-intro
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/geo-data-residency
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-certification
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/sec-gov-phase3

---

**Next steps:** Customize this guide with your specific methodology and customer engagement templates.