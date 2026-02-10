# Copilot Studio Challenge — Department Automation Sprint

**Objective:** Create a Teams Copilot agent that automates a daily task for your role.

---

## Challenge Categories

### 1) Information Retrieval Agent
**Goal:** Help users find information quickly.

| Idea | Description |
|------|-------------|
| Policy FAQ Bot | Answer common HR/IT policy questions using knowledge sources |
| Project Status Bot | Query project status from a SharePoint list or Excel |
| Meeting Room Finder | Check availability of meeting rooms (via Outlook integration) |
| Leave Balance Checker | Retrieve leave balances from HR system |

### 2) Request Automation Agent
**Goal:** Streamline request submission and tracking.

| Idea | Description |
|------|-------------|
| IT Ticket Creator | Create ServiceNow/SharePoint tickets from Teams chat |
| Expense Claim Starter | Collect receipt details and draft expense claim |
| Equipment Request | Submit hardware/software requests to procurement |
| Meeting Scheduler | Book meetings with team availability checks |

### 3) Notification & Alert Agent
**Goal:** Proactively notify users of important updates.

| Idea | Description |
|------|-------------|
| Deadline Reminder | Alert team of upcoming deadlines from a task list |
| Price Change Monitor | Notify when specific product prices change |
| Approval Reminder | Remind managers of pending approvals |
| Weather/News Summary | Daily summary of relevant news for the team |

### 4) Knowledge Base Agent
**Goal:** Centralize and surface organizational knowledge.

| Idea | Description |
|------|-------------|
| SOP Search Bot | Search and retrieve standard operating procedures |
| Onboarding Guide | Answer new joiner questions from documentation |
| Troubleshooting Guide | Provide step-by-step fixes for common issues |
| Glossary Bot | Define department-specific acronyms and terms |

### 5) Workflow Assistant Agent
**Goal:** Guide users through multi-step processes.

| Idea | Description |
|------|-------------|
| Onboarding Checklist | Guide new hires through Day 1 tasks |
| Incident Response | Walkthrough of initial incident steps |
| Performance Review Prep | Collect self-review data from employee |
| Event Registration | Register attendees for events with capacity check |

---

## Suggested Challenge Levels

### Beginner (30–45 mins)
- Single topic with 3–5 trigger phrases
- Static responses with variables
- No external integrations

### Intermediate (1–2 hours)
- 2–3 topics with conditional logic
- Knowledge source integration (SharePoint/files)
- Simple Power Automate integration (e.g., send email)

### Advanced (2–4 hours)
- Multi-topic flows with escalation
- Generative answers enabled
- Custom connectors or HTTP requests
- Real data integration (Dataverse, ServiceNow)

---

## Evaluation Criteria (100 Points Total)

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Usefulness** | 25 pts | Solves a real, recurring pain point |
| **Completeness** | 20 pts | Covers main scenarios, handles edge cases |
| **Ease of Use** | 15 pts | Simple triggers, clear language, intuitive flow |
| **Innovation** | 15 pts | Creative solution, novel use of features |
| **Technical Execution** | 15 pts | Proper variable usage, clean logic, error handling |
| **Presentation** | 10 pts | Clear demo, explains value, answers questions |

---

## judging Rubric

### Usefulness (25 pts)
- 25: Critical daily task fully automated
- 20: Frequently used task, saves 5+ min/day
- 15: Useful occasional task
- 10: Nice-to-have, low frequency
- 5: Minimal practical value

### Completeness (20 pts)
- 20: All main scenarios covered, graceful fallback
- 15: Most scenarios covered, minor gaps
- 10: Basic coverage, missing key flows
- 5: Minimal coverage
- 0: Incomplete or non-functional

### Ease of Use (15 pts)
- 15: Natural language, obvious interactions
- 10: Clear flow, minor confusion points
- 5: Requires explanation
- 0: Difficult to use

### Innovation (15 pts)
- 15: Unique approach, leverages multiple features creatively
- 10: Good use of features, some creative elements
- 5: Standard implementation
- 0: Very basic

### Technical Execution (15 pts)
- 15: Clean logic, proper variables, error handling
- 10: Mostly solid, minor issues
- 5: functional but messy
- 0: Broken or unreliable

### Presentation (10 pts)
- 10: Clear, confident, demonstrates value
- 7: Good demo, minor gaps
- 4: Unclear presentation
- 0: Poor or incomplete demo

---

## Winning Categories

| Award | Criteria |
|-------|----------|
| **Best Overall** | Highest total score |
| **Most Useful** | Highest Usefulness score |
| **Best Design** | Highest Ease of Use + Innovation |
| **Best Technical** | Highest Technical Execution score |
| **People's Choice** | Audience vote |

---

## Tips for Participants

1. **Start small** — Automate one task well, not many poorly
2. **Use real data** — Connect to actual SharePoint/lists if possible
3. **Test in Teams** — Real usage reveals issues quickly
4. **Add fallback** — What happens when the bot doesn't understand?
5. **Document triggers** — List the phrases users will say
6. **Keep responses short** — Users don't read walls of text

---

## Resources to Provide

- Copilot Studio documentation links
- Sample templates (if available)
- Power Automate connector list
- Knowledge source setup guide
- Testing checklist

---

## Timeline Suggestion

| Time | Activity |
|------|----------|
| 0:00 | Introduction & goals |
| 0:15 | Demo of a simple agent (live build) |
| 0:30 | Teams hackathon starts |
| 2:30 | Submission deadline |
| 2:45 | Demos & judging |
| 3:30 | Awards & closing |

---

## Sample Prompts for Agent Testing

Use these to test if your agent works correctly:

### General Prompts
- "Help me with [task]"
- "I need to [action]"
- "What's the status of [item]?"
- "Create a new [request]"
- "Show me [information]"

### Specific Examples

| Scenario | User Says | Expected Response |
|----------|-----------|------------------|
| Leave Check | "How many leave days do I have?" | Bot shows leave balance |
| IT Request | "I need help with my laptop" | Bot collects details, creates ticket |
| Policy Question | "What are the remote work policies?" | Bot answers from knowledge base |
| Meeting Book | "Book a meeting room for tomorrow" | Bot checks availability, books |
| Expense Submit | "Submit my travel expense" | Bot collects receipt, starts claim |

---

## 10 Quick Agent Ideas (Pick One)

1. **Lunch Ordering Bot** — Collect lunch orders, send to caterer
2. **Timesheet Reminder** — Remind team to submit timesheets
3. **Birthday Bot** — List upcoming team birthdays
4. **Vendor Contact Finder** — Find contact info for suppliers
5. **Training Request Bot** — Submit training requests to HR
6. **Incident Reporter** — Log incidents with severity selection
7. **Access Request Bot** — Request system access permissions
8. **Daily Standup Collector** — Collect standup updates from team
9. **Feedback Collector** — Gather feedback from customers/users
10. **License Renewal Alert** — Notify before software licenses expire

---

## Example Agent Walkthrough: "IT Help Bot"

### Triggers
- "IT help"
- "I have a technical issue"
- "Report a problem"

### Questions the Bot Asks
1. "What category is this?" (Hardware / Software / Network / Access)
2. "Describe the issue in a few words"
3. "What's your priority?" (High / Medium / Low)
4. "What floor/room are you in?"

### Actions
- Collect details into variables
- Create SharePoint list item via Power Automate
- Reply with ticket number and ETA

### Fallback
- "I didn't catch that. Say 'IT help' to start a new request."

---

## Bonus: Creative Agent Ideas

| Idea | Target Audience | Why It's Useful |
|------|-----------------|----------------|
| **Sprint Retrospective Bot** | Agile Teams | Collect retro items, categorize, summarize |
| **Client Onboarding Bot** | Sales/Success | Guide new clients through setup steps |
| **Compliance Checklist Bot** | Finance/Legal | Walkthrough of compliance requirements |
| **Daily Standup Bot** | Development Teams | Collect updates, post to Teams channel |
| **Invoice Status Bot** | Finance/AP | Check invoice payment status |
| **Training Completion Bot** | HR/L&D | Track course completion, send reminders |

---

**Add your own ideas below:**
- _
- _
- _