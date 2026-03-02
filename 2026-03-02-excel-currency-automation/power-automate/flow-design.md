# Power Automate Flow Design

## Overview

Power Automate connects your triggers (HTTP requests, schedules, Forms, etc.) to the Office Scripts running inside Excel Online. The **Excel Online (Business)** connector's **"Run script"** action executes your script within the Excel calculation engine — which is what makes `_FV` work.

---

## Trigger Options

| Trigger | Use Case | Notes |
|---------|----------|-------|
| **Manual (Instant)** | Testing, ad-hoc runs | "Manually trigger a flow" — button in Power Automate or Teams |
| **Scheduled (Recurrence)** | Daily expense sync | Set frequency, time zone, start time |
| **HTTP Request** | External system integration | Generates a POST URL; call from .NET, cURL, CI/CD pipelines |
| **When a new response is submitted (Forms)** | Employee expense submission | Reads form fields, passes to Office Script |
| **When an item is created (SharePoint)** | New list item triggers conversion | Good for shared expense lists |

---

## Flow Architecture: Scheduled Daily Expense Fill

This example pulls expenses from a SharePoint list every morning and fills the Excel workbook.

### Step-by-Step Configuration

#### Step 1: Create the Flow

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. Click **+ Create** → **Scheduled cloud flow**
3. Set:
   - Name: `Daily Expense Fill`
   - Start: tomorrow at 07:00
   - Repeat every: 1 Day
4. Click **Create**

#### Step 2: Get SharePoint Items

1. Add action: **SharePoint → Get items**
2. Configure:
   - **Site Address**: `https://yourtenant.sharepoint.com/sites/finance`
   - **List Name**: `Pending Expenses`
   - **Filter Query**: `Status eq 'Pending'`
   - **Top Count**: 100

> 📸 *The "Get items" action shows dropdowns for Site Address and List Name. The Filter Query is an OData expression.*

#### Step 3: Build the Expenses Array

1. Add action: **Data Operations → Select**
2. Configure:
   - **From**: `value` (dynamic content from Get items)
   - **Map**:
     - `description` → `Title` (from SharePoint)
     - `amount` → `Amount` (from SharePoint)
     - `currency` → `Currency` (from SharePoint)

This transforms the SharePoint list items into the format our Office Script expects.

#### Step 4: Run the Office Script

1. Add action: **Excel Online (Business) → Run script**
2. Configure:
   - **Location**: OneDrive for Business (or SharePoint site)
   - **Document Library**: Documents
   - **File**: `/Finance/ExpenseTracker.xlsx` (browse to your file)
   - **Script**: `fillExpenses` (select from dropdown)
   - **expenses** (parameter): `Output` from the Select step
   - **baseCurrency** (parameter): `USD`

> 📸 *The "Run script" action shows a file picker and a dropdown of available scripts. Parameters appear as input fields below the script name.*

> ⚠️ **Important**: The script parameter must be valid JSON. The Select action's output is already a JSON array, so it maps directly.

#### Step 5: Handle the Response

The script returns a JSON object. Parse it:

1. Add action: **Data Operations → Parse JSON**
2. Schema:
```json
{
  "type": "object",
  "properties": {
    "filled": { "type": "integer" },
    "baseCurrency": { "type": "string" },
    "summary": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "row": { "type": "integer" },
          "description": { "type": "string" },
          "originalAmount": { "type": "number" },
          "currency": { "type": "string" },
          "convertedAmount": { "type": "number" },
          "status": { "type": "string" }
        }
      }
    }
  }
}
```

#### Step 6: Error Handling

1. After the "Run script" action, click **...** → **Configure run after**
2. Check **has failed** and **has timed out**
3. Add a parallel branch for error handling:

```
Run script
  ├── [Success] → Parse JSON → Update SharePoint items to "Processed"
  └── [Failure] → Send email notification → Log to error list
```

For the error notification:
1. Add action: **Office 365 Outlook → Send an email (V2)**
2. To: `finance-team@company.com`
3. Subject: `⚠️ Expense sync failed`
4. Body: Include the error message from `Run script` outputs

#### Step 7: Mark SharePoint Items as Processed

1. Add action: **Apply to each** (loop over original SharePoint items)
2. Inside: **SharePoint → Update item**
   - Set `Status` to `Processed`
   - Set `ProcessedDate` to `utcNow()`

---

## Flow: HTTP-Triggered Currency Conversion

For calling from external systems (.NET, CI/CD, etc.):

### Setup

1. **Create** → **Instant cloud flow** → trigger: **When an HTTP request is received**
2. Set the Request Body JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "sourceCurrency": { "type": "string" },
    "targetCurrency": { "type": "string" },
    "amounts": {
      "type": "array",
      "items": { "type": "number" }
    }
  },
  "required": ["sourceCurrency", "targetCurrency", "amounts"]
}
```

3. Add **Excel Online (Business) → Run script** with `bulkConvert`
4. Map parameters from the HTTP trigger body
5. Add **Response** action to return the script result

### Calling the Flow

```bash
curl -X POST "https://prod-XX.westus.logic.azure.com:443/workflows/..." \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCurrency": "USD",
    "targetCurrency": "EUR",
    "amounts": [100, 250, 500]
  }'
```

---

## Tips & Gotchas

- **Timeout**: Office Scripts have a **120-second** execution limit. For large datasets, batch your expenses.
- **Concurrency**: Power Automate may run multiple flow instances. Set **Concurrency Control** on the trigger to `1` to avoid race conditions on the currency picker cell.
- **Rate limits**: Excel Online connector has a limit of ~600 calls per connection per minute. For bulk operations, use a single `fillExpenses` call instead of looping `setCurrency`.
- **File locking**: If someone has the workbook open in desktop Excel, the script may fail. Use `Configure run after → has failed` with a retry pattern.
- **Testing**: Use the **Test** button (top-right of flow editor) → **Manually** to test with sample data before enabling the schedule.
