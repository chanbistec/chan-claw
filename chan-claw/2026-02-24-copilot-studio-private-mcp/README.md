# Exposing an Azure App Service as a Private MCP Server for Microsoft Copilot Studio

> **Date:** 2026-02-24  
> **Status:** Research document — covers what works today, what's in preview, and known limitations  
> **Last verified against:** Microsoft Learn docs as of February 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [How Copilot Studio Connects to MCP Servers](#how-copilot-studio-connects-to-mcp-servers)
3. [Network Isolation Approaches](#network-isolation-approaches)
4. [Authentication & Authorization](#authentication--authorization)
5. [Copilot Studio Outbound IP Ranges](#copilot-studio-outbound-ip-ranges)
6. [Private Connectivity — Can Copilot Studio Reach Private Endpoints?](#private-connectivity)
7. [Power Platform Connector Architecture](#power-platform-connector-architecture)
8. [API Management as a Gateway](#api-management-as-a-gateway)
9. [Architecture Patterns](#architecture-patterns)
10. [Step-by-Step Configuration](#step-by-step-configuration)
11. [Known Limitations](#known-limitations)
12. [Recommendations](#recommendations)
13. [References](#references)

---

## Executive Summary

**The core challenge:** Copilot Studio is a SaaS service that makes outbound HTTP calls to your MCP server. You want to restrict access so *only* Copilot Studio can reach it — not the public internet.

**The hard truth:** Copilot Studio (as of February 2026) **cannot natively connect to Azure Private Endpoints** for MCP servers. MCP connections go through the Power Platform connector infrastructure, which routes traffic over the public internet. However, there are multiple layered approaches to achieve near-private security.

**Recommended pattern:** App Service with IP-restricted access (using `AzureConnectors` service tags) + Entra ID OAuth 2.0 authentication + optional APIM gateway for additional policy enforcement.

---

## How Copilot Studio Connects to MCP Servers

Copilot Studio uses the **Model Context Protocol (MCP)** with the **Streamable HTTP transport** (SSE transport deprecated after August 2025). The connection architecture:

```
┌─────────────────────┐     HTTPS (443)      ┌──────────────────────┐
│  Copilot Studio     │ ──────────────────►   │  Your MCP Server     │
│  (SaaS, managed)    │                       │  (Azure App Service) │
│                     │  Uses Power Platform  │                      │
│  ┌───────────────┐  │  connector infra      │  POST /mcp           │
│  │ Custom        │  │  (AzureConnectors     │  x-ms-agentic-       │
│  │ Connector     │  │   service tag IPs)    │  protocol: mcp-      │
│  └───────────────┘  │                       │  streamable-1.0      │
└─────────────────────┘                       └──────────────────────┘
```

Key points:
- MCP servers are connected via **custom connectors** (Power Platform)
- Copilot Studio supports **API key** and **OAuth 2.0** authentication for MCP
- The MCP server URL must be **reachable over HTTPS from the internet** (from the connector infrastructure's perspective)
- Copilot Studio dynamically discovers tools/resources from the MCP server

---

## Network Isolation Approaches

### Option A: App Service Access Restrictions with Service Tags (✅ Recommended)

Azure App Service supports **access restrictions** that can use Azure Service Tags. This is the primary network-level control available today.

```
┌──────────────────────────┐
│  Azure App Service       │
│  ┌────────────────────┐  │
│  │ Access Restrictions │  │
│  │                    │  │
│  │ ALLOW:             │  │
│  │  • AzureConnectors │  │
│  │    (your region)   │  │
│  │  • Your admin IPs  │  │
│  │                    │  │
│  │ DENY: all others   │  │
│  └────────────────────┘  │
│                          │
│  MCP Server App          │
└──────────────────────────┘
```

**Service tags to allow:**
- `AzureConnectors.<YourRegion>` — covers managed/custom connector outbound IPs
- `PowerPlatformPlex.<YourRegion>` — covers Dataverse sandbox plug-in traffic
- Optionally: specific regional `AzureConnectors` tags for your Power Platform geo

**Limitation:** The `AzureConnectors` service tag includes IPs used by *all* Power Platform tenants in that region, not just yours. This provides network-level isolation from the general internet but not tenant-level isolation. Authentication is required for tenant-level security.

### Option B: Private Endpoints on App Service (⚠️ Not Directly Supported)

You can put a Private Endpoint on App Service, making it unreachable from the public internet. **However, Copilot Studio's connector infrastructure cannot reach private endpoints today** unless you use Power Platform VNet support (see below).

### Option C: Power Platform Virtual Network Support (🔄 Partial Support)

Power Platform supports **Azure VNet integration via subnet delegation**. This allows certain Power Platform services to make outbound calls through your VNet, enabling access to private endpoint-protected resources.

**Supported for MCP?** — **Custom connectors are supported** for VNet integration (GA). This means:

1. You delegate a subnet to Power Platform
2. Power Platform connector traffic routes through your VNet
3. Your App Service with a private endpoint becomes reachable

```
┌─────────────────────────────────────────────────────┐
│  Your Azure VNet                                     │
│                                                      │
│  ┌─────────────────┐     ┌────────────────────────┐ │
│  │ Delegated Subnet│     │ App Service            │ │
│  │ (Power Platform)│────►│ (Private Endpoint only) │ │
│  │                 │     │ MCP Server              │ │
│  └─────────────────┘     └────────────────────────┘ │
│                                                      │
│  Enterprise Policy links PP environment to VNet      │
└─────────────────────────────────────────────────────┘
         ▲
         │ Subnet delegation
┌────────┴────────────┐
│ Copilot Studio      │
│ (Power Platform     │
│  environment)       │
└─────────────────────┘
```

**Important caveats:**
- This requires **Managed Environment** and **Enterprise Policy** setup
- Custom connectors ARE in the supported services list for VNet support
- You need a sufficiently sized subnet (25–30 IPs per production environment)
- Once enabled, ALL outbound traffic from that environment goes through the VNet — you must ensure other dependencies are still reachable
- Available in specific Azure regions only (see [Supported Regions](#references))

### Option D: VNet Integration on App Service (Outbound Only)

App Service VNet Integration is for *outbound* traffic from the app. It doesn't restrict *inbound* access. Not useful for this scenario on its own.

---

## Authentication & Authorization

Network restrictions alone are insufficient because service tags are shared across tenants. You **must** layer authentication.

### Option 1: OAuth 2.0 with Microsoft Entra ID (✅ Strongly Recommended)

This is the gold standard. Register your MCP server as an Entra ID application and configure Copilot Studio to authenticate via OAuth 2.0.

**How it works:**
1. Register an app in Entra ID for your MCP server
2. Configure App Service with Entra ID authentication (Easy Auth)
3. Create a second app registration (or use the same) for the Copilot Studio client
4. Configure the MCP connection in Copilot Studio with OAuth 2.0 (Manual type):
   - Client ID and Client Secret from the client app registration
   - Authorization URL: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
   - Token URL: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
   - Scope: `api://{server-app-id}/.default`

**Tenant-level isolation:** Configure the server app registration to accept tokens only from your tenant. This ensures only authenticated clients within YOUR Entra ID tenant can call the MCP server.

**Additional hardening:**
- Use `appRoles` to require a specific role assignment
- Use Conditional Access policies
- Validate the `azp` (authorized party) claim in tokens to restrict to specific client app IDs

### Option 2: API Key Authentication (✅ Simple, Less Secure)

Copilot Studio supports API key auth for MCP connections. The key is sent as an HTTP header or query parameter.

**Pros:** Simple to implement  
**Cons:** Key rotation is manual, no identity-based audit trail, key can leak

**Implementation:**
1. Generate a strong API key
2. Validate it in your App Service middleware
3. Configure the MCP connection in Copilot Studio with API Key auth (Header type)

### Option 3: Managed Identity (⚠️ Not Directly Applicable)

Copilot Studio agents don't have a managed identity that can be used for MCP server calls. Managed identity is relevant for App Service → downstream Azure resource calls, not for the Copilot Studio → App Service direction.

---

## Copilot Studio Outbound IP Ranges

### Are They Published?

**Yes, indirectly.** Copilot Studio uses the Power Platform connector infrastructure. Outbound IPs are published via Azure Service Tags:

| Service Tag | Purpose |
|---|---|
| `AzureConnectors` | Managed and custom connector outbound IPs |
| `AzureConnectors.<Region>` | Region-specific connector IPs |
| `PowerPlatformPlex` | Dataverse sandbox plug-in outbound IPs |

### How to Get Current IPs

Download the JSON files:
- **Public Cloud:** https://www.microsoft.com/download/details.aspx?id=56519
- **US Government:** https://www.microsoft.com/download/details.aspx?id=57063

Or use the **Service Tag Discovery API** programmatically:
```bash
# Example: Get AzureConnectors.WestEurope IPs
az network list-service-tags --location westeurope \
  --query "values[?name=='AzureConnectors.WestEurope'].properties.addressPrefixes"
```

### Can You Whitelist Copilot Studio Specifically?

**No.** There is no dedicated service tag for Copilot Studio alone. The `AzureConnectors` tag covers all Power Platform connector traffic across all tenants in a region. You cannot distinguish Copilot Studio traffic from Power Automate or Power Apps connector traffic at the IP level.

**This is why authentication is essential** — IP whitelisting provides defense-in-depth but not tenant isolation.

### IP Update Frequency

Microsoft recommends updating your allow-listed IPs **at least every 90 days**. IPs can change as Azure scales.

---

## Private Connectivity

### Can Copilot Studio Connect to a Private Endpoint?

| Scenario | Supported? |
|---|---|
| MCP server on public endpoint with IP restrictions | ✅ Yes (recommended) |
| MCP server on private endpoint, no VNet support | ❌ No |
| MCP server on private endpoint, with Power Platform VNet support | ✅ Yes (custom connectors are GA for VNet support) |
| MCP server behind VPN/ExpressRoute only | ❌ No (without VNet support) |

### Does Copilot Studio Support VNet Injection?

Copilot Studio itself is a SaaS service — it doesn't deploy into your VNet. However, the **Power Platform VNet support feature** (using Azure subnet delegation) enables the connector runtime to route through your VNet. This is the closest thing to "VNet injection" available.

### Power Platform VNet Support Requirements

- **Licensing:** Managed Environments (included with Power Platform premium licenses)
- **Setup:** Create an Enterprise Policy, delegate a subnet, link to your PP environment
- **Subnet sizing:** ~25–30 IPs per production environment
- **Region support:** Must match your Power Platform environment's region ([see supported regions](https://learn.microsoft.com/en-us/power-platform/admin/vnet-support-overview#supported-regions))

---

## Power Platform Connector Architecture

### How Custom Connectors Route Traffic

```
┌─────────────────┐    ┌────────────────────┐    ┌──────────────┐
│ Copilot Studio  │───►│ Connector Runtime   │───►│ Your MCP     │
│ Agent           │    │ (Azure managed)     │    │ Server       │
│                 │    │                     │    │              │
│ Uses custom     │    │ Outbound IP from    │    │ App Service  │
│ connector def   │    │ AzureConnectors tag │    │              │
└─────────────────┘    └────────────────────┘    └──────────────┘
                              │
                              │ With VNet support:
                              ▼
                       ┌────────────────────┐
                       │ Delegated Subnet   │───► Private Endpoint
                       │ (your VNet)        │
                       └────────────────────┘
```

- **Without VNet support:** Traffic exits from shared `AzureConnectors` IPs over the public internet
- **With VNet support:** Traffic routes through your delegated subnet, enabling private endpoint access
- Custom connectors use an **OpenAPI (Swagger) definition** — for MCP, the schema includes the `x-ms-agentic-protocol: mcp-streamable-1.0` extension

### Private Endpoint Support for Connectors

Custom connectors support VNet routing (GA). This means if you enable Power Platform VNet support, your MCP custom connector traffic CAN reach private endpoints.

---

## API Management as a Gateway

Adding Azure API Management (APIM) in front of your App Service provides additional security controls.

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Copilot Studio  │───►│ APIM             │───►│ App Service      │
│                 │    │ (public or       │    │ (private or      │
│                 │    │  internal VNet)  │    │  access-restricted│
│                 │    │                  │    │  to APIM only)   │
│                 │    │ Policies:        │    │                  │
│                 │    │ • Rate limiting  │    │ MCP Server       │
│                 │    │ • IP filtering   │    │                  │
│                 │    │ • JWT validation │    │                  │
│                 │    │ • Header checks  │    │                  │
│                 │    │ • Logging        │    │                  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

### What APIM Adds

| Capability | Benefit |
|---|---|
| **IP filtering policy** | Restrict to `AzureConnectors` IPs at the APIM level |
| **JWT validation policy** | Validate Entra ID tokens, check claims (tenant, app ID, roles) |
| **Rate limiting** | Protect against abuse |
| **Request/response transformation** | Add headers, strip sensitive data |
| **Logging & monitoring** | Full audit trail via Application Insights |
| **Subscription keys** | Additional layer of API key auth |
| **Internal VNet mode** | APIM itself can be internal, fronted by Application Gateway |

### APIM Configuration (Consumption Tier or Higher)

```xml
<!-- Inbound policy: validate JWT + restrict IPs -->
<inbound>
    <ip-filter action="allow">
        <address-range from="..." to="..." />
        <!-- Add AzureConnectors IPs for your region -->
    </ip-filter>
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
        <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
        <required-claims>
            <claim name="aud" match="all">
                <value>{your-api-app-id}</value>
            </claim>
        </required-claims>
    </validate-jwt>
    <rate-limit calls="100" renewal-period="60" />
</inbound>
```

### When to Use APIM

- You need granular policy control beyond what App Service Easy Auth provides
- You want centralized API governance across multiple backends
- You need detailed analytics and logging
- You're already using APIM in your organization

### When APIM Is Overkill

- Single MCP server with simple auth requirements
- Cost sensitivity (APIM adds ~$50-500+/month depending on tier)
- App Service access restrictions + Entra ID auth already meet your needs

---

## Architecture Patterns

### Pattern 1: Simple & Effective (✅ Recommended for Most Cases)

```
┌─────────────────┐                        ┌──────────────────────────┐
│ Copilot Studio  │──── HTTPS (443) ──────►│ Azure App Service        │
│                 │                         │                          │
│ OAuth 2.0 auth  │                         │ ✓ Access restrictions:   │
│ (Entra ID)      │                         │   AzureConnectors tag    │
│                 │                         │ ✓ Easy Auth (Entra ID)   │
│                 │                         │ ✓ MCP Server app         │
└─────────────────┘                         └──────────────────────────┘
```

**Security layers:**
1. Network: Only `AzureConnectors` IPs can reach the App Service
2. Identity: Only authenticated clients with valid Entra ID tokens accepted
3. Tenant: Token validation restricted to your Entra ID tenant
4. App: Optional app role requirement

### Pattern 2: Full Private with VNet Support (🔒 Maximum Security)

```
┌─────────────────┐    ┌────────────────┐    ┌──────────────────────┐
│ Copilot Studio  │───►│ PP VNet        │───►│ App Service           │
│                 │    │ (delegated     │    │ (Private Endpoint)    │
│ PP Environment  │    │  subnet)       │    │                       │
│ with VNet       │    │                │    │ ✓ No public access    │
│ support enabled │    └────────────────┘    │ ✓ Easy Auth           │
│                 │          │               │ ✓ MCP Server app      │
│ OAuth 2.0 auth  │          │ VNet          └──────────────────────┘
└─────────────────┘          │
                    ┌────────┴───────────┐
                    │   Your Azure VNet   │
                    └────────────────────┘
```

**Security layers:**
1. Network: Private endpoint — zero public internet exposure
2. VNet: All traffic stays within your Azure VNet
3. Identity: Entra ID OAuth 2.0
4. Tenant: Token restricted to your tenant

### Pattern 3: APIM Gateway (🏢 Enterprise)

```
┌─────────────────┐         ┌────────────┐         ┌──────────────┐
│ Copilot Studio  │────────►│ APIM       │────────►│ App Service  │
│                 │         │ (external) │         │ (restricted  │
│ OAuth 2.0 +     │         │            │         │  to APIM     │
│ subscription key│         │ Validates: │         │  subnet)     │
│                 │         │ • JWT      │         │              │
│                 │         │ • IP       │         │ MCP Server   │
│                 │         │ • Rate     │         │              │
└─────────────────┘         └────────────┘         └──────────────┘
```

---

## Step-by-Step Configuration

### Pattern 1: App Service + Access Restrictions + Entra ID Auth

#### Step 1: Deploy Your MCP Server to App Service

```bash
# Create App Service
az webapp create \
  --resource-group myRG \
  --plan myPlan \
  --name my-mcp-server \
  --runtime "NODE:20-lts"

# Deploy your MCP server code (Streamable HTTP transport)
az webapp deploy --resource-group myRG --name my-mcp-server --src-path ./mcp-server.zip
```

#### Step 2: Register App in Entra ID

```bash
# Register the MCP server app
az ad app create \
  --display-name "MCP Server" \
  --sign-in-audience AzureADMyOrg \
  --identifier-uris "api://my-mcp-server"

# Note the Application (client) ID → {SERVER_APP_ID}

# Register the Copilot Studio client app
az ad app create \
  --display-name "Copilot Studio MCP Client" \
  --sign-in-audience AzureADMyOrg

# Create a client secret
az ad app credential reset --id {CLIENT_APP_ID} --append

# Note: Client ID → {CLIENT_APP_ID}, Secret → {CLIENT_SECRET}

# Grant the client app permission to the server app
az ad app permission add \
  --id {CLIENT_APP_ID} \
  --api {SERVER_APP_ID} \
  --api-permissions {SCOPE_ID}=Scope
```

#### Step 3: Enable Easy Auth on App Service

```bash
az webapp auth update \
  --resource-group myRG \
  --name my-mcp-server \
  --enabled true \
  --action LoginWithAzureActiveDirectory \
  --aad-client-id {SERVER_APP_ID} \
  --aad-token-issuer-url "https://login.microsoftonline.com/{TENANT_ID}/v2.0"
```

#### Step 4: Configure Access Restrictions

```bash
# Allow AzureConnectors service tag for your region
az webapp config access-restriction add \
  --resource-group myRG \
  --name my-mcp-server \
  --priority 100 \
  --service-tag AzureConnectors \
  --action Allow

# Allow your admin IP for management
az webapp config access-restriction add \
  --resource-group myRG \
  --name my-mcp-server \
  --priority 200 \
  --ip-address "YOUR.ADMIN.IP/32" \
  --action Allow

# Default deny is automatic when rules are added
```

#### Step 5: Connect MCP Server in Copilot Studio

1. Open Copilot Studio → Your Agent → **Tools** → **Add a tool**
2. Select **New tool** → **Model Context Protocol**
3. Fill in:
   - **Server name:** My MCP Server
   - **Server description:** Provides [your tools description]
   - **Server URL:** `https://my-mcp-server.azurewebsites.net/mcp`
4. Select **OAuth 2.0** → **Manual**
5. Configure:
   - **Client ID:** `{CLIENT_APP_ID}`
   - **Client Secret:** `{CLIENT_SECRET}`
   - **Authorization URL:** `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize`
   - **Token URL:** `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token`
   - **Scope:** `api://{SERVER_APP_ID}/.default`
6. **Create** → Copy the **callback URL** and add it to your Entra ID app registration's redirect URIs
7. **Create a new connection** and **Add to agent**

#### Step 6: Test

Use the Copilot Studio test pane to verify the MCP tools are discovered and functional.

---

### Pattern 2: Full Private with Power Platform VNet Support

#### Prerequisites
- Power Platform premium license with Managed Environments
- Azure VNet in a [supported region](https://learn.microsoft.com/en-us/power-platform/admin/vnet-support-overview#supported-regions)

#### Step 1: Create VNet and Subnets

```bash
# Create VNet
az network vnet create \
  --resource-group myRG \
  --name pp-vnet \
  --address-prefix 10.0.0.0/16

# Create subnet for Power Platform delegation (min /27 for production)
az network vnet subnet create \
  --resource-group myRG \
  --vnet-name pp-vnet \
  --name pp-delegation-subnet \
  --address-prefix 10.0.1.0/24 \
  --delegations Microsoft.PowerPlatform/enterprisePolicies

# Create subnet for App Service private endpoint
az network vnet subnet create \
  --resource-group myRG \
  --vnet-name pp-vnet \
  --name appservice-pe-subnet \
  --address-prefix 10.0.2.0/24
```

#### Step 2: Create Private Endpoint for App Service

```bash
az network private-endpoint create \
  --resource-group myRG \
  --name mcp-server-pe \
  --vnet-name pp-vnet \
  --subnet appservice-pe-subnet \
  --private-connection-resource-id $(az webapp show -g myRG -n my-mcp-server --query id -o tsv) \
  --group-id sites \
  --connection-name mcp-server-pe-conn

# Disable public access
az webapp update --resource-group myRG --name my-mcp-server --set publicNetworkAccess=Disabled
```

#### Step 3: Configure Private DNS

```bash
az network private-dns zone create \
  --resource-group myRG \
  --name privatelink.azurewebsites.net

az network private-dns link vnet create \
  --resource-group myRG \
  --zone-name privatelink.azurewebsites.net \
  --name pp-vnet-link \
  --virtual-network pp-vnet \
  --registration-enabled false
```

#### Step 4: Create Enterprise Policy and Link Environment

Use PowerShell:
```powershell
# Install module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

# Create enterprise policy (via Azure portal or ARM template)
# Link Power Platform environment to the enterprise policy
# See: https://learn.microsoft.com/en-us/power-platform/admin/vnet-support-setup-configure
```

#### Step 5: Connect MCP Server Using Private URL

In Copilot Studio, use the private DNS name:
- **Server URL:** `https://my-mcp-server.privatelink.azurewebsites.net/mcp`

The connector runtime, now routing through your delegated subnet, will resolve this via private DNS.

---

## Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| **No Copilot Studio-specific service tag** | Can't isolate Copilot Studio IPs from other Power Platform connector IPs | Use Entra ID auth for tenant isolation |
| **MCP only supports Streamable HTTP transport** | No stdio or other transports | Implement Streamable HTTP on your server |
| **SSE transport deprecated** | Must migrate to Streamable by August 2025 | Update server implementation |
| **VNet support requires Managed Environment** | Additional licensing/setup cost | Use Pattern 1 if VNet support isn't feasible |
| **VNet support enables routing for ALL traffic** | Enabling VNet may break other connector traffic that needs public internet | Ensure all dependencies are accessible via VNet (private endpoints, NAT gateway for internet) |
| **Custom connector 5 MB payload limit** | Large MCP responses may fail | Paginate responses |
| **MCP tools with reference type inputs not supported** | Filtered from available tools | Redesign tool schemas to avoid `$ref` types |
| **Enum types interpreted as strings** | Loss of validation | Handle validation server-side |
| **No managed identity for MCP calls** | Can't use passwordless auth from Copilot Studio to MCP | Use OAuth 2.0 client credentials or API key |
| **OAuth callback URL must be registered** | Extra configuration step | Document in runbook |
| **IP ranges change periodically** | Access restrictions may become stale | Update every 90 days or use service tags (auto-updated) |
| **VNet support not available in all regions** | May not work for all deployments | Check [supported regions](https://learn.microsoft.com/en-us/power-platform/admin/vnet-support-overview#supported-regions) |

---

## Recommendations

### For Most Teams: Pattern 1 (Simple & Effective)

1. **App Service access restrictions** with `AzureConnectors` service tag — blocks general internet
2. **Entra ID OAuth 2.0** — ensures only your tenant's authenticated clients can call the API
3. **HTTPS only** — enforce TLS 1.2+
4. **Application Insights** — monitor all requests for anomalies
5. **Regular key/secret rotation** — automate with Key Vault

### For High-Security / Regulated Environments: Pattern 2

1. **Power Platform VNet support** with subnet delegation
2. **Private Endpoint** on App Service — zero public exposure
3. **Entra ID OAuth 2.0** — defense in depth
4. **NSG rules** on the delegated subnet for additional control
5. **Azure Monitor + Defender for Cloud** — continuous security monitoring

### Quick Decision Matrix

| Requirement | Pattern 1 | Pattern 2 | Pattern 3 (APIM) |
|---|---|---|---|
| No public internet exposure | ❌ (restricted, not private) | ✅ | ❌ (APIM is public) |
| Simple setup | ✅ | ❌ | ❌ |
| Tenant-level isolation | ✅ (via auth) | ✅ | ✅ |
| Network-level isolation | Partial (service tags) | Full (private endpoint) | Partial |
| Cost | Low (~App Service only) | Medium (VNet, PE, managed env) | Medium-High (+ APIM) |
| Granular API policies | ❌ | ❌ | ✅ |
| Regulatory compliance | Good | Excellent | Good-Excellent |

---

## References

- [Copilot Studio MCP Overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)
- [Connect Agent to MCP Server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [Create an MCP Server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-create-new-server)
- [MCP Troubleshooting](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-troubleshooting)
- [Power Platform VNet Support Overview](https://learn.microsoft.com/en-us/power-platform/admin/vnet-support-overview)
- [Managed Connectors Outbound IP Addresses](https://learn.microsoft.com/en-us/connectors/common/outbound-ip-addresses)
- [Power Platform URLs and IP Ranges](https://learn.microsoft.com/en-us/power-platform/admin/online-requirements)
- [Azure Service Tags Download](https://www.microsoft.com/download/details.aspx?id=56519)
- [App Service Access Restrictions](https://learn.microsoft.com/en-us/azure/app-service/app-service-ip-restrictions)
- [App Service Entra ID Authentication](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad)
- [APIM with Internal VNet + App Gateway](https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-integrate-internal-vnet-appgateway)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/introduction)
- [MCP Lab Blog Post](https://aka.ms/mcsmcp/lab/blog)
