# Security Review: VBA-Based FX Rate API Integration in Excel

**Date:** March 10, 2026
**Scope:** Excel workbook using VBA macros to call a public (no authentication) FX rate API
**Classification:** Internal Review

---

## Executive Summary

The current approach uses VBA macros within an Excel workbook to fetch foreign exchange rates from a public API endpoint (no API key required). While the absence of embedded credentials eliminates the highest-severity risk, several medium and low-severity concerns remain around transport security, data integrity, and operational reliability.

**Overall Risk Rating: LOW-MEDIUM**

---

## Findings

### Finding 1: No TLS Certificate Validation

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Transport Security |
| **Status** | Open |

**Description:**
VBA HTTP clients (`MSXML2.XMLHTTP` and `WinHttp.WinHttpRequest`) do not validate SSL/TLS certificates by default. This makes the connection susceptible to man-in-the-middle (MITM) attacks where an attacker on the same network could intercept requests and return falsified FX rates.

**Impact:**
If FX rates are used for client invoicing, financial reporting, or payment calculations, manipulated rates could lead to direct financial loss or compliance issues.

**Recommendation:**
- Use `WinHttp.WinHttpRequest.5.1` and enforce TLS 1.2 minimum:
  ```vba
  Dim http As Object
  Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
  http.Option(9) = 2560  ' WinHttpRequestOption_SslErrorIgnoreFlags = 0 (none)
  http.Option(12) = 13   ' Force TLS 1.2+
  ```
- Avoid using `MSXML2.XMLHTTP` which has weaker TLS defaults.

---

### Finding 2: No Response Validation

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Data Integrity |
| **Status** | Open |

**Description:**
VBA code likely parses and writes API response data directly to cells without validating:
- HTTP status code (2xx vs error)
- Response content type (JSON vs error page)
- Data structure and expected fields
- Value reasonableness (e.g., USD/LKR should be ~300, not 0 or 999999)

**Impact:**
A malformed, empty, or unexpected API response could silently populate cells with incorrect data, overwrite valid rates with errors, or leave stale data that appears current.

**Recommendation:**
- Check HTTP status code before parsing: reject anything other than 200
- Validate response is valid JSON with expected fields
- Add boundary checks on FX values (e.g., reject values that deviate >10% from last known rate)
- Write a "last updated" timestamp to a visible cell so users can detect stale data

```vba
If http.Status <> 200 Then
    MsgBox "FX rate fetch failed: HTTP " & http.Status
    Exit Sub
End If
```

---

### Finding 3: Macro Security Habituation

| | |
|---|---|
| **Severity** | Low |
| **Category** | User Security Behaviour |
| **Status** | Open |

**Description:**
The workbook requires users to enable macros to fetch FX rates. This trains users to routinely click "Enable Content" when opening Excel files, reducing their resistance to enabling macros in malicious documents received via email or other channels.

**Impact:**
Increased susceptibility to macro-based malware across the organisation. This is an indirect risk — it doesn't make this specific workbook dangerous, but it weakens overall security posture.

**Recommendation:**
- Migrate to **Power Query** (no macros required) — see Alternative Approaches below
- If VBA must remain, deploy the workbook to a **Trusted Location** via Group Policy so it runs without the macro prompt, keeping users' macro-suspicion intact for other files
- Set organisational macro policy to "Disable macros except in Trusted Locations"

---

### Finding 4: Single Point of Failure — API Dependency

| | |
|---|---|
| **Severity** | Low |
| **Category** | Operational Reliability |
| **Status** | Open |

**Description:**
The workbook depends on a single external API endpoint for FX rate data. Free/public FX APIs are known to:
- Rate-limit or block requests without warning
- Change URL structures or response formats
- Sunset entirely (e.g., exchangeratesapi.io moved to paid-only in 2023)
- Experience downtime with no SLA

**Impact:**
If the API becomes unavailable or changes its response format, the workbook silently fails or produces errors. Users may not realise rates are stale.

**Recommendation:**
- Implement a fallback API source
- Add error handling that clearly alerts users when rates cannot be fetched
- Display the last successful fetch timestamp prominently
- Consider caching the last known good rates locally

---

### Finding 5: Hardcoded API Endpoint

| | |
|---|---|
| **Severity** | Low |
| **Category** | Maintainability / Security |
| **Status** | Open |

**Description:**
The API URL is likely hardcoded in VBA source. If the endpoint is compromised or redirected (e.g., domain expires, DNS hijack), the workbook would fetch data from a malicious source without any user-visible warning.

**Impact:**
Low probability but high impact — a compromised endpoint could serve manipulated FX rates.

**Recommendation:**
- Store the API URL in a named range or configuration sheet so it's visible and auditable
- Pin the expected domain and validate it before making requests
- Log the source URL alongside fetched rates for audit trail

---

## Risk Summary

| # | Finding | Severity | Effort to Fix |
|---|---|---|---|
| 1 | No TLS certificate validation | Medium | Low |
| 2 | No response validation | Medium | Low |
| 3 | Macro security habituation | Low | Medium |
| 4 | Single point of failure | Low | Low |
| 5 | Hardcoded API endpoint | Low | Low |

---

## Alternative Approaches (Recommended)

### Option 1: Power Query (Recommended)

Replace VBA entirely with Power Query, which is built into Excel 2016+ and Microsoft 365.

**Advantages:**
- No macros required — eliminates Finding 3 entirely
- Built-in TLS handling — addresses Finding 1
- Better error handling and refresh UI — addresses Findings 2 and 4
- Credentials (if ever needed) stored in Windows Credential Manager, not the file

**Implementation:**
```
Data tab → Get Data → From Web → Enter API URL
→ Transform as needed → Load to worksheet
```

Refresh can be manual, on file open, or on a timer.

### Option 2: Office Scripts + Power Automate

For Excel Online / Microsoft 365 environments:
- Office Script (TypeScript) calls the API in a sandboxed environment
- Power Automate triggers on schedule and writes results
- Full audit trail via Power Automate run history

### Option 3: Centralised Service (Azure Function / MCP Server)

For organisations with multiple workbooks or teams consuming FX rates:
- Azure Function fetches and caches rates on a schedule
- Excel calls the internal endpoint (or receives data via Power Automate)
- Single source of truth, rate limiting handled centrally, full logging

---

## Conclusion

The current VBA implementation poses **no critical security risks** given the absence of API credentials. However, the medium-severity transport and data integrity findings should be addressed, particularly if FX rates influence financial calculations or client-facing figures.

**Primary recommendation:** Migrate from VBA to **Power Query** — it addresses most findings with minimal effort and no ongoing maintenance burden.

---

*This review covers the security aspects of the VBA-to-API integration pattern. It does not assess the accuracy of the FX rate data source itself or its suitability for specific financial use cases.*
