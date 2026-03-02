# Power Automate Flow Design

## Overview

Power Automate orchestrates the Office Scripts, passing parameters and handling triggers. The **Excel Online (Business)** connector's "Run script" action executes scripts inside Excel Online's engine, where `_FV` connected data functions work.

## Prerequisites

- Microsoft 365 Business Standard/Premium (Office Scripts requires this)
- Workbook stored in **OneDrive for Business** or **SharePoint**
- Office Scripts saved in the workbook (Automate → New Script)
- Power Automate license (included with M365)

---

## Flow 1: Manual / Scheduled Expense Fill

### Trigger Options

| Trigger | Use Case |
|---|---|
| **Manual trigger** | On-demand with currency + expense JSON input |
| **Recurrence** | Daily/weekly batch processing |
| **When a file is modified** (OneDrive) | React to a CSV upload with new expenses |
| **HTTP request** | Call from .NET or any external system |

### Step-by-Step Setup

#### 1. Create Flow

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. **Create → Instant cloud flow** (or Automated/Scheduled)
3. Choose **Manually trigger a flow**

#### 2. Add Manual Trigger Inputs

Add these inputs to the manual trigger:

- **targetCurrency** (Text) — e.g. `EUR`
- **expenses** (Text) — JSON string:
  ```json
  [
    {"description": "Hotel", "amount": 200, "currency": "USD"},
    {"description": "Taxi", "amount": 50, "currency": "GBP"}
  ]
  ```

#### 3. Run Office Script

1. Add action: **Excel Online (Business) → Run script**
2. Configure:
   - **Location**: OneDrive for Business (or SharePoint site)
   - **Document Library**: OneDrive / Documents
   - **File**: Browse to your workbook
   - **Script**: `fillExpenses`
   - **targetCurrency**: `triggerBody()?['text']` (from trigger input)
   - **expenses**: `triggerBody()?['text_1']` (the JSON string)

#### 4. Parse Results (Optional)

Add **Parse JSON** after the script action:

Schema:
```json
{
  "type": "object",
  "properties": {
    "totalRows": {"type": "integer"},
    "currencies": {"type": "array", "items": {"type": "string"}},
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": {"type": "string"},
          "amount": {"type": "number"},
          "currency": {"type": "string"},
          "rate": {"type": "number"},
          "convertedAmount": {"type": "number"}
        }
      }
    }
  }
}
```

#### 5. Notification (Optional)

Add **Send an email (V2)** or **Post message in Teams** with a summary.

---

## Flow 2: Bulk Convert via HTTP (API Endpoint)

For calling from .NET or external systems.

### Steps

1. **Trigger**: When an HTTP request is received
   - Method: POST
   - Body JSON schema:
     ```json
     {
       "type": "object",
       "properties": {
         "sourceCurrency": {"type": "string"},
         "targetCurrency": {"type": "string"},
         "amounts": {"type": "array", "items": {"type": "number"}}
       }
     }
     ```

2. **Compose**: Create amounts string
   - Expression: `string(triggerBody()?['amounts'])`

3. **Run script**: Excel Online → Run script
   - Script: `bulkConvert`
   - sourceCurrency: `triggerBody()?['sourceCurrency']`
   - targetCurrency: `triggerBody()?['targetCurrency']`
   - amounts: Output of Compose step

4. **Response**: Return script output as HTTP 200 JSON

### Calling from .NET

```csharp
var client = new HttpClient();
var payload = new {
    sourceCurrency = "USD",
    targetCurrency = "EUR",
    amounts = new[] { 100.0, 250.0, 50.75 }
};
var response = await client.PostAsJsonAsync(
    "https://prod-XX.westeurope.logic.azure.com:443/workflows/...",
    payload
);
var result = await response.Content.ReadAsStringAsync();
```

---

## Error Handling

### In the Flow

- Wrap "Run script" in a **Scope** block
- Add a parallel branch **Configure run after → has failed**
- In the failure branch: send alert email / log to SharePoint list

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| Script timeout (120s) | Too many currencies / large batch | Split into smaller batches |
| File locked | Someone has the workbook open in desktop Excel | Use Excel Online only, or retry with delay |
| Script not found | Script not saved to workbook | Re-save via Automate tab in Excel Online |
| `_FV` returns error | Invalid currency code or service down | Validate inputs before calling script |

### Retry Pattern

Add a **Do until** loop around the script action with:
- Condition: `outputs('Run_script')?['statusCode']` equals 200
- Max count: 3
- Add a **Delay** of 10 seconds between retries

---

## Concurrency

⚠️ Only **one script can run per workbook at a time**. If you need parallel processing:

1. Use **Concurrency control = 1** on your flow (Settings → Concurrency Control → On → Degree = 1)
2. Or split data across multiple workbooks
