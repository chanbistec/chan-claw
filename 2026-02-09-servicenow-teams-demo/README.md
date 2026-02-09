# ServiceNow Agent in Copilot Studio — Teams‑First Demo Analysis (Draft)

**Goal:** Present a client‑ready demo plan for a Service Desk team using Microsoft Teams as the primary channel.

---

## Can we do voice agents?
**Yes** — typically via **Teams Phone** or **Azure Communication Services**, using the same backend flows. Voice capability depends on your telephony setup and licensing.

---

## Best‑fit features to demo (Service Desk)

### 1) Ticket lifecycle automation
- Create incidents/requests directly from Teams
- Auto‑classify: category, priority, CI
- Guided data collection with validation
- Update/close tickets with confirmation

### 2) Knowledge deflection
- Surface ServiceNow KB articles
- Provide steps + links
- Auto‑escalate to incident if unresolved

### 3) Status + approvals
- “What’s the status of my ticket?”
- Approve access or software requests
- Notify user on status change

### 4) Context‑aware responses
- Pull user profile + entitlements
- Pre‑fill required fields
- Role‑based answers (end user vs agent)

### 5) Handoff to live agent
- Escalate to human in Teams
- Pass transcript + summary
- Route by category/priority

### 6) Automation via flows
- Trigger Flow Designer / Power Automate
- Common tasks: password reset, account unlock, access requests

---

## Neat demo scenarios (5–7 minutes)

**A) VPN Issue (deflection → incident)**
1) User: “VPN not working”
2) Bot: Troubleshoot + KB
3) Still broken → Create incident (INCxxxx)

**B) Ticket Status**
1) User: “Status of INC0012345”
2) Bot: Status + assignee + ETA

**C) Approval in Teams**
1) Manager: “Approve laptop request”
2) Bot: Approve → ServiceNow updates

**D) Optional Voice**
1) Call bot in Teams Phone
2) Same flow as chat

---

## Architecture (high‑level)
Teams → Copilot Studio → ServiceNow (ITSM) / Flow Designer

---

## What I need to finalize
- ServiceNow scope (ITSM only vs HR/SecOps)
- Identity/SSO setup
- Telephony channel choice for voice
- Client compliance constraints

---

If you want, I can expand this into a full demo script, deck outline, and architecture diagram.
