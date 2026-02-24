# Copilot Studio + MCP Server Authentication & OBO Token Management

> Research document — 2026-02-24
> Scenario: MCP server using On-Behalf-Of (OBO) flow to access OneDrive, where the base token expires

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Copilot Studio Authenticates to Tools](#how-copilot-studio-authenticates-to-tools)
3. [MCP Server Authentication in Copilot Studio](#mcp-server-authentication-in-copilot-studio)
4. [The On-Behalf-Of (OBO) Flow](#the-on-behalf-of-obo-flow)
5. [Token Lifetime & Refresh Behavior](#token-lifetime--refresh-behavior)
6. [Long-Running Sessions](#long-running-sessions)
7. [Known Limitations](#known-limitations)
8. [Practical Recommendations for the OBO Scenario](#practical-recommendations-for-the-obo-scenario)
9. [Sources](#sources)

---

## Architecture Overview

```
┌─────────────────────┐
│     End User         │
│  (Teams / Web / …)  │
└─────────┬───────────┘
          │ 1. User signs in (OAuth2 / SSO)
          ▼
┌─────────────────────┐
│   Copilot Studio    │
│   Agent Runtime     │
│                     │
│  • User.AccessToken │ ◄── Available only with "Authenticate manually"
│  • Generative       │
│    Orchestration    │
└─────────┬───────────┘
          │ 2. Calls MCP server tool
          │    (Streamable HTTP transport)
          │    Auth: OAuth 2.0 / API Key / None
          ▼
┌─────────────────────┐
│   Your MCP Server   │
│                     │
│  Receives token A   │──── 3. OBO exchange ────►┌──────────────────┐
│  (user-delegated)   │                          │ Entra ID /token  │
│                     │◄── Token B (OneDrive) ───│ endpoint         │
│  Calls OneDrive     │                          └──────────────────┘
│  with Token B       │
└─────────┬───────────┘
          │ 4. OneDrive API call
          ▼
┌─────────────────────┐
│   Microsoft Graph   │
│   / OneDrive        │
└─────────────────────┘
```

---

## How Copilot Studio Authenticates to Tools

Copilot Studio provides **three authentication modes** at the agent level:

| Mode | Token Available | Use Case |
|------|----------------|----------|
| **No authentication** | None | Public data only |
| **Authenticate with Microsoft** | User identity (no raw token) | Teams-only, automatic Entra ID |
| **Authenticate manually** | `User.AccessToken` exposed | Custom OAuth2 / Entra ID — needed for OBO |

### Key Points

- **"Authenticate manually"** is the only mode that exposes `User.AccessToken` as a variable in topics and flows. This is required if your MCP server needs a user-delegated token.
- Supported service providers: **Entra ID V2 (federated credentials, certificates, or client secrets)** and **Generic OAuth 2**.
- Copilot Studio **does not store credentials**. When access tokens expire or are revoked, users are re-prompted.
- Two tool-level auth modes:
  - **End user credentials** — the agent uses the signed-in user's identity
  - **Maker-provided credentials** — the agent uses the bot author's credentials (service account pattern)

### Authentication Flow (Manual / Entra ID V2)

```
User ──► Copilot Studio ──► Entra ID authorize endpoint
                                    │
                              User signs in
                                    │
                              Auth code returned
                                    │
         Copilot Studio ◄───────────┘
              │
              ▼
         Exchanges code for access_token + refresh_token
         via token endpoint (https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token)
              │
         Stores tokens in Bot Framework token service
         (token.botframework.com)
              │
         Exposes User.AccessToken in topics
```

---

## MCP Server Authentication in Copilot Studio

MCP servers connect to Copilot Studio via **Streamable HTTP transport** (SSE deprecated after Aug 2025). Authentication is configured at the MCP connector level with three options:

### 1. No Authentication
- MCP server is publicly accessible
- Not suitable for user-specific data

### 2. API Key
- Static key sent as header or query parameter
- Simple but doesn't carry user identity
- **Not suitable for OBO** — no user token to exchange

### 3. OAuth 2.0 (Required for OBO)
Three sub-types:

| Type | How It Works |
|------|-------------|
| **Dynamic Discovery** | Uses OAuth 2.0 DCR with discovery endpoint — auto-configures |
| **Dynamic** | DCR without discovery — you provide auth URL and token URL |
| **Manual** | You provide client ID, client secret, auth URL, token URL, refresh URL, scopes |

**For the OBO scenario, use Manual OAuth 2.0** with:
- **Client ID / Secret**: Your MCP server's app registration
- **Authorization URL**: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- **Token URL**: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- **Refresh URL**: Same as Token URL
- **Scopes**: `api://{mcp-server-app-id}/.default` (or custom scopes exposed by your MCP server)

### How Tokens Flow to the MCP Server

```
┌──────────────┐     OAuth 2.0 token      ┌──────────────┐
│ Copilot      │ ────────────────────────► │ MCP Server   │
│ Studio       │   (Authorization header)  │              │
│ Runtime      │                           │ Validates    │
│              │                           │ token A      │
│              │                           │ (aud = MCP)  │
│              │                           │              │
│              │                           │ Performs OBO │
│              │                           │ exchange for │
│              │                           │ Token B      │
│              │                           │ (aud = Graph)│
└──────────────┘                           └──────────────┘
```

**Important**: The MCP OAuth 2.0 connector handles its own token acquisition separate from the agent-level `User.AccessToken`. There are effectively **two token chains**:

1. **Agent-level auth**: User signs into Copilot Studio → `User.AccessToken` (scoped to agent's app registration)
2. **MCP connector auth**: Per-connection OAuth 2.0 → token sent to MCP server (scoped to MCP server's app registration)

For OBO to work, the token arriving at your MCP server must be a **user-delegated** token with the correct audience.

---

## The On-Behalf-Of (OBO) Flow

### How OBO Works (Entra ID)

```
Token A (user-delegated, aud = MCP server app)
         │
         ▼
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token

  grant_type    = urn:ietf:params:oauth:grant-type:jwt-bearer
  client_id     = {mcp-server-client-id}
  client_secret = {mcp-server-client-secret}
  assertion     = {token-A}
  scope         = https://graph.microsoft.com/Files.ReadWrite.All offline_access
  requested_token_use = on_behalf_of

         │
         ▼
Token B (user-delegated, aud = https://graph.microsoft.com)
  + refresh_token (if offline_access scope requested)
```

### Critical OBO Constraints

| Constraint | Impact |
|-----------|--------|
| OBO only works with **user-delegated** tokens | App-only / service principal tokens cannot be used |
| Token A must have `aud` matching the MCP server's app ID | Misconfigured audience = immediate failure |
| `offline_access` scope required for refresh tokens | Without it, you get no refresh token from OBO |
| Downstream consent must be pre-granted | Admin consent for Graph scopes on the MCP app registration |
| Custom signing keys not supported for middle-tier | Don't use custom signing keys on the MCP app registration |

### OBO Token Refresh

When requesting OBO, include `offline_access` in the scope. The response includes a `refresh_token`. Your MCP server can then refresh Token B without needing a new Token A:

```
POST /oauth2/v2.0/token

  grant_type    = refresh_token
  client_id     = {mcp-server-client-id}
  client_secret = {mcp-server-client-secret}
  refresh_token = {refresh-token-from-obo}
  scope         = https://graph.microsoft.com/Files.ReadWrite.All offline_access
```

---

## Token Lifetime & Refresh Behavior

### Default Token Lifetimes (Entra ID)

| Token Type | Default Lifetime | Configurable? |
|-----------|-----------------|---------------|
| Access token | 60–90 min (random, ~75 min avg) | Yes (10 min – 1 day, requires P1) |
| ID token | 1 hour | Yes |
| Refresh token (inactive) | 90 days | No (fixed since Jan 2021) |
| Refresh token (max age) | Until revoked | No (fixed) |
| CAE-capable access token | Up to 28 hours | Limited |

### What Happens When Tokens Expire

**Agent-level token (User.AccessToken):**
- Copilot Studio uses the Bot Framework Token Service which handles refresh automatically via stored refresh tokens
- When refresh fails (revoked, expired refresh token), the user is **re-prompted to sign in**
- The `User.AccessToken` variable is updated on successful re-auth

**MCP connector OAuth token:**
- The Power Platform connector infrastructure manages the OAuth connection
- Connections store refresh tokens and auto-refresh access tokens
- If refresh fails, the user sees a "connection broken" state and must re-authenticate the connection

**OBO Token B (your MCP server's responsibility):**
- Copilot Studio and the connector infrastructure have **no visibility** into Token B
- Your MCP server is entirely responsible for:
  - Caching Token B
  - Refreshing Token B using the refresh token from OBO
  - Handling failures and propagating errors

### Token Expiration Timeline

```
t=0min     User signs in, Copilot Studio gets access_token + refresh_token
           MCP call → Token A sent → OBO → Token B obtained
           
t=60-90min Token A expires (access token)
           Token B also likely expired
           
           Next MCP call:
           ├─ Connector auto-refreshes Token A using refresh_token ✓
           └─ MCP server must refresh Token B independently
           
t=~24hrs   Conditional Access may require re-auth
           
t=90 days  Refresh token expires if unused
           User must fully re-authenticate
```

---

## Long-Running Sessions

### Copilot Studio Session Behavior

- Copilot Studio conversations can span **hours or days** (user returns to the same conversation)
- The Bot Framework Token Service manages refresh tokens for agent-level auth
- Tokens are refreshed **transparently** as long as the refresh token is valid
- Sessions in Teams benefit from SSO — the user rarely needs to explicitly re-auth

### Challenges for OBO in Long Sessions

1. **Token A refresh is handled by the platform** — the connector refreshes it automatically
2. **Token B refresh is YOUR responsibility** — the MCP server must:
   - Store the OBO refresh token (securely, e.g., in-memory cache or encrypted store)
   - Proactively refresh Token B before expiry
   - Handle `interaction_required` errors from Conditional Access

3. **Conditional Access step-up**: If the downstream resource (Graph/OneDrive) requires MFA step-up or device compliance, the OBO exchange returns `interaction_required`. Your MCP server must surface this as an error to Copilot Studio, which cannot handle interactive re-auth mid-flow.

---

## Known Limitations

### Copilot Studio Limitations
1. **`User.AccessToken` is only available with "Authenticate manually"** — not with "Authenticate with Microsoft"
2. **No built-in OBO support** — Copilot Studio doesn't perform OBO exchanges; your MCP server must do this
3. **SSO not supported** on all channels (no support for Facebook, Demo Website, Mobile App, Azure Bot Service channels)
4. **Max 128 tools** per agent (recommended ≤25-30 for performance)
5. **MCP only supports Streamable HTTP transport** — no stdio, no SSE (deprecated)
6. **Tool auth is always in user context** — tools cannot run without authentication enabled

### OBO Limitations
1. **No app-only OBO** — OBO requires a user-delegated token; service principal tokens cannot be used
2. **Custom signing keys on middle-tier break OBO**
3. **Conditional Access interaction_required cannot be resolved** inside an MCP tool call — the user must re-authenticate at the Copilot Studio level
4. **Token B cache management** — no built-in distributed cache; you must implement this in your MCP server
5. **Refresh token storage** — OBO refresh tokens must be securely stored server-side; if lost, a new Token A is needed to restart the OBO chain

### MCP-Specific Auth Limitations
1. MCP OAuth 2.0 creates a **Power Platform connection** — the user manages this connection separately from agent auth
2. There can be **two sign-in prompts**: one for the agent (if manual auth required) and one for the MCP connection
3. MCP connector doesn't natively pass `User.AccessToken` — it has its own OAuth flow

---

## Practical Recommendations for the OBO Scenario

### Architecture Recommendation

```
┌──────────────┐                    ┌──────────────────────────────┐
│ Copilot      │  OAuth 2.0 token   │        MCP Server            │
│ Studio       │ ──────────────────►│                              │
│              │  (Token A:         │  1. Validate Token A         │
│ Auth: Manual │   aud=MCP app)     │  2. Check token cache        │
│ MCP: OAuth   │                    │     └─ Cache hit? Use Token B│
│              │                    │     └─ Cache miss? OBO       │
│              │                    │  3. OBO exchange:            │
│              │                    │     scope: Files.ReadWrite   │
│              │                    │            offline_access    │
│              │                    │  4. Cache Token B +          │
│              │                    │     refresh_token            │
│              │                    │  5. Call OneDrive API        │
│              │                    │  6. Return result            │
│              │◄───────────────────│                              │
└──────────────┘                    └──────────────────────────────┘
```

### Step-by-Step Implementation

#### 1. App Registrations (Entra ID)

**MCP Server App Registration:**
```
Display Name: MCP-OneDrive-Server
Supported account types: Single tenant
Redirect URI: (callback URL from Copilot Studio MCP wizard)

API Permissions (Delegated):
  - Microsoft Graph → Files.ReadWrite.All
  - Microsoft Graph → offline_access
  - Microsoft Graph → openid, profile

Expose an API:
  - Application ID URI: api://{client-id}
  - Scope: api://{client-id}/access_as_user
    (Admin + user consent)

Certificates & secrets:
  - Client secret (or certificate for production)
```

**Grant admin consent** for Graph permissions on the MCP app registration.

#### 2. Configure Copilot Studio

1. **Agent Authentication**: Set to "Authenticate manually" with Entra ID V2
   - Scopes: `openid profile api://{mcp-app-id}/access_as_user`
   
2. **MCP Server Connection**: Add via MCP wizard
   - Auth type: OAuth 2.0 → Manual
   - Client ID: `{mcp-app-client-id}`
   - Client Secret: `{mcp-app-client-secret}`
   - Auth URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
   - Token URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
   - Refresh URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
   - Scopes: `api://{mcp-app-id}/access_as_user offline_access`

#### 3. MCP Server Token Management (Pseudocode)

```python
from msal import ConfidentialClientApplication
import time

# MSAL client for OBO
msal_app = ConfidentialClientApplication(
    client_id=MCP_CLIENT_ID,
    client_credential=MCP_CLIENT_SECRET,
    authority=f"https://login.microsoftonline.com/{TENANT_ID}"
)

# In-memory cache keyed by user OID
obo_token_cache = {}  # production: use Redis/encrypted store

def get_onedrive_token(incoming_token: str, user_oid: str) -> str:
    """Get a OneDrive token via OBO, with caching and refresh."""
    
    cached = obo_token_cache.get(user_oid)
    
    # Check if cached token is still valid (with 5-min buffer)
    if cached and cached["expires_at"] > time.time() + 300:
        return cached["access_token"]
    
    # Try refresh if we have a refresh token
    if cached and cached.get("refresh_token"):
        result = msal_app.acquire_token_by_refresh_token(
            cached["refresh_token"],
            scopes=["https://graph.microsoft.com/Files.ReadWrite.All"]
        )
        if "access_token" in result:
            obo_token_cache[user_oid] = {
                "access_token": result["access_token"],
                "refresh_token": result.get("refresh_token", cached["refresh_token"]),
                "expires_at": time.time() + result["expires_in"]
            }
            return result["access_token"]
    
    # Fresh OBO exchange
    result = msal_app.acquire_token_on_behalf_of(
        user_assertion=incoming_token,
        scopes=["https://graph.microsoft.com/Files.ReadWrite.All", "offline_access"]
    )
    
    if "access_token" in result:
        obo_token_cache[user_oid] = {
            "access_token": result["access_token"],
            "refresh_token": result.get("refresh_token"),
            "expires_at": time.time() + result["expires_in"]
        }
        return result["access_token"]
    
    # Handle interaction_required
    if result.get("error") == "interaction_required":
        raise Exception(
            "User must re-authenticate. "
            "Conditional Access requires interactive sign-in."
        )
    
    raise Exception(f"OBO failed: {result.get('error_description')}")
```

#### 4. Handle Token Expiration Gracefully

```python
# In your MCP tool handler
async def handle_list_files(params, token):
    try:
        onedrive_token = get_onedrive_token(token, extract_oid(token))
        files = await call_graph_api("/me/drive/root/children", onedrive_token)
        return files
    except Exception as e:
        if "interaction_required" in str(e):
            # Return a user-friendly error that Copilot Studio can show
            return {
                "error": "auth_required",
                "message": "Your session has expired. Please sign out and sign back in to continue accessing your files."
            }
        raise
```

#### 5. Key Best Practices

| Practice | Why |
|----------|-----|
| **Always request `offline_access`** in OBO scope | Gets you a refresh token so Token B can be refreshed independently |
| **Cache OBO tokens by user OID** | Avoid redundant OBO exchanges; respect rate limits |
| **Refresh proactively** (5-min buffer before expiry) | Prevent mid-request failures |
| **Use MSAL library** (not raw HTTP) | Handles token caching, refresh, and retry automatically |
| **Pre-grant admin consent** for Graph scopes | Users won't get consent prompts during OBO |
| **Handle `interaction_required`** gracefully | Return clear error message so the user knows to re-auth |
| **Store refresh tokens securely** | Use encrypted storage (Azure Key Vault, encrypted Redis) |
| **Use federated credentials** for Copilot Studio auth | Microsoft's recommended approach (secret-less) |
| **Log OBO failures** with correlation IDs | Essential for debugging token chain issues |

#### 6. Alternative: Skip OBO, Use Application Permissions

If per-user delegation isn't strictly required, consider using **application permissions** instead of OBO:

```
MCP Server uses client_credentials grant
  → App-level Graph token (Files.Read.All application permission)
  → Access any user's OneDrive (admin-consented)
```

**Pros**: No token chain, no expiry issues, simpler architecture
**Cons**: No per-user scoping (security concern), requires admin consent for broad permissions

---

## Sources

- [Configure user authentication - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configuration-end-user-authentication)
- [Configure user authentication with Entra ID - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configuration-authentication-azure-ad)
- [Add user authentication to topics - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-end-user-authentication)
- [Configure SSO with Entra ID - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-sso)
- [Configure user authentication for actions - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-enduser-authentication)
- [Add tools to custom agents - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent)
- [Extend agent with MCP - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)
- [Connect agent to MCP server - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [Create MCP server - Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-create-new-server)
- [OAuth 2.0 On-Behalf-Of flow - Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Configurable token lifetimes - Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes)
- [Copilot Studio ❤️ MCP - Power Platform Blog](https://devblogs.microsoft.com/powerplatform/microsoft-copilot-studio-mcp/)
