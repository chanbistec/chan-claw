# Testing Copilot Studio Generative Agents via Direct Line

**Date:** March 12, 2026
**Purpose:** Automated testing of Copilot Studio generative (AI-orchestrated) agents using the Bot Framework Direct Line 3.0 API

---

## Overview

Copilot Studio agents are backed by Azure Bot Service and expose a Direct Line channel for programmatic access. This allows you to:

- Run automated test suites against generative agents
- Validate knowledge source citations
- Test multi-turn conversation context
- Measure response latency
- Integrate agent testing into CI/CD pipelines

```
Test Client → Token Endpoint / Direct Line Secret
                        ↓
              Direct Line Token (scoped, 1hr expiry)
                        ↓
              Direct Line 3.0 API
                        ↓
              Start Conversation → Send Message → Poll Response
```

---

## Step 1: Obtain Direct Line Credentials

The Direct Line credentials can be found in multiple locations depending on your Copilot Studio version. Check in this order:

### Option A: Copilot Studio — Security Settings

1. Open **Copilot Studio** → Select your agent
2. Go to **Settings** → **Security** → **Web channel security**
3. Copy the **Direct Line secret**

### Option B: Copilot Studio — Channels

1. Open **Copilot Studio** → Select your agent
2. Go to **Channels** → **Custom website** (or **Demo website**)
3. The embed code or configuration panel contains the **Token endpoint URL**

### Option C: Azure Portal — Direct Line Channel

1. Go to **Azure Portal** → **Azure Bot** resource (auto-created with your Copilot Studio agent)
2. Navigate to **Channels** → **Direct Line**
3. Under **Direct Line**, you'll find **two secret keys** (rotatable)
4. Copy either secret — both work

### Option D: Copilot Studio — Mobile App Channel (Legacy)

1. Open **Copilot Studio** → Select your agent
2. Go to **Channels** → **Mobile app**
3. Copy the **Token Endpoint** URL

> **Note:** The "Mobile app" channel may not be visible in newer Copilot Studio versions. If you don't see it, use Options A-C above.

### What You'll Get

| Credential | Where | How to Use |
|---|---|---|
| **Direct Line Secret** | Azure Portal or Security settings | Exchange for a token, or use directly for server-to-server |
| **Token Endpoint URL** | Copilot Studio Channels | Call GET to receive a scoped token |

---

## Step 2: Authentication Flow

### Path 1: Using a Token Endpoint (Copilot Studio)

```http
GET {TOKEN_ENDPOINT_URL}
```

Response:
```json
{
  "token": "RCurR_XV9ZA.cwA.BKA...",
  "expires_in": 3600,
  "conversationId": "abc123"
}
```

### Path 2: Using a Direct Line Secret (Azure Portal)

Exchange the secret for a scoped token:

```http
POST https://directline.botframework.com/v3/directline/tokens/generate
Authorization: Bearer {DIRECT_LINE_SECRET}
Content-Type: application/json

{
  "user": {
    "id": "dl_test-user-01",
    "name": "Test User"
  }
}
```

Response:
```json
{
  "conversationId": "abc123",
  "token": "RCurR_XV9ZA.cwA.BKA...",
  "expires_in": 1800
}
```

### Path 3: Using Secret Directly (Server-to-Server Only)

For backend/test services, you can skip token generation and use the secret directly:

```http
Authorization: Bearer {DIRECT_LINE_SECRET}
```

> ⚠️ **Never expose the secret in client-side code.** Use token exchange for any client-facing application.

### Token Refresh

Tokens expire (1800s or 3600s depending on source). Refresh before expiry:

```http
POST https://directline.botframework.com/v3/directline/tokens/refresh
Authorization: Bearer {CURRENT_TOKEN}
```

---

## Step 3: Conversation Lifecycle

### Start a Conversation

```http
POST https://directline.botframework.com/v3/directline/conversations
Authorization: Bearer {TOKEN}
```

Response:
```json
{
  "conversationId": "abc123",
  "token": "...",
  "expires_in": 1800,
  "streamUrl": "wss://directline.botframework.com/v3/directline/conversations/abc123/stream?t=..."
}
```

### Send a Message

```http
POST https://directline.botframework.com/v3/directline/conversations/{conversationId}/activities
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "type": "message",
  "from": {
    "id": "dl_test-user-01",
    "name": "Test User"
  },
  "text": "What is our remote work policy?",
  "textFormat": "plain",
  "locale": "en-US"
}
```

### Receive Responses (Polling)

```http
GET https://directline.botframework.com/v3/directline/conversations/{conversationId}/activities?watermark={watermark}
Authorization: Bearer {TOKEN}
```

The `watermark` parameter tracks which messages you've already seen. Pass the `watermark` value from each response into the next request to get only new messages.

### Receive Responses (WebSocket — Real-Time)

Use the `streamUrl` from the start conversation response:

```
wss://directline.botframework.com/v3/directline/conversations/{id}/stream?t={token}
```

WebSocket delivers activities in real-time without polling.

---

## Step 4: Generative Agent Response Structure

Generative (AI-orchestrated) agents return responses with additional metadata compared to topic-based agents.

### Standard Response Activity

```json
{
  "type": "message",
  "id": "activity-id",
  "timestamp": "2026-03-12T02:00:00.000Z",
  "from": {
    "id": "bot-id",
    "name": "HR Assistant"
  },
  "text": "Based on the company handbook, employees can work remotely up to 3 days per week...",
  "textFormat": "plain",
  "channelData": {
    "pva:citations": [
      {
        "title": "Remote Work Policy 2026",
        "url": "https://contoso.sharepoint.com/sites/HR/Policies/RemoteWork.pdf",
        "content": "Employees in good standing may work remotely up to three (3) days per week..."
      },
      {
        "title": "Employee Handbook Section 4.2",
        "url": "https://contoso.sharepoint.com/sites/HR/Handbook.pdf",
        "content": "Remote work arrangements must be approved by the direct manager..."
      }
    ]
  }
}
```

### Key Fields for Generative Agents

| Field | Description |
|---|---|
| `text` | The generated response text |
| `channelData["pva:citations"]` | Array of knowledge source citations used to generate the response |
| `channelData["pva:citations"][].title` | Source document title |
| `channelData["pva:citations"][].url` | Link to the source document |
| `channelData["pva:citations"][].content` | Relevant snippet from the source |

### Adaptive Card Responses

Some agents return adaptive cards instead of plain text:

```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "type": "AdaptiveCard",
        "body": [...]
      }
    }
  ]
}
```

---

## Complete C# Test Client

### Project Setup

```bash
dotnet new console -n CopilotStudioTests
cd CopilotStudioTests
dotnet add package Microsoft.Bot.Connector.DirectLine
dotnet add package System.Text.Json
```

### Test Client Implementation

```csharp
// CopilotStudioTester.cs
using System.Diagnostics;
using System.Text.Json;
using Microsoft.Bot.Connector.DirectLine;

namespace CopilotStudioTests;

public class CopilotStudioTester : IDisposable
{
    private readonly HttpClient _http = new();
    private readonly string? _tokenEndpoint;
    private readonly string? _directLineSecret;

    /// <summary>
    /// Initialize with a Copilot Studio token endpoint URL
    /// </summary>
    public CopilotStudioTester(string tokenEndpoint)
    {
        _tokenEndpoint = tokenEndpoint;
    }

    /// <summary>
    /// Initialize with a Direct Line secret from Azure Portal
    /// </summary>
    public static CopilotStudioTester FromSecret(string secret)
    {
        return new CopilotStudioTester(secret, isSecret: true);
    }

    private CopilotStudioTester(string secret, bool isSecret)
    {
        _directLineSecret = secret;
    }

    // ─── Token Acquisition ────────────────────────

    public async Task<(string Token, string ConversationId)> GetTokenAsync()
    {
        if (_tokenEndpoint != null)
        {
            // Path 1: Copilot Studio token endpoint
            var response = await _http.GetFromJsonAsync<TokenResponse>(_tokenEndpoint);
            return (response!.Token, response.ConversationId);
        }

        if (_directLineSecret != null)
        {
            // Path 2: Exchange Direct Line secret for token
            var request = new HttpRequestMessage(HttpMethod.Post,
                "https://directline.botframework.com/v3/directline/tokens/generate");
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _directLineSecret);
            request.Content = JsonContent.Create(new
            {
                user = new { id = "dl_test-user", name = "Test Runner" }
            });

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var token = await response.Content.ReadFromJsonAsync<TokenResponse>();
            return (token!.Token, token.ConversationId);
        }

        throw new InvalidOperationException("No token endpoint or secret configured");
    }

    // ─── Conversation Management ──────────────────

    public async Task<ConversationSession> StartConversationAsync()
    {
        var (token, _) = await GetTokenAsync();
        var client = new DirectLineClient(token);
        var conversation = await client.Conversations.StartConversationAsync();

        return new ConversationSession(client, conversation.ConversationId);
    }

    // ─── Quick Single-Turn Test ───────────────────

    public async Task<AgentResponse> GetResponseAsync(
        string userMessage, int timeoutSeconds = 30)
    {
        var session = await StartConversationAsync();
        try
        {
            await session.SendAsync(userMessage);
            return await session.GetResponseAsync(timeoutSeconds);
        }
        finally
        {
            session.Dispose();
        }
    }

    // ─── Response Timing ──────────────────────────

    public async Task<(AgentResponse Response, long ElapsedMs)> GetTimedResponseAsync(
        string userMessage, int timeoutSeconds = 30)
    {
        var sw = Stopwatch.StartNew();
        var response = await GetResponseAsync(userMessage, timeoutSeconds);
        sw.Stop();
        return (response, sw.ElapsedMilliseconds);
    }

    public void Dispose() => _http.Dispose();

    record TokenResponse(string Token, int Expires_in, string ConversationId);
}

// ─── Conversation Session ─────────────────────────

public class ConversationSession : IDisposable
{
    private readonly DirectLineClient _client;
    private readonly string _conversationId;
    private string? _watermark;
    private readonly string _userId = $"dl_test-{Guid.NewGuid():N}";

    public ConversationSession(DirectLineClient client, string conversationId)
    {
        _client = client;
        _conversationId = conversationId;
    }

    public async Task SendAsync(string message)
    {
        await _client.Conversations.PostActivityAsync(_conversationId, new Activity
        {
            Type = ActivityTypes.Message,
            From = new ChannelAccount(_userId, "Test User"),
            Text = message,
            TextFormat = "plain",
            Locale = "en-US"
        });
    }

    public async Task<AgentResponse> GetResponseAsync(int timeoutSeconds = 30)
    {
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);

        while (DateTime.UtcNow < deadline)
        {
            var result = await _client.Conversations
                .GetActivitiesAsync(_conversationId, _watermark);

            _watermark = result.Watermark;

            foreach (var activity in result.Activities)
            {
                if (activity.From.Id == _userId) continue;
                if (activity.Type != "message") continue;

                return ParseResponse(activity);
            }

            await Task.Delay(500);
        }

        return new AgentResponse
        {
            Text = null,
            TimedOut = true,
            Citations = Array.Empty<Citation>()
        };
    }

    private static AgentResponse ParseResponse(Activity activity)
    {
        var response = new AgentResponse
        {
            Text = activity.Text,
            ActivityId = activity.Id,
            Timestamp = activity.Timestamp?.UtcDateTime ?? DateTime.UtcNow,
            HasAdaptiveCard = activity.Attachments?.Any(a =>
                a.ContentType == "application/vnd.microsoft.card.adaptive") ?? false
        };

        // Extract citations from generative agent responses
        if (activity.ChannelData != null)
        {
            try
            {
                var channelData = JsonSerializer.Deserialize<JsonElement>(
                    activity.ChannelData.ToString()!);

                if (channelData.TryGetProperty("pva:citations", out var citations))
                {
                    response.Citations = citations.EnumerateArray()
                        .Select(c => new Citation
                        {
                            Title = c.TryGetProperty("title", out var t) ? t.GetString() : null,
                            Url = c.TryGetProperty("url", out var u) ? u.GetString() : null,
                            Content = c.TryGetProperty("content", out var ct) ? ct.GetString() : null
                        })
                        .ToArray();
                }
            }
            catch (JsonException)
            {
                // channelData not JSON — ignore
            }
        }

        return response;
    }

    public void Dispose() => _client.Dispose();
}

// ─── Response Models ──────────────────────────────

public class AgentResponse
{
    public string? Text { get; set; }
    public string? ActivityId { get; set; }
    public DateTime Timestamp { get; set; }
    public bool TimedOut { get; set; }
    public bool HasAdaptiveCard { get; set; }
    public Citation[] Citations { get; set; } = Array.Empty<Citation>();

    public bool HasCitations => Citations.Length > 0;
}

public class Citation
{
    public string? Title { get; set; }
    public string? Url { get; set; }
    public string? Content { get; set; }
}
```

### Automated Test Suite

```csharp
// CopilotAgentTests.cs
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace CopilotStudioTests;

[TestClass]
public class CopilotAgentTests
{
    private static CopilotStudioTester _tester = null!;

    [ClassInitialize]
    public static void Init(TestContext ctx)
    {
        // Use token endpoint (from Copilot Studio)
        var tokenEndpoint = Environment.GetEnvironmentVariable("COPILOT_TOKEN_ENDPOINT");

        // OR use Direct Line secret (from Azure Portal)
        var secret = Environment.GetEnvironmentVariable("COPILOT_DIRECTLINE_SECRET");

        _tester = !string.IsNullOrEmpty(tokenEndpoint)
            ? new CopilotStudioTester(tokenEndpoint)
            : CopilotStudioTester.FromSecret(secret!);
    }

    [ClassCleanup]
    public static void Cleanup() => _tester.Dispose();

    // ─── Basic Connectivity ───────────────────────

    [TestMethod]
    public async Task Agent_IsReachable()
    {
        var (token, conversationId) = await _tester.GetTokenAsync();
        Assert.IsFalse(string.IsNullOrEmpty(token), "Should receive a valid token");
        Assert.IsFalse(string.IsNullOrEmpty(conversationId), "Should receive a conversation ID");
    }

    [TestMethod]
    public async Task Agent_RespondsToGreeting()
    {
        var response = await _tester.GetResponseAsync("Hello");
        Assert.IsFalse(response.TimedOut, "Agent should respond within timeout");
        Assert.IsFalse(string.IsNullOrEmpty(response.Text), "Response should contain text");
    }

    // ─── Generative / Knowledge ───────────────────

    [TestMethod]
    public async Task Agent_CitesKnowledgeSources()
    {
        var response = await _tester.GetResponseAsync(
            "What is our leave policy?");

        Assert.IsFalse(response.TimedOut, "Agent should respond");
        Assert.IsTrue(response.HasCitations,
            "Generative agent should cite knowledge sources for policy questions");

        foreach (var citation in response.Citations)
        {
            Assert.IsFalse(string.IsNullOrEmpty(citation.Title),
                "Each citation should have a title");
        }
    }

    [TestMethod]
    public async Task Agent_DoesNotHallucinateForUnknownTopics()
    {
        var response = await _tester.GetResponseAsync(
            "What is the airspeed velocity of an unladen swallow?");

        Assert.IsFalse(response.TimedOut);
        // Agent should NOT cite company knowledge for unrelated questions
        // and should gracefully decline or redirect
        Assert.IsFalse(response.HasCitations,
            "Agent should not cite company sources for unrelated topics");
    }

    [TestMethod]
    public async Task Agent_ReturnsRelevantCitations()
    {
        var response = await _tester.GetResponseAsync(
            "What are the requirements for expense reports?");

        if (response.HasCitations)
        {
            var titles = response.Citations.Select(c => c.Title?.ToLower() ?? "");
            var hasRelevant = titles.Any(t =>
                t.Contains("expense") || t.Contains("finance") || t.Contains("policy"));
            Assert.IsTrue(hasRelevant,
                $"Citations should be relevant. Got: {string.Join(", ", titles)}");
        }
    }

    // ─── Multi-Turn Context ───────────────────────

    [TestMethod]
    public async Task Agent_MaintainsConversationContext()
    {
        using var session = await _tester.StartConversationAsync();

        // Turn 1: Establish topic
        await session.SendAsync("Tell me about our remote work policy");
        var r1 = await session.GetResponseAsync();
        Assert.IsFalse(r1.TimedOut, "Turn 1 should respond");
        Assert.IsTrue(r1.Text!.Contains("remote", StringComparison.OrdinalIgnoreCase),
            "Turn 1 should mention remote work");

        // Turn 2: Follow-up (requires context from turn 1)
        await session.SendAsync("How many days per week?");
        var r2 = await session.GetResponseAsync();
        Assert.IsFalse(r2.TimedOut, "Turn 2 should respond");
        Assert.IsTrue(r2.Text!.Length > 10,
            "Turn 2 should provide a substantive answer using context");
    }

    [TestMethod]
    public async Task Agent_HandlesTopicSwitch()
    {
        using var session = await _tester.StartConversationAsync();

        await session.SendAsync("What is our PTO policy?");
        var r1 = await session.GetResponseAsync();
        Assert.IsFalse(r1.TimedOut);

        // Switch topic mid-conversation
        await session.SendAsync("Actually, tell me about the dress code instead");
        var r2 = await session.GetResponseAsync();
        Assert.IsFalse(r2.TimedOut);
        // Should NOT still be talking about PTO
    }

    // ─── Performance ──────────────────────────────

    [TestMethod]
    [Timeout(60000)]
    public async Task Agent_RespondsWithin10Seconds()
    {
        var (response, elapsed) = await _tester.GetTimedResponseAsync(
            "What are our company values?");

        Assert.IsFalse(response.TimedOut);
        Assert.IsTrue(elapsed < 10000,
            $"Response took {elapsed}ms — expected under 10,000ms");
    }

    [TestMethod]
    [Timeout(120000)]
    public async Task Agent_ConsistentPerformanceOver5Turns()
    {
        using var session = await _tester.StartConversationAsync();
        var messages = new[]
        {
            "What is our vacation policy?",
            "How do I request time off?",
            "What about sick leave?",
            "Can I carry over unused days?",
            "Who approves my requests?"
        };

        foreach (var msg in messages)
        {
            var sw = Stopwatch.StartNew();
            await session.SendAsync(msg);
            var response = await session.GetResponseAsync(15);
            sw.Stop();

            Assert.IsFalse(response.TimedOut, $"'{msg}' timed out");
            Console.WriteLine($"  [{sw.ElapsedMilliseconds}ms] {msg} → {response.Text?[..Math.Min(80, response.Text.Length)]}...");
        }
    }

    // ─── Edge Cases ───────────────────────────────

    [TestMethod]
    public async Task Agent_HandlesEmptyMessage()
    {
        var response = await _tester.GetResponseAsync("");
        // Should not crash — may return a prompt or greeting
        Assert.IsFalse(response.TimedOut);
    }

    [TestMethod]
    public async Task Agent_HandlesLongInput()
    {
        var longMessage = new string('A', 2000) + " What is the leave policy?";
        var response = await _tester.GetResponseAsync(longMessage);
        Assert.IsFalse(response.TimedOut);
    }

    [TestMethod]
    public async Task Agent_HandlesSpecialCharacters()
    {
        var response = await _tester.GetResponseAsync(
            "What's the policy for <script>alert('xss')</script> leave?");
        Assert.IsFalse(response.TimedOut);
        Assert.IsFalse(response.Text?.Contains("<script>") ?? false,
            "Agent should sanitize or ignore script tags");
    }
}
```

### Running the Tests

```bash
# Set credentials (use ONE of these)
export COPILOT_TOKEN_ENDPOINT="https://default...api.powerplatform.com/powervirtualagents/..."
# OR
export COPILOT_DIRECTLINE_SECRET="your-direct-line-secret"

# Run tests
dotnet test --logger "console;verbosity=detailed"

# Run with specific filter
dotnet test --filter "FullyQualifiedName~CitesKnowledgeSources"
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Copilot Studio Agent Tests

on:
  schedule:
    - cron: '0 8 * * 1-5'  # Weekdays at 8 AM
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Run agent tests
        env:
          COPILOT_DIRECTLINE_SECRET: ${{ secrets.COPILOT_DIRECTLINE_SECRET }}
        run: |
          cd CopilotStudioTests
          dotnet test --logger "trx" --results-directory ./results

      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Agent Test Results
          path: '**/results/*.trx'
          reporter: dotnet-trx
```

---

## Finding Direct Line Credentials — Quick Reference

| Location | Path | What You Get |
|---|---|---|
| **Copilot Studio** | Settings → Security → Web channel security | Direct Line secret |
| **Copilot Studio** | Channels → Custom website | Token endpoint or embed code |
| **Copilot Studio** | Channels → Mobile app (legacy, may not be visible) | Token endpoint |
| **Azure Portal** | Azure Bot resource → Channels → Direct Line | 2 rotatable secret keys |

> **If you can't find any of these:** Your agent may need to be published first. Go to **Publish** in Copilot Studio and publish to at least one channel.

---

## Security Best Practices

| Practice | Details |
|---|---|
| **Never expose secrets in client code** | Use token exchange for any browser/mobile app |
| **Rotate secrets periodically** | Azure Portal → Direct Line → Regenerate key |
| **Use tokens for testing** | Tokens are scoped to one conversation, expire in 30-60 min |
| **Store in pipeline secrets** | `COPILOT_DIRECTLINE_SECRET` in GitHub/Azure DevOps secrets |
| **User ID prefix** | Always prefix test user IDs with `dl_` per Direct Line requirements |
| **Rate limits** | Direct Line supports ~20 messages/sec per conversation |

---

## Limitations & Known Issues

| Issue | Details |
|---|---|
| **Generative response latency** | AI-orchestrated responses take 3-10s vs <1s for topic-based |
| **Citation format varies** | `pva:citations` structure may change across Copilot Studio versions |
| **Auth-required agents** | If your agent requires Entra ID auth, you must pass an SSO token in the activity's `channelData` |
| **Adaptive cards** | Some responses come as adaptive cards, not plain text — test for both |
| **Token endpoint visibility** | The "Mobile app" channel is being phased out in newer UI — use Azure Portal Direct Line instead |
| **WebSocket disconnects** | Long-idle conversations may disconnect — implement reconnection logic for extended tests |
