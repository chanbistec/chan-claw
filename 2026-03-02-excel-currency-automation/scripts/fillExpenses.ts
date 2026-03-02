/**
 * fillExpenses.ts — Office Script
 *
 * Accepts an array of expense entries, fills the ExpensesTable,
 * and converts amounts using the workbook's _FV exchange rates.
 *
 * For each unique currency, the script updates the currency picker,
 * forces recalc to refresh _FV rates, then writes converted values.
 *
 * Usage from Power Automate:
 *   Parameters: {
 *     "expenses": [
 *       { "description": "Hotel", "amount": 150.00, "currency": "EUR" },
 *       { "description": "Taxi",  "amount": 45.00,  "currency": "GBP" }
 *     ],
 *     "baseCurrency": "USD"
 *   }
 */

function main(
  workbook: ExcelScript.Workbook,
  expenses: ExpenseEntry[],
  baseCurrency: string = "USD"
): FillExpensesResult {
  // --- Configuration ---
  const SETTINGS_SHEET = "Settings";
  const CURRENCY_CELL = "B2";
  const RATE_CELL = "B3";
  const TABLE_NAME = "ExpensesTable";

  // Expected table columns (0-indexed):
  // 0: Description, 1: Amount (original), 2: Currency, 3: Converted Amount
  const COL_DESC = 0;
  const COL_AMOUNT = 1;
  const COL_CURRENCY = 2;
  const COL_CONVERTED = 3;

  if (!expenses || expenses.length === 0) {
    throw new Error("expenses array is required and must not be empty");
  }

  const settingsSheet = workbook.getWorksheet(SETTINGS_SHEET);
  if (!settingsSheet) {
    throw new Error(`Worksheet "${SETTINGS_SHEET}" not found`);
  }

  const table = workbook.getTable(TABLE_NAME);
  if (!table) {
    throw new Error(`Table "${TABLE_NAME}" not found. Create a table named "${TABLE_NAME}" in your workbook.`);
  }

  const pickerCell = settingsSheet.getRange(CURRENCY_CELL);
  const rateCell = settingsSheet.getRange(RATE_CELL);

  // Group expenses by currency to minimize picker changes
  const byCurrency = new Map<string, { index: number; entry: ExpenseEntry }[]>();
  expenses.forEach((entry, index) => {
    const cur = (entry.currency || baseCurrency).toUpperCase();
    if (!byCurrency.has(cur)) {
      byCurrency.set(cur, []);
    }
    byCurrency.get(cur)!.push({ index, entry });
  });

  // Prepare results array
  const summary: RowSummary[] = [];
  const convertedAmounts = new Array<number>(expenses.length);

  // Process each currency group
  for (const [currency, items] of byCurrency) {
    let rate = 1.0;

    if (currency !== baseCurrency) {
      // Update currency picker to get the rate for this currency
      pickerCell.setValue(currency);
      workbook.getApplication().calculate(ExcelScript.CalculationType.fullRebuild);

      rate = rateCell.getValue() as number;

      // Retry once if rate looks invalid
      if (typeof rate !== "number" || isNaN(rate) || rate <= 0) {
        workbook.getApplication().calculate(ExcelScript.CalculationType.full);
        rate = rateCell.getValue() as number;
      }

      if (typeof rate !== "number" || isNaN(rate) || rate <= 0) {
        // Skip this group with an error note
        for (const { index, entry } of items) {
          convertedAmounts[index] = 0;
          summary.push({
            row: index,
            description: entry.description,
            originalAmount: entry.amount,
            currency,
            convertedAmount: 0,
            status: `ERROR: Could not get rate for ${currency}`,
          });
        }
        continue;
      }
    }

    // Convert and record each expense in this currency group
    for (const { index, entry } of items) {
      const converted = currency === baseCurrency
        ? entry.amount
        : entry.amount * rate;

      convertedAmounts[index] = Math.round(converted * 100) / 100;

      summary.push({
        row: index,
        description: entry.description,
        originalAmount: entry.amount,
        currency,
        convertedAmount: convertedAmounts[index],
        status: "OK",
      });
    }
  }

  // Write all rows to the table
  // Clear existing data rows first
  const existingBody = table.getRangeBetweenHeaderAndTotal();
  if (existingBody.getRowCount() > 0) {
    existingBody.clear(ExcelScript.ClearApplyTo.contents);
  }

  // Resize table if needed — delete excess rows, add missing rows
  const currentRowCount = table.getRowCount();
  const neededRows = expenses.length;

  if (currentRowCount > neededRows) {
    for (let i = currentRowCount - 1; i >= neededRows; i--) {
      table.deleteRowsAt(i, 1);
    }
  } else if (currentRowCount < neededRows) {
    for (let i = currentRowCount; i < neededRows; i++) {
      table.addRow(i, ["", 0, "", 0]);
    }
  }

  // Fill table rows
  for (let i = 0; i < expenses.length; i++) {
    const entry = expenses[i];
    const currency = (entry.currency || baseCurrency).toUpperCase();
    const row = table.getRangeBetweenHeaderAndTotal().getRow(i);
    const values = row.getValues();

    values[0][COL_DESC] = entry.description;
    values[0][COL_AMOUNT] = entry.amount;
    values[0][COL_CURRENCY] = currency;
    values[0][COL_CONVERTED] = convertedAmounts[i];

    row.setValues(values);
  }

  // Reset picker to base currency
  pickerCell.setValue(baseCurrency);
  workbook.getApplication().calculate(ExcelScript.CalculationType.full);

  return {
    filled: expenses.length,
    baseCurrency,
    summary,
  };
}

interface ExpenseEntry {
  description: string;
  amount: number;
  currency: string;
}

interface RowSummary {
  row: number;
  description: string;
  originalAmount: number;
  currency: string;
  convertedAmount: number;
  status: string;
}

interface FillExpensesResult {
  filled: number;
  baseCurrency: string;
  summary: RowSummary[];
}
