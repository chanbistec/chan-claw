# Automating Testing of Microsoft Copilot Studio Agents

A comprehensive guide to testing strategies, tools, and CI/CD integration for Microsoft Copilot Studio custom agents.

> **Last updated:** 2026-02-24

---

## Table of Contents

1. [Built-in Testing Tools](#1-built-in-testing-tools)
2. [Power CAT Copilot Studio Kit](#2-power-cat-copilot-studio-kit)
3. [Direct Line API Testing](#3-direct-line-api-testing)
4. [Power Automate-Based Testing](#4-power-automate-based-testing)
5. [CI/CD Integration](#5-cicd-integration)
6. [Test Frameworks & Community Tools](#6-test-frameworks--community-tools)
7. [Regression Testing](#7-regression-testing)
8. [Topic-Level vs End-to-End Testing](#8-topic-level-vs-end-to-end-testing)
9. [Analytics and Evaluation](#9-analytics-and-evaluation)
10. [Load & Performance Testing](#10-load--performance-testing)
11. [Best Practices](#11-best-practices)

---

## 1. Built-in Testing Tools

### Test Canvas (Test Your Agent Panel)

Copilot Studio includes an interactive **Test your agent** panel accessible from any page in the authoring experience.

**Key features:**
- **Real-time conversation testing** — type messages and see how your agent responds
- **Activity map** — for agents using generative orchestration, follow the orchestrator's plan in real time
- **Track between topics** — toggle this to automatically follow conversation flow across topics
- **Variable inspection** — open the Variables panel → Test tab to monitor variable values during testing
- **Conversation snapshots** — export `botContent.zip` containing `dialog.json` (diagnostics) and `botContent.yml` (agent content) for offline analysis
- **Connection management** — manage authenticated connections used during testing

**Limitations:**
- Test panel activity is **not** recorded in the Analytics dashboard
- Manual testing only — no batch execution

### Agent Evaluation (Preview)

Copilot Studio's built-in **Agent Evaluation** feature provides automated batch testing with multiple evaluation methods.

**Creating test sets** (up to 100 test cases per set):

| Method | Description |
|--------|-------------|
| **Manual creation** | Add test cases one by one in the UI |
| **CSV/TXT import** | Upload a spreadsheet with Question, Expected response, Testing method columns |
| **AI generation from Knowledge** | Auto-generate questions from your agent's knowledge sources |
| **AI generation from Topics** | Auto-generate questions based on your agent's topics |
| **Theme-based** | Generate from real user conversation themes in analytics |

**CSV Import Format:**

```csv
Question,Expected response,Testing method
What are your business hours?,We are open Monday to Friday 9am to 5pm,Compare meaning
How do I reset my password?,Click on Forgot Password on the login page,Keyword match
What is your return policy?,You can return items within 30 days,General quality
```

**Evaluation methods:**

| Method | Scoring | Requires |
|--------|---------|----------|
| **General quality** | 0-100% | Nothing extra |
| **Compare meaning** | 0-100% | Pass score + expected answer |
| **Capability use** | Pass/Fail | Expected capabilities |
| **Keyword match** | Pass/Fail | Expected keywords/phrases |
| **Text similarity** | 0-100% | Pass score + expected answer |
| **Exact match** | Pass/Fail | Expected answer |

**Running an evaluation:**

1. Go to your agent's **Evaluation** page
2. Select **New evaluation**
3. Choose creation method (manual, import, generate)
4. Configure test methods and pass scores
5. Select a **User profile** for authenticated knowledge sources
6. Click **Evaluate** to run, or **Save** to store for later

> **Note:** Test results are retained for **89 days**. Export to CSV for longer retention.

---

## 2. Power CAT Copilot Studio Kit

The **[Power CAT Copilot Studio Kit](https://github.com/microsoft/Power-CAT-Copilot-Studio-Kit)** is Microsoft's official open-source testing and governance framework built on Power Platform.

### Overview

The Kit is a model-driven Power App that provides:
- **Batch testing** of custom agents via Direct Line API
- **Multiple test types**: Response match, Attachment match, Topic match, Generative answers, Multi-turn, Plan validation
- **AI-powered evaluation** using AI Builder to compare responses with expected answers
- **User-defined rubrics** for grading generative answers
- **Rubric refinement** — iteratively improve evaluation standards
- **Conversation KPIs** — aggregated performance data in Dataverse
- **Automated testing with Power Platform Pipelines** — quality gates before deployment

### Prerequisites

- Power Platform environment with **Dataverse**
- **Power Apps** license (model-driven apps)
- **Power Automate** license (Premium connectors)
- **Creator Kit** deployed first
- **PCF Components** enabled on the environment
- Optional: **AI Builder credits** (~50 credits per Generative Answers test case)
- Optional: **Azure Application Insights** for generative answer telemetry

### Installation

1. Download the latest release from [GitHub Releases](https://github.com/microsoft/Powercat-Copilotstudio-Accelerator/releases)
2. Deploy the Creator Kit first
3. Enable PCF Components on your environment
4. Import the managed solution
5. Run the **Setup Wizard** from the Kit's home page to configure connection references and environment variables
6. Enable the required cloud flows

### Configuring an Agent for Testing

Create an **Agent Configuration** record with:

| Setting | Description |
|---------|-------------|
| **Name** | Configuration name |
| **Configuration Type** | Select "Test Automation" |
| **Region** | Region where agent is deployed (for Direct Line endpoint) |
| **Token Endpoint** | From Copilot Studio → Channels → Mobile app |
| **Channel Security** | Enable if web/Direct Line security is on |
| **Secret** | Direct Line channel secret (Dataverse or Key Vault) |
| **User Authentication** | Enable for Entra ID v2 with SSO agents |
| **Enrich with App Insights** | For generative answers telemetry |
| **Enrich with Conversation Transcripts** | For topic match enrichment |
| **Analyze Generated Answers** | Enable AI Builder analysis |

### Supported Test Types

| Type | What it validates |
|------|-------------------|
| **Response match** | Exact or partial match of agent response text |
| **Attachment match** | Validates adaptive cards or attachments returned |
| **Topic match** | Verifies the correct topic was triggered (requires Dataverse enrichment) |
| **Generative answers** | Uses AI Builder LLM to compare AI-generated response against expected answer or rubric |
| **Multi-turn** | Ordered sequence of test cases in same conversation context |
| **Plan validation** | Validates tools included in dynamic plan (generative orchestration) |

### Running Tests

1. Navigate to **Tests** in the Kit app
2. Create or import test cases (Excel import/export supported)
3. Select a test set and click **Run**
4. Tests execute via Direct Line API against your published agent
5. Results include: response text, latency, pass/fail, AI analysis scores, aggregates

---

## 3. Direct Line API Testing

The **Bot Framework Direct Line API 3.0** is the primary programmatic interface for interacting with Copilot Studio agents.

### Architecture

```
Your Test Code → Direct Line API → Copilot Studio Agent
                 (REST/WebSocket)
```

### Getting a Direct Line Token

```bash
# Get token from your agent's token endpoint
curl -X GET "https://<YOUR_TOKEN_ENDPOINT>"
```

Response:
```json
{
  "token": "RCurR_XV9ZA.cwA.BKA...",
  "expires_in": 3600,
  "conversationId": "abc123"
}
```

### C# Example: Full Conversation Test

```csharp
using Microsoft.Bot.Connector.DirectLine;
using System;
using System.Linq;
using System.Threading.Tasks;

public class CopilotStudioTester
{
    private readonly string _tokenEndpoint;
    private readonly string _botName;
    private readonly HttpClient _httpClient = new();

    public CopilotStudioTester(string tokenEndpoint, string botName)
    {
        _tokenEndpoint = tokenEndpoint;
        _botName = botName;
    }

    public async Task<DirectLineToken> GetTokenAsync()
    {
        return await _httpClient.GetFromJsonAsync<DirectLineToken>(_tokenEndpoint);
    }

    public async Task<string> SendAndReceiveAsync(string userMessage)
    {
        var tokenInfo = await GetTokenAsync();

        using var client = new DirectLineClient(tokenInfo.Token);
        var conversation = await client.Conversations.StartConversationAsync();

        // Send user message
        await client.Conversations.PostActivityAsync(
            conversation.ConversationId,
            new Activity
            {
                Type = ActivityTypes.Message,
                From = new ChannelAccount { Id = "test-user", Name = "Test User" },
                Text = userMessage,
                TextFormat = "plain",
                Locale = "en-US"
            });

        // Poll for response (with timeout)
        string watermark = null;
        for (int i = 0; i < 30; i++)
        {
            await Task.Delay(1000);

            var activities = await client.Conversations.GetActivitiesAsync(
                conversation.ConversationId, watermark);
            watermark = activities.Watermark;

            var botResponses = activities.Activities?
                .Where(a => a.Type == ActivityTypes.Message &&
                       string.Equals(a.From.Name, _botName, StringComparison.Ordinal))
                .ToList();

            if (botResponses?.Any() == true)
                return botResponses.Last().Text;
        }

        throw new TimeoutException("No response from agent within 30 seconds");
    }
}

public class DirectLineToken
{
    public string Token { get; set; }
    public int Expires_in { get; set; }
    public string ConversationId { get; set; }
}
```

### Python Example: Direct Line Test Harness

```python
import requests
import time
from dataclasses import dataclass

@dataclass
class TestCase:
    user_message: str
    expected_response: str = None
    expected_topic: str = None
    expected_keywords: list = None

class CopilotStudioTester:
    DIRECT_LINE_URL = "https://directline.botframework.com/v3/directline"

    def __init__(self, token_endpoint: str, bot_name: str):
        self.token_endpoint = token_endpoint
        self.bot_name = bot_name

    def get_token(self) -> dict:
        resp = requests.get(self.token_endpoint)
        resp.raise_for_status()
        return resp.json()

    def start_conversation(self, token: str) -> str:
        resp = requests.post(
            f"{self.DIRECT_LINE_URL}/conversations",
            headers={"Authorization": f"Bearer {token}"}
        )
        resp.raise_for_status()
        return resp.json()["conversationId"]

    def send_message(self, token: str, conv_id: str, text: str):
        requests.post(
            f"{self.DIRECT_LINE_URL}/conversations/{conv_id}/activities",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "type": "message",
                "from": {"id": "test-user"},
                "text": text
            }
        )

    def get_bot_response(self, token: str, conv_id: str,
                         timeout: int = 30) -> str:
        watermark = None
        for _ in range(timeout):
            time.sleep(1)
            resp = requests.get(
                f"{self.DIRECT_LINE_URL}/conversations/{conv_id}/activities",
                headers={"Authorization": f"Bearer {token}"},
                params={"watermark": watermark} if watermark else {}
            )
            data = resp.json()
            watermark = data.get("watermark")

            bot_msgs = [
                a for a in data.get("activities", [])
                if a["type"] == "message" and a["from"]["name"] == self.bot_name
            ]
            if bot_msgs:
                return bot_msgs[-1]["text"]

        raise TimeoutError("No response within timeout")

    def run_test(self, test_case: TestCase) -> dict:
        token_data = self.get_token()
        token = token_data["token"]
        conv_id = self.start_conversation(token)
        self.send_message(token, conv_id, test_case.user_message)
        response = self.get_bot_response(token, conv_id)

        result = {
            "input": test_case.user_message,
            "response": response,
            "passed": True,
            "checks": {}
        }

        if test_case.expected_keywords:
            missing = [kw for kw in test_case.expected_keywords
                       if kw.lower() not in response.lower()]
            result["checks"]["keywords"] = len(missing) == 0
            result["passed"] &= result["checks"]["keywords"]

        return result

    def run_test_suite(self, test_cases: list[TestCase]) -> list[dict]:
        return [self.run_test(tc) for tc in test_cases]


# Usage
if __name__ == "__main__":
    tester = CopilotStudioTester(
        token_endpoint="https://your-token-endpoint-url",
        bot_name="Your Agent Name"
    )

    tests = [
        TestCase("Hello", expected_keywords=["hello", "help"]),
        TestCase("What are your hours?",
                 expected_keywords=["Monday", "Friday"]),
    ]

    results = tester.run_test_suite(tests)
    for r in results:
        status = "✅ PASS" if r["passed"] else "❌ FAIL"
        print(f'{status} | "{r["input"]}" → "{r["response"][:80]}..."')
```

### Node.js/TypeScript Example

```typescript
import axios from 'axios';

interface TestCase {
  userMessage: string;
  expectedKeywords?: string[];
  expectedTopic?: string;
}

interface TestResult {
  input: string;
  response: string;
  passed: boolean;
  latencyMs: number;
}

async function testAgent(
  tokenEndpoint: string,
  botName: string,
  testCases: TestCase[]
): Promise<TestResult[]> {
  const DL = 'https://directline.botframework.com/v3/directline';

  // Get token
  const { data: tokenData } = await axios.get(tokenEndpoint);
  const headers = { Authorization: `Bearer ${tokenData.token}` };

  const results: TestResult[] = [];

  for (const tc of testCases) {
    const start = Date.now();

    // Start conversation
    const { data: conv } = await axios.post(
      `${DL}/conversations`, {}, { headers }
    );

    // Send message
    await axios.post(
      `${DL}/conversations/${conv.conversationId}/activities`,
      { type: 'message', from: { id: 'test-user' }, text: tc.userMessage },
      { headers }
    );

    // Poll for response
    let response = '';
    let watermark: string | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await axios.get(
        `${DL}/conversations/${conv.conversationId}/activities`,
        { headers, params: watermark ? { watermark } : {} }
      );
      watermark = data.watermark;
      const botMsgs = data.activities?.filter(
        (a: any) => a.type === 'message' && a.from.name === botName
      );
      if (botMsgs?.length) {
        response = botMsgs[botMsgs.length - 1].text;
        break;
      }
    }

    const latencyMs = Date.now() - start;
    let passed = response.length > 0;

    if (tc.expectedKeywords) {
      passed = tc.expectedKeywords.every(
        kw => response.toLowerCase().includes(kw.toLowerCase())
      );
    }

    results.push({ input: tc.userMessage, response, passed, latencyMs });
  }

  return results;
}
```

### Multi-Turn Conversation Testing

```python
def run_multi_turn_test(self, turns: list[TestCase]) -> list[dict]:
    """Test a multi-turn conversation in a single session."""
    token_data = self.get_token()
    token = token_data["token"]
    conv_id = self.start_conversation(token)

    results = []
    for turn in turns:
        self.send_message(token, conv_id, turn.user_message)
        response = self.get_bot_response(token, conv_id)

        passed = True
        if turn.expected_keywords:
            passed = all(
                kw.lower() in response.lower()
                for kw in turn.expected_keywords
            )

        results.append({
            "turn": turn.user_message,
            "response": response,
            "passed": passed
        })

    return results
```

---

## 4. Power Automate-Based Testing

### Approach 1: Cloud Flow Test Runner

Build a Power Automate cloud flow that:
1. Reads test cases from a Dataverse table or Excel file
2. Calls the Direct Line API to send each message
3. Captures and evaluates responses
4. Writes results back to Dataverse

**High-level flow:**

```
Trigger (Manual / Scheduled / Pipeline event)
  → List test cases from Dataverse
  → For each test case:
      → HTTP: Get Direct Line token
      → HTTP: Start conversation
      → HTTP: Post user message
      → HTTP: Poll for bot response
      → Condition: Evaluate response against expected
      → Update test result record in Dataverse
  → Send summary notification (Teams / Email)
```

### Approach 2: Power CAT Kit Integration

The Copilot Studio Kit already packages this pattern. Its cloud flows:
- Execute test runs via Direct Line
- Enrich results with App Insights and Conversation Transcripts
- Use AI Builder prompts for generative answer evaluation
- Support authentication flows (Entra ID v2 with SSO)

### Approach 3: Scheduled Regression Runs

Create a **Recurrence**-triggered flow that runs your test suite daily:

```
Recurrence (Daily at 6:00 AM)
  → Run test set via Copilot Studio Kit
  → Check results
  → If failures > threshold:
      → Post to Teams channel
      → Create work item in Azure DevOps
```

---

## 5. CI/CD Integration

### Power Platform Pipelines + Copilot Studio Kit

The Kit supports **automated testing as a quality gate** in Power Platform Pipelines:

**How it works:**
1. Developer requests deployment of a solution containing a Copilot Studio agent
2. A Power Automate flow is triggered on the deployment request
3. The flow **pauses deployment**, runs automated tests using the Kit
4. Evaluates test results against pass thresholds
5. If tests pass → deployment proceeds to target environment
6. If tests fail → deployment is blocked, notification sent

**Setup steps:**
1. Open Deployment Pipeline Configuration App in Power Apps
2. Create pipeline linking Dev → Prod environments
3. Configure deployment stages with pre-export/pre-deployment steps
4. Create Power Automate flow triggered on deployment requests
5. Flow runs Kit test sets and gates on results

### Azure DevOps Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  TOKEN_ENDPOINT: $(CopilotTokenEndpoint)
  BOT_NAME: $(CopilotBotName)

stages:
  - stage: ExportSolution
    displayName: 'Export Copilot Studio Solution'
    jobs:
      - job: Export
        steps:
          - task: PowerPlatformToolInstaller@2
            displayName: 'Install Power Platform CLI'

          - task: PowerPlatformExportSolution@2
            displayName: 'Export Solution'
            inputs:
              authenticationType: 'PowerPlatformSPN'
              PowerPlatformSPN: 'PowerPlatformServiceConnection'
              SolutionName: 'MyCopilotAgentSolution'
              SolutionOutputFile: '$(Build.ArtifactStagingDirectory)/solution.zip'

          - publish: '$(Build.ArtifactStagingDirectory)'
            artifact: 'solution'

  - stage: TestAgent
    displayName: 'Test Copilot Agent'
    dependsOn: ExportSolution
    jobs:
      - job: RunTests
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '3.11'

          - script: pip install requests pytest pytest-html
            displayName: 'Install dependencies'

          - script: |
              python -m pytest tests/test_copilot_agent.py \
                --html=test-results/report.html \
                --junitxml=test-results/results.xml \
                -v
            displayName: 'Run Agent Tests'
            env:
              TOKEN_ENDPOINT: $(TOKEN_ENDPOINT)
              BOT_NAME: $(BOT_NAME)

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'test-results/results.xml'
            condition: always()

          - publish: test-results
            artifact: 'test-results'
            condition: always()

  - stage: DeploySolution
    displayName: 'Deploy to Production'
    dependsOn: TestAgent
    condition: succeeded()
    jobs:
      - deployment: Deploy
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerPlatformImportSolution@2
                  displayName: 'Import Solution'
                  inputs:
                    authenticationType: 'PowerPlatformSPN'
                    PowerPlatformSPN: 'ProdServiceConnection'
                    SolutionInputFile: '$(Pipeline.Workspace)/solution/solution.zip'
```

**Pytest test file (`tests/test_copilot_agent.py`):**

```python
import os
import pytest

# Reuse the CopilotStudioTester class from Section 3

TOKEN_ENDPOINT = os.environ["TOKEN_ENDPOINT"]
BOT_NAME = os.environ["BOT_NAME"]

tester = CopilotStudioTester(TOKEN_ENDPOINT, BOT_NAME)

@pytest.fixture(scope="session")
def agent():
    return tester

class TestGreetings:
    def test_hello(self, agent):
        result = agent.run_test(TestCase("Hello",
            expected_keywords=["hello", "help"]))
        assert result["passed"], f"Response: {result['response']}"

    def test_hi(self, agent):
        result = agent.run_test(TestCase("Hi there",
            expected_keywords=["hello", "help"]))
        assert result["passed"], f"Response: {result['response']}"

class TestBusinessHours:
    def test_hours_query(self, agent):
        result = agent.run_test(TestCase("What are your business hours?",
            expected_keywords=["Monday", "Friday"]))
        assert result["passed"], f"Response: {result['response']}"

class TestFallback:
    def test_unknown_query(self, agent):
        result = agent.run_test(TestCase("asdfghjkl random gibberish"))
        # Should get a fallback/escalation response
        assert result["response"], "Agent should respond even to unknown input"
```

### GitHub Actions Pipeline

```yaml
# .github/workflows/test-copilot-agent.yml
name: Test Copilot Studio Agent

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  test-agent:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install requests pytest pytest-html

      - name: Run Copilot Agent Tests
        env:
          TOKEN_ENDPOINT: ${{ secrets.COPILOT_TOKEN_ENDPOINT }}
          BOT_NAME: ${{ secrets.COPILOT_BOT_NAME }}
        run: |
          python -m pytest tests/test_copilot_agent.py \
            --junitxml=test-results.xml \
            --html=test-report.html \
            -v

      - name: Publish Test Results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: 'Copilot Agent Tests'
          path: test-results.xml
          reporter: java-junit

      - name: Upload HTML Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-report
          path: test-report.html

  deploy:
    needs: test-agent
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: echo "Deploy solution to production environment"
        # Add Power Platform CLI steps here
```

---

## 6. Test Frameworks & Community Tools

### Power CAT Copilot Studio Kit (Primary)

The most comprehensive option. See [Section 2](#2-power-cat-copilot-studio-kit).

### Bot Framework Direct Line Testing

Use the `Microsoft.Bot.Connector.DirectLine` NuGet package or REST API directly. Best for custom test harnesses integrated into existing test suites.

### Custom Test Harnesses

Build your own using:
- **Python + pytest** — lightweight, flexible, good CI/CD integration
- **C# + xUnit/NUnit** — native Direct Line SDK support
- **Node.js + Jest/Mocha** — good for teams already in the JS ecosystem
- **Postman/Newman** — for quick API-level testing of Direct Line conversations

### Postman Collection Example

```json
{
  "info": { "name": "Copilot Studio Tests" },
  "item": [
    {
      "name": "Get Token",
      "request": {
        "method": "GET",
        "url": "{{tokenEndpoint}}"
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "var data = pm.response.json();",
            "pm.collectionVariables.set('token', data.token);",
            "pm.collectionVariables.set('conversationId', data.conversationId);"
          ]
        }
      }]
    },
    {
      "name": "Send Message",
      "request": {
        "method": "POST",
        "url": "https://directline.botframework.com/v3/directline/conversations/{{conversationId}}/activities",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"type\":\"message\",\"from\":{\"id\":\"test\"},\"text\":\"Hello\"}"
        }
      }
    }
  ]
}
```

Run with Newman in CI:

```bash
newman run copilot-tests.postman_collection.json \
  --env-var "tokenEndpoint=https://your-endpoint" \
  --reporters cli,junit \
  --reporter-junit-export results.xml
```

### AI-Powered Response Evaluation

For non-deterministic generative responses, use LLM-as-a-judge:

```python
import openai

def evaluate_response_with_llm(question: str, response: str,
                                expected: str, rubric: str = None) -> dict:
    """Use GPT to evaluate if agent response is acceptable."""
    system_prompt = """You are an evaluator for a customer service chatbot.
    Score the response on a scale of 1-5 for:
    - Relevance: Does it answer the question?
    - Accuracy: Is the information correct?
    - Completeness: Does it cover all aspects?
    Return JSON: {"relevance": int, "accuracy": int, "completeness": int, "passed": bool, "reasoning": str}
    """

    user_prompt = f"""
    Question: {question}
    Agent Response: {response}
    Expected Answer: {expected}
    {f'Rubric: {rubric}' if rubric else ''}
    """

    result = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"}
    )

    return json.loads(result.choices[0].message.content)
```

---

## 7. Regression Testing

### Approach: Baseline Snapshots

1. **Establish a baseline**: Run your full test suite and save all responses as the "golden" baseline
2. **On each change**: Run the same test suite and compare responses to baseline
3. **Flag drift**: Alert when responses differ significantly

```python
import json
import hashlib
from pathlib import Path

class RegressionTester:
    def __init__(self, baseline_path: str = "baseline_responses.json"):
        self.baseline_path = Path(baseline_path)
        self.baseline = self._load_baseline()

    def _load_baseline(self) -> dict:
        if self.baseline_path.exists():
            return json.loads(self.baseline_path.read_text())
        return {}

    def save_baseline(self, results: dict):
        self.baseline_path.write_text(json.dumps(results, indent=2))

    def compare(self, test_id: str, current_response: str) -> dict:
        baseline_response = self.baseline.get(test_id)
        if baseline_response is None:
            return {"status": "new", "response": current_response}

        if current_response == baseline_response:
            return {"status": "unchanged"}

        # Use similarity scoring for fuzzy comparison
        from difflib import SequenceMatcher
        similarity = SequenceMatcher(
            None, baseline_response, current_response
        ).ratio()

        return {
            "status": "changed",
            "similarity": similarity,
            "baseline": baseline_response,
            "current": current_response,
            "regression": similarity < 0.7  # Flag if <70% similar
        }
```

### Scheduled Regression with Alerts

```yaml
# .github/workflows/regression.yml
name: Agent Regression Check

on:
  schedule:
    - cron: '0 6 * * 1-5'  # Weekdays at 6 AM

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }

      - run: pip install requests

      - name: Run regression tests
        env:
          TOKEN_ENDPOINT: ${{ secrets.COPILOT_TOKEN_ENDPOINT }}
          BOT_NAME: ${{ secrets.COPILOT_BOT_NAME }}
        run: python scripts/regression_test.py

      - name: Check for regressions
        run: |
          if grep -q '"regression": true' regression_results.json; then
            echo "⚠️ REGRESSION DETECTED"
            exit 1
          fi

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"🚨 Copilot agent regression detected!"}'
```

### What to Track for Regression

- **Topic routing** — same input should trigger same topic
- **Response content** — factual accuracy of answers
- **Generative answer quality** — use LLM-as-judge scores over time
- **Latency** — response time degradation
- **Fallback rate** — increase in unhandled queries
- **Adaptive card structure** — cards should maintain expected format

---

## 8. Topic-Level vs End-to-End Testing

### Topic-Level (Unit) Testing

Test individual topics in isolation with their specific trigger phrases.

| Aspect | Approach |
|--------|----------|
| **Trigger testing** | Send known trigger phrases, verify correct topic fires |
| **Slot filling** | Test entity extraction with various input formats |
| **Branching logic** | Test each condition branch within a topic |
| **Error handling** | Send invalid inputs, verify graceful handling |
| **Variable setting** | Check that topic sets expected variables |

```python
# Topic-level test examples
TOPIC_TESTS = {
    "Greeting": [
        TestCase("Hello", expected_keywords=["welcome", "help"]),
        TestCase("Hi there", expected_keywords=["welcome", "help"]),
        TestCase("Good morning", expected_keywords=["welcome", "help"]),
    ],
    "Store Hours": [
        TestCase("What time do you open?", expected_keywords=["9", "AM"]),
        TestCase("Are you open on weekends?", expected_keywords=["Saturday"]),
    ],
    "Password Reset": [
        TestCase("I forgot my password", expected_keywords=["reset", "email"]),
        TestCase("Can't log in", expected_keywords=["password", "reset"]),
    ],
}
```

### End-to-End (Conversation Flow) Testing

Test complete multi-turn conversation scenarios.

```python
# Multi-turn E2E test
E2E_SCENARIOS = [
    {
        "name": "Complete order inquiry flow",
        "turns": [
            TestCase("I want to check my order status",
                     expected_keywords=["order number"]),
            TestCase("ORD-12345",
                     expected_keywords=["shipped", "tracking"]),
            TestCase("When will it arrive?",
                     expected_keywords=["estimated", "delivery"]),
            TestCase("Thanks, that's all",
                     expected_keywords=["glad", "help"]),
        ]
    },
    {
        "name": "Escalation to human agent",
        "turns": [
            TestCase("I have a billing issue"),
            TestCase("I was charged twice"),
            TestCase("I want to speak to a human",
                     expected_keywords=["transfer", "agent"]),
        ]
    },
]
```

### Testing Strategy Matrix

| Level | Scope | Frequency | Tool |
|-------|-------|-----------|------|
| **Smoke** | 5-10 critical paths | Every deployment | CI/CD pipeline |
| **Topic unit** | All topics, 2-3 phrases each | Daily | Power CAT Kit / pytest |
| **E2E flows** | Full conversation scenarios | Daily | Direct Line + pytest |
| **Regression** | Full baseline comparison | On change + daily | Scheduled pipeline |
| **Load** | Concurrent conversations | Pre-release | Custom load test |

---

## 9. Analytics and Evaluation

### Built-in Copilot Studio Analytics

Available from the **Analytics** page in Copilot Studio:

- **Overview** — AI-generated summary of key insights, engagement/resolution rates
- **Conversations** — total sessions, session outcomes, escalation rate
- **Effectiveness** — resolution rate, abandon rate, CSAT scores
- **Themes** — AI-grouped clusters of user questions triggering generative answers
- **Satisfaction** — customer satisfaction survey results
- **Conversation transcripts** — downloadable within 29 days

> Analytics **exclude** test panel conversations.

### Conversation Transcripts for Testing

```python
# Access transcripts via Dataverse API
import requests

def get_transcripts(dataverse_url: str, token: str, bot_id: str,
                    days: int = 7) -> list:
    """Fetch recent conversation transcripts from Dataverse."""
    url = (f"{dataverse_url}/api/data/v9.2/conversationtranscripts"
           f"?$filter=_bot_conversationtranscriptid_value eq '{bot_id}'"
           f"&$top=100&$orderby=createdon desc")

    resp = requests.get(url, headers={
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    })
    return resp.json()["value"]
```

### Power CAT Kit Conversation KPIs

The Kit's Conversation KPI feature:
- Parses conversation transcripts from Dataverse
- Generates aggregated KPI records
- Tracks custom variables (e.g., NPS scores)
- Supports transcript visualization
- Complements built-in analytics with Dataverse-stored data

### AI-Based Evaluation with Rubrics

The Kit supports **user-defined rubrics** for evaluating generative answers:

1. Define evaluation criteria (accuracy, tone, completeness, etc.)
2. Set scoring scales and pass thresholds
3. Use **Rubric Refinement** to iteratively improve rubrics against human judgment
4. AI Builder applies rubrics during test runs automatically

---

## 10. Load & Performance Testing

### Approach: Concurrent Direct Line Sessions

```python
import asyncio
import aiohttp
import time
from dataclasses import dataclass, field

@dataclass
class LoadTestResult:
    total_requests: int = 0
    successful: int = 0
    failed: int = 0
    avg_latency_ms: float = 0
    p95_latency_ms: float = 0
    max_latency_ms: float = 0
    latencies: list = field(default_factory=list)

async def single_conversation(session, token_endpoint, bot_name, message):
    """Run a single conversation and measure latency."""
    start = time.time()
    try:
        # Get token
        async with session.get(token_endpoint) as resp:
            token_data = await resp.json()
        token = token_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        DL = "https://directline.botframework.com/v3/directline"

        # Start conversation
        async with session.post(f"{DL}/conversations",
                                headers=headers) as resp:
            conv = await resp.json()

        # Send message
        await session.post(
            f"{DL}/conversations/{conv['conversationId']}/activities",
            headers={**headers, "Content-Type": "application/json"},
            json={"type": "message", "from": {"id": "load-test"}, "text": message}
        )

        # Poll for response
        for _ in range(30):
            await asyncio.sleep(1)
            async with session.get(
                f"{DL}/conversations/{conv['conversationId']}/activities",
                headers=headers
            ) as resp:
                data = await resp.json()
                bot_msgs = [a for a in data.get("activities", [])
                           if a["type"] == "message"
                           and a.get("from", {}).get("name") == bot_name]
                if bot_msgs:
                    return time.time() - start, True

        return time.time() - start, False
    except Exception:
        return time.time() - start, False

async def run_load_test(token_endpoint: str, bot_name: str,
                        concurrent_users: int = 10,
                        messages_per_user: int = 3) -> LoadTestResult:
    """Run a load test with concurrent conversations."""
    result = LoadTestResult()
    messages = ["Hello", "What are your hours?", "How do I contact support?"]

    async with aiohttp.ClientSession() as session:
        tasks = []
        for _ in range(concurrent_users):
            for msg in messages[:messages_per_user]:
                tasks.append(
                    single_conversation(session, token_endpoint, bot_name, msg)
                )

        responses = await asyncio.gather(*tasks)

    for latency, success in responses:
        result.total_requests += 1
        result.latencies.append(latency * 1000)
        if success:
            result.successful += 1
        else:
            result.failed += 1

    if result.latencies:
        result.latencies.sort()
        result.avg_latency_ms = sum(result.latencies) / len(result.latencies)
        result.p95_latency_ms = result.latencies[int(len(result.latencies) * 0.95)]
        result.max_latency_ms = max(result.latencies)

    return result

# Usage
if __name__ == "__main__":
    result = asyncio.run(run_load_test(
        "https://your-token-endpoint",
        "Your Agent",
        concurrent_users=50,
        messages_per_user=3
    ))
    print(f"Total: {result.total_requests} | "
          f"Success: {result.successful} | "
          f"Failed: {result.failed}")
    print(f"Avg: {result.avg_latency_ms:.0f}ms | "
          f"P95: {result.p95_latency_ms:.0f}ms | "
          f"Max: {result.max_latency_ms:.0f}ms")
```

### Azure Load Testing Integration

```yaml
# load-test-config.yaml
version: v0.1
testId: copilot-agent-load-test
testPlan: copilot-load-test.jmx
engineInstances: 3
failureCriteria:
  - avg(response_time_ms) > 5000
  - percentage(error) > 10
```

### Key Metrics to Monitor

- **Response latency** (avg, P50, P95, P99)
- **Error rate** under load
- **Throughput** (conversations per minute)
- **Token endpoint availability**
- **Direct Line API throttling** (429 responses)
- **Concurrent conversation limits**

### Rate Limits

Be aware of Direct Line API rate limits:
- Conversation starts: throttled per bot
- Messages per conversation: throttled
- Polling frequency: recommended 1-2 second intervals

---

## 11. Best Practices

### Test Data Management

- **Maintain test cases in version control** — CSV/JSON files alongside your solution
- **Separate test data by environment** — dev/staging/prod token endpoints
- **Use realistic test data** — mirror actual user queries from analytics themes
- **Rotate test questions** — prevent overfitting to specific phrases
- **Include edge cases** — empty inputs, very long messages, special characters, multiple languages

### Environment Strategy

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Dev Env    │────▶│  Test/QA Env  │────▶│  Prod Env   │
│              │     │              │     │             │
│ • Author     │     │ • Full test  │     │ • Smoke     │
│ • Unit test  │     │   suite      │     │   tests     │
│ • Test panel │     │ • Regression │     │ • Monitoring│
│              │     │ • Load test  │     │ • Analytics │
└─────────────┘     └──────────────┘     └─────────────┘
```

- **Dev**: Interactive testing via test canvas + topic-level tests
- **Test/QA**: Full automated suite, regression baseline, load testing
- **Prod**: Smoke tests post-deployment, ongoing monitoring via analytics

### Mocking External Connectors/APIs

When testing topics that call external services:

1. **Environment variables** — point connectors to mock endpoints per environment
2. **Power Automate mock flows** — create simplified flows that return canned responses
3. **Custom connector stubs** — create test versions of custom connectors
4. **API mocking services** — use tools like WireMock or Mockoon behind your connectors

### Test Naming & Organization

```
tests/
├── smoke/
│   └── test_basic_functionality.py
├── topics/
│   ├── test_greeting.py
│   ├── test_faq.py
│   └── test_escalation.py
├── e2e/
│   ├── test_order_flow.py
│   └── test_support_flow.py
├── regression/
│   ├── baseline_responses.json
│   └── test_regression.py
├── load/
│   └── test_load.py
└── conftest.py  # Shared fixtures (tester instance, etc.)
```

### Key Recommendations

1. **Start with the built-in Evaluation feature** for quick wins — it requires no setup
2. **Deploy the Power CAT Kit** for organizational-scale testing with governance
3. **Add Direct Line API tests to CI/CD** for deployment gating
4. **Use LLM-as-judge** for generative/non-deterministic responses
5. **Run regression tests daily** to catch drift from knowledge source or model changes
6. **Monitor production** via built-in analytics and Conversation KPIs
7. **Test authentication flows** separately — the Kit supports Entra ID v2 with SSO
8. **Export and archive results** — built-in evaluation results expire after 89 days
9. **Use themes from analytics** to create test cases from real user questions
10. **Track latency trends** — performance degradation is often the first sign of issues

---

## References

- [Copilot Studio — Test Your Agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-test-bot)
- [Copilot Studio — Agent Evaluation (Preview)](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-agent-evaluation-create)
- [Copilot Studio — Analytics Overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-overview)
- [Power CAT Copilot Studio Kit (GitHub)](https://github.com/microsoft/Power-CAT-Copilot-Studio-Kit)
- [Power CAT Kit — Testing Capabilities](https://github.com/microsoft/Power-CAT-Copilot-Studio-Kit/blob/main/TESTING_CAPABILITIES.md)
- [Power CAT Kit — Automated Testing with Pipelines](https://github.com/microsoft/Power-CAT-Copilot-Studio-Kit/blob/main/AUTOMATED_TESTING.md)
- [Connect Agent to Custom App (Direct Line)](https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-connect-bot-to-custom-application)
- [Bot Framework Direct Line API 3.0](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-concepts)
- [Power Platform Pipelines](https://learn.microsoft.com/en-us/power-platform/alm/pipelines)
