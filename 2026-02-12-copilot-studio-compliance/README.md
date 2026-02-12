# Microsoft Copilot Studio Compliance — Summary

**Source:** Microsoft Learn documentation (Feb 2026)

---

## Certifications

| Standard | Scope |
|-----------|-------|
| HIPAA | US Health data |
| HITRUST | Healthcare security |
| FedRAMP | US Government cloud |
| SOC 1/2/3 | Financial controls |
| ISO 27001 | Information security |
| PCI DSS | Payment cards |
| CSA STAR | Cloud security |
| GDPR | EU data protection |
| CCPA | California privacy |
| EU Data Boundary | EU residency |

---

## Data Residency

- Deploy to **any Azure datacenter** globally
- Choose region: US, EU, Asia Pacific, etc.
- **Multi-geo support** for multi-region deployments
- **GDPR compliance** built-in (data within boundaries)

---

## Security Layers

| Layer | Features |
|-------|----------|
| Encryption | AES-256 at rest, TLS in transit, CMK support |
| Access Control | RBAC, MFA, Conditional Access |
| Monitoring | Audit logs, transcripts, feedback |
| Data Masking | Hide sensitive info in conversations |

---

## Governance Controls

- **Tenant-level**: Publishing toggle, knowledge source limits
- **Environment-level**: Data policies, sharing rules
- **Agent-level**: Editor vs Viewer permissions

---

## Key Admin Controls

| Task | Location |
|------|----------|
| Set region | Power Platform admin center → Environments |
| Enable CMK | Environment settings |
| Data policies | Power Platform admin center |
| Sharing rules | Agent settings |

---

## Quick Takeaways

1. Enterprise-grade compliance (HIPAA, FedRAMP, ISO, GDPR)
2. You control where data lives (global Azure regions)
3. Granular governance (tenant → environment → agent)
4. Generative AI controls (publishing, knowledge sources, data movement)
5. Customer-managed encryption keys available

---

**Full doc:** https://github.com/chanbistec/chan-claw/blob/main/2026-02-12-copilot-studio-compliance/README.md