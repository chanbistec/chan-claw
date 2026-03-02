# Excel Currency Picker Automation with Office Scripts + Power Automate

## The Problem

You have an Excel workbook on Microsoft 365 with:
- A **currency picker** cell (data validation dropdown) — e.g., cell `B2` on a "Settings" sheet
- **Exchange rates** powered by Excel's built-in `_FV` connected data function (the "Stocks & Currency" data type)
- An **expenses table** that multiplies amounts by the live exchange rate

### Why .NET / Graph API Can't Do This

The Microsoft Graph API can read and write cell *values*, but it **cannot trigger Excel's connected data functions** like `_FV`. Here's why:

| Approach | Writes Values | Triggers `_FV` Recalc | Runs in Excel Engine |
|----------|:---:|:---:|:---:|
| Graph API (REST) | ✅ | ❌ | ❌ |
| Excel Interop (.NET) | ✅ | ❌ (no O365 session) | ❌ |
| Office Scripts (via Power Automate) | ✅ | ✅ | ✅ |

**`_FV` is a connected data type** — it fetches live data from Microsoft's financial data provider. This only happens inside Excel's calculation engine during an active session. Graph API writes are "cold" — they update the cell text but never trigger the data connection refresh.

**Office Scripts** run *inside* Excel Online's calculation engine. When a script writes to the currency picker cell and calls `workbook.getApplication().calculate()`, Excel treats it exactly like a user edit — the `_FV` function fires, fetches the new rate, and dependent formulas recalculate.

## Solution Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Trigger         │────▶│  Power Automate   │────▶│  Excel Online        │
│  (HTTP/Schedule/ │     │  Flow             │     │  (Office Script)     │
│   Forms/Manual)  │     │                   │     │                      │
└─────────────────┘     └──────────────────┘     │  1. Write currency   │
                                                   │  2. calculate()      │
                                                   │  3. _FV refreshes    │
                                                   │  4. Read new rate    │
                                                   │  5. Return result    │
                                                   └─────────────────────┘
```

## Prerequisites

1. **Microsoft 365 Business** license (Office Scripts requires Business Standard/Premium or E3/E5)
2. **Power Automate** license (included with M365 Business)
3. The Excel workbook stored in **OneDrive for Business** or **SharePoint**
4. Office Scripts enabled by your tenant admin (Admin Center → Settings → Org settings → Office Scripts)

## Workbook Layout Assumptions

| Sheet | Cell/Range | Purpose |
|-------|-----------|---------|
| Settings | `B2` | Currency picker dropdown (e.g., "USD", "EUR", "GBP") |
| Settings | `B3` | Exchange rate (formula using `_FV`, e.g., `=_FV("USD/EUR")`) |
| Expenses | Table "ExpensesTable" | Columns: Description, Amount (local), Currency, Converted Amount |

## Step-by-Step Setup

### 1. Create Office Scripts

Open your workbook in Excel Online → **Automate** tab → **New Script**.

Create three scripts (code in the `scripts/` folder of this repo):

- **setCurrency.ts** — Sets the currency picker and returns the refreshed rate
- **fillExpenses.ts** — Fills the expenses table with converted values
- **bulkConvert.ts** — Bulk-converts an array of amounts between currencies

Paste each script, click **Save**, and give it a clear name.

> 📸 *The Automate tab shows "New Script" button. After pasting, the script appears in "My Scripts" in the Code Editor pane on the right side.*

### 2. Test Scripts Manually

In the Code Editor, use the **Run** button. For scripts with parameters, Excel will prompt you to enter JSON input.

Test `setCurrency` with:
```json
{ "targetCurrency": "GBP" }
```

Verify that cell `B2` updates and `B3` shows the new exchange rate.

### 3. Create Power Automate Flow

See [power-automate/flow-design.md](power-automate/flow-design.md) for detailed flow configuration.

### 4. (Optional) .NET Alternative

If you can't use Office Scripts (e.g., no Business license), see [dotnet-alternative/README.md](dotnet-alternative/README.md) for a Graph API + external exchange rate API approach.

## Scripts Reference

| Script | Input | Output | Use Case |
|--------|-------|--------|----------|
| `setCurrency.ts` | `targetCurrency: string` | `{ rate: number, currency: string }` | Change picker, get new rate |
| `fillExpenses.ts` | `expenses: {desc, amount, currency}[]` | `{ filled: number, summary: {...}[] }` | Batch-fill expense rows |
| `bulkConvert.ts` | `source, target, amounts[]` | `{ convertedAmounts: number[] }` | Convert amounts without touching table |

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `_FV` returns `#VALUE!` after script | Recalc timing | Add a brief pause or second `calculate()` call |
| Script times out | Large workbook | Reduce scope; avoid full-workbook recalc |
| "Office Scripts not available" | Tenant policy | Admin must enable in M365 Admin Center |
| Power Automate can't find script | Script not saved to OneDrive | Re-save from Excel Online |
| Rate returns 0 or stale | `_FV` data connection throttled | Wait and retry; Microsoft throttles frequent calls |

## License

MIT
