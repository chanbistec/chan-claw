/**
 * Office Script: fillExpenses
 *
 * Accepts an array of expense entries, writes them to the Expenses table,
 * sets the currency picker for each unique currency to trigger _FV recalc,
 * and fills in converted amounts.
 *
 * Workbook layout assumptions:
 *   - Currency picker: Sheet1!B2
 *   - _FV rate result: Sheet1!C2
 *   - Table "Expenses" with columns: Description | Amount | Currency | ConvertedAmount
 */

interface ExpenseEntry {
  description: string;
  amount: number;
  currency: string;
}

interface ExpenseResult {
  totalRows: number;
  currencies: string[];
  entries: {
    description: string;
    amount: number;
    currency: string;
    rate: number;
    convertedAmount: number;
  }[];
}

function main(
  workbook: ExcelScript.Workbook,
  targetCurrency: string,
  expenses: string // JSON string — Power Automate passes complex types as strings
): ExpenseResult {
  const entries: ExpenseEntry[] = JSON.parse(expenses);
  const sheet = workbook.getWorksheet("Sheet1");
  const pickerCell = sheet.getRange("B2");
  const rateCell = sheet.getRange("C2");
  const table = workbook.getTable("Expenses");

  // Group entries by currency to minimize _FV recalculations
  const byCurrency = new Map<string, { entry: ExpenseEntry; index: number }[]>();
  entries.forEach((e, i) => {
    const key = e.currency.toUpperCase();
    if (!byCurrency.has(key)) byCurrency.set(key, []);
    byCurrency.get(key)!.push({ entry: e, index: i });
  });

  // Pre-allocate results
  const results: ExpenseResult["entries"] = new Array(entries.length);

  // Process each currency group
  for (const [currency, items] of byCurrency) {
    // Set picker and recalc
    pickerCell.setValue(`${currency}/${targetCurrency}`);
    workbook.getApplication().calculate(ExcelScript.CalculationType.fullRebuild);
    const rate = waitForRate(rateCell, 10, 500);

    for (const { entry, index } of items) {
      const converted = Math.round(entry.amount * rate * 100) / 100;
      results[index] = {
        description: entry.description,
        amount: entry.amount,
        currency: entry.currency,
        rate,
        convertedAmount: converted,
      };
    }
  }

  // Write all rows to the Expenses table
  for (const r of results) {
    table.addRow(-1, [r.description, r.amount, r.currency, r.convertedAmount]);
  }

  return {
    totalRows: results.length,
    currencies: [...byCurrency.keys()],
    entries: results,
  };
}

function waitForRate(
  cell: ExcelScript.Range,
  maxAttempts: number,
  delayMs: number
): number {
  for (let i = 0; i < maxAttempts; i++) {
    const val = cell.getValue();
    if (typeof val === "number" && val > 0) return val;

    const start = Date.now();
    while (Date.now() - start < delayMs) {
      cell.getAddress();
    }
    cell.getWorksheet().getWorkbook().getApplication().calculate(
      ExcelScript.CalculationType.full
    );
  }
  const finalVal = cell.getValue();
  if (typeof finalVal === "number") return finalVal;
  throw new Error(`Rate cell did not resolve. Last value: ${finalVal}`);
}
