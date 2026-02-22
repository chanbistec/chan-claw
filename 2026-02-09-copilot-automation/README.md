# Copilot Studio + Claude Code + PAC CLI — Automation Catalog (Draft)

**Purpose:** A practical catalog of inputs/artifacts you can feed into automation to generate Copilot Studio agents (topics/AI flows, multi-agent routing, tools, knowledge, etc.).

> **Status:** Draft. Needs validation against your official docs/exports for exact field names and CLI flags.

---

## 1) Agent Metadata / Core
- Name / Display name
- Description
- Locale / default language
- Environment / tenant / solution target
- Owner/maker
- Versioning / publish state (draft vs published)

## 2) Topics / Dialogs (AI Flows)
**Triggers**
- Trigger phrases
- Regex / pattern triggers
- System triggers (greeting, conversation start)
- Channel events

**Flow nodes**
- Message nodes (static text)
- Questions (input collection)
- Conditions (if/else)
- Variable set / update
- Call topic / handoff
- Escalation / transfer

**Variables**
- Name, type, scope
- Defaults + validation rules

## 3) Prompts / Generative AI
- System instructions
- User prompt templates
- Few‑shot examples
- Persona/style guides
- Memory settings (short‑term vs long‑term)
- Guardrails / content policies
- Grounding settings (knowledge sources, confidence thresholds)

## 4) Knowledge / Grounding
- Websites / sitemap sources
- Documents (PDF, DOCX, PPTX)
- SharePoint/OneDrive files
- Dataverse tables
- Refresh cadence
- Access controls
- Fallback behaviors (clarify/escalate/no‑answer)

## 5) Tools / Actions / Connectors
- Power Automate flows (inputs + outputs schema)
- Standard connectors
- Custom connectors (OpenAPI/Swagger)
- Dataverse actions
- HTTP actions (endpoint, method, auth)
- MCP tools (server URL, tool schemas, auth)

## 6) Entities / Slots
- Built‑in entities
- Custom entities (regex, synonyms)
- Slot filling rules (required/optional)
- Validation + reprompt logic

## 7) Guardrails / Policies
- Allowed/disallowed topics
- PII handling
- Restricted actions
- Escalation rules

## 8) Channels
- Channel activation / config
- Channel‑specific greetings
- Channel‑specific formatting rules
- Per‑channel auth

## 9) Multi‑Agent / Orchestration
- Agent registry (IDs + roles)
- Routing rules (intent → agent)
- Delegation + fallback
- Shared knowledge + shared tools

## 10) Telemetry / Analytics
- Logging/diagnostics settings
- Transcript storage rules
- Export settings

---

# Suggested Automation Artifacts
> These are typical surfaces to generate via Claude Code + PAC CLI pipelines.

## A) Solution Packaging
- Export/import solution bundles that include:
  - Topics
  - Entities
  - Flows/skills
  - Connector references
  - Knowledge sources

## B) Definitions / Schemas
- Topic JSON/YAML manifests
- Flow definitions (Power Automate JSON)
- Connector schemas (OpenAPI)
- Environment variable manifest

## C) Config Templates
- Agent metadata template
- Prompt templates
- Routing policy template

---

# Automation Strategy (Recommended)
1) **Template‑driven generation**
   - Create base templates for topics, prompts, flows
2) **Spec → Agent pipeline**
   - Feed requirements → output structured artifacts
3) **Validation / linting**
   - Schema checks + guardrail insertion
4) **CI/CD**
   - PAC CLI import, smoke test, publish

---

# What I Need to Finalize
Provide any of:
- Copilot Studio docs for topics/flows schema
- PAC CLI docs (commands + flags)
- A sample **solution export**
- A sample **topic/flow JSON**

With these, I’ll map each item to exact field names and CLI operations.
