# Excel Currency Automation — Office Scripts + Power Automate

## The Problem

You have an O365 Excel workbook that uses a **currency picker** cell and the `_FV` (FinanceValue / connected data) function to fetch live exchange rates. You want to automate filling an expenses table with converted amounts.

**Why .NET / Graph API won't work:**

- The Graph API treats Excel as a data store — it can read/write cells and run basic formulas.
- `_FV` is a **connected data function** (like Stocks/Geography data types). It requires the Excel calculation engine running inside the Office host to resolve.
- Graph API's `calculate` endpoint only triggers standard formulas, **not** connected data refresh.
- Result: writing a currency code via Graph API leaves `_FV` cells showing stale or `#BUSY!` values.

## The Solution

**Office Scripts** run inside Excel Online's full calculation engine, so `_FV` functions resolve naturally after a recalc. **Power Automate** orchestrates the scripts, passing parameters and handling scheduling/triggers.

```
Trigger (Power Automate)
  → Run Office Script (setCurrency / fillExpenses / bulkConvert)
    → Script writes to cells → Excel recalculates → _FV resolves
    → Script reads converted values → returns results
  → Power Automate continues (store, notify, etc.)
```

## Repository Structure

```
scripts/
  setCurrency.ts      — Set currency picker, return converted value
  fillExpenses.ts     — Fill expense rows with converted amounts
  bulkConvert.ts      — Batch-convert an array of amounts
power-automate/
  flow-design.md      — Power Automate flow design & setup guide
dotnet-alternative/
  README.md           — .NET fallback using external FX API
```

## Quick Start

### 1. Upload Office Scripts

1. Open your workbook in **Excel Online**.
2. Go to **Automate → New Script**.
3. Paste each `.ts` file from `scripts/` and save with the matching name.

### 2. Create Power Automate Flow

Follow `power-automate/flow-design.md` for step-by-step flow creation.

### 3. Test

- Run the flow manually first.
- Verify that `_FV` cells resolve (not `#BUSY!`).
- Check the expenses table for correct converted values.

## Workbook Assumptions

| Item | Expected |
|---|---|
| Currency picker cell | `Sheet1!B2` (write target currency code here, e.g. `USD`) |
| `_FV` rate cell | `Sheet1!C2` (contains `=_FV(...)` that returns the exchange rate) |
| Expenses table | Named table `Expenses` with columns: Description, Amount, Currency, ConvertedAmount |

Adjust cell references in the scripts to match your workbook layout.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `_FV` shows `#BUSY!` after script | Increase the delay in `waitForRecalc()`. Connected data can take 2-5 seconds. |
| Script timeout | Power Automate has a 120s script timeout. Reduce batch sizes. |
| "Script not found" in Power Automate | Ensure scripts are saved in the workbook (not personal). |
| Rate returns 0 or stale | The workbook must be in OneDrive/SharePoint (not local). `_FV` only works in Excel Online. |
