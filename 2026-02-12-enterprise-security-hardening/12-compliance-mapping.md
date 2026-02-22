# Step 12: Compliance Mapping

## Overview

Map Copilot Studio controls to regulatory requirements and compliance frameworks.

## Compliance Framework Mapping

### GDPR (EU)

| Requirement | Copilot Studio Control |
|-------------|----------------------|
| Art. 5 - Data minimization | DLP policies, restricted knowledge sources |
| Art. 6 - Lawful basis | Customer-controlled data residency |
| Art. 7 - Consent | User consent for conversation logging |
| Art. 13/14 - Transparency | Audit logs, data subject access |
| Art. 17 - Right to erasure | Data export/deletion capabilities |
| Art. 32 - Security | Encryption (CMK), access controls |
| Art. 35 - DPIA | Pre-deployment security assessment |

### SOC 2

| Trust Principle | Copilot Studio Control |
|-----------------|----------------------|
| Security | Conditional Access, DLP, monitoring |
| Availability | Azure SLA, redundancy |
| Processing integrity | Testing, validation controls |
| Confidentiality | Encryption, access controls |
| Privacy | Data residency, audit logging |

### HIPAA (US Healthcare)

| Requirement | Control |
|-------------|---------|
| Access Control | RBAC, MFA, Conditional Access |
| Audit Controls | Audit logging, monitoring |
| Integrity | Encryption, backup |
| Transmission Security | TLS, encrypted APIs |
| Contingency Planning | Data backup, recovery |

### ISO 27001

| Control | Implementation |
|---------|----------------|
| A.9 - Access control | Entra ID, RBAC |
| A.10 - Cryptography | CMK, TLS |
| A.12 - Operations security | Monitoring, DLP |
| A.13 - Communications | Network security, VNet |
| A.14 - System acquisition | Security assessment |
| A.16 - Incident management | Alerting, response |

## Compliance Checklist

### Pre-Deployment

| Item | Status | Owner |
|------|--------|-------|
| Data residency configured | ☐ | IT Security |
| DLP policies applied | ☐ | IT Security |
| CMK enabled (if required) | ☐ | IT Security |
| Audit logging configured | ☐ | IT Operations |
| Conditional Access enabled | ☐ | IT Security |
| Knowledge sources restricted | ☐ | IT Security |
| User training completed | ☐ | Training Team |

### Ongoing Compliance

| Item | Frequency | Owner |
|------|-----------|-------|
| Access review | Quarterly | IT Security |
| DLP policy review | Quarterly | IT Security |
| Log review | Weekly | IT Operations |
| Incident response test | Annual | IT Security |
| Penetration test | Annual | IT Security |
| Compliance audit | Annual | Internal Audit |

## Documentation Requirements

### For Audit

| Document | Description |
|----------|-------------|
| System Architecture | Data flow diagram |
| Security Controls | Control inventory |
| Access Matrix | Who has what access |
| Incident Log | Security incidents |
| Change Log | Agent changes |
| Test Results | Validation reports |

### For Data Subject Requests (GDPR)

```powershell
# Export user's conversation data
Export-CopilotStudioTranscript `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -UserEmail "user@company.com" `
  -StartDate "2026-01-01" `
  -EndDate "2026-12-31" `
  -OutputPath "/dsr-export.csv"

# Delete user data (on request)
Remove-CopilotStudioUserData `
  -EnvironmentName "PROD-ENVIRONMENT" `
  -UserEmail "user@company.com" `
  -Confirm $true
```

## Certification Maintenance

### Annual Requirements

| Certification | Requirement | Timeline |
|---------------|-------------|----------|
| SOC 2 | Type II audit | Annual |
| ISO 27001 | Surveillance audit | Annual |
| HIPAA | Risk assessment | Annual |
| GDPR | DPIA review | Annual |

## External Audit Prep

### Evidence to Prepare

| Evidence | Description |
|----------|-------------|
| Environment configuration | Region, settings |
| DLP policy documentation | Allowed/blocked connectors |
| Access logs | User activities |
| Security assessment | Penetration test results |
| Incident reports | Historical incidents |
| Training records | User acknowledgments |

## Compliance Roadmap

| Phase | Focus | Timeline |
|-------|-------|----------|
| Phase 1 | Core security controls | Month 1-2 |
| Phase 2 | DLP and data residency | Month 3 |
| Phase 3 | Monitoring and logging | Month 4 |
| Phase 4 | Documentation and training | Month 5 |
| Phase 5 | Audit and certification | Month 6 |

## Summary: Security Hardening Checklist

| Control | Priority | Status |
|---------|----------|--------|
| MFA for all users | Critical | ☐ |
| Conditional Access | Critical | ☐ |
| DLP policies | High | ☐ |
| Data residency | High | ☐ |
| Audit logging | High | ☐ |
| CMK (if required) | Medium | ☐ |
| Vendor controls | Medium | ☐ |
| Incident response | Medium | ☐ |
| Compliance documentation | Medium | ☐ |

---

## Related Documentation

- [Vendor Compliance Guide](../2026-02-12-vendor-copilot-compliance/README.md)
- [Copilot Studio Compliance Summary](../2026-02-12-copilot-studio-compliance/README.md)
