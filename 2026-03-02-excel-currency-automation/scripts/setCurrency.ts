/**
 * Office Script: setCurrency
 *
 * Sets the currency picker cell, waits for _FV to recalculate,
 * and returns the exchange rate.
 *
 * Workbook layout assumptions:
 *   - Currency picker: Sheet1!B2
 *   - _FV rate result: Sheet1!C2
 */

function main(workbook: ExcelScript.Workbook, targetCurrency: string): CurrencyResult {
  const sheet = workbook.getWorksheet("Sheet1");

  // Write target currency to the picker cell
  const pickerCell = sheet.getRange("B2");
  pickerCell.setValue(targetCurrency);

  // Force recalculation so _FV resolves
  workbook.getApplication().calculate(ExcelScript.CalculationType.fullRebuild);

  // Wait for connected data to resolve
  const rate = waitForRecalc(sheet.getRange("C2"), 10, 500);

  return {
    currency: targetCurrency,
    rate: rate,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Polls a cell until it has a numeric value (not #BUSY!, not blank).
 * Throws if maxAttempts exceeded.
 */
function waitForRecalc(
  cell: ExcelScript.Range,
  maxAttempts: number,
  delayMs: number
): number {
  for (let i = 0; i < maxAttempts; i++) {
    const val = cell.getValue();

    // If it's a number, we're done
    if (typeof val === "number" && val > 0) {
      return val;
    }

    // Sleep by doing a benign read in a loop (Office Scripts lack setTimeout)
    const start = Date.now();
    while (Date.now() - start < delayMs) {
      cell.getAddress(); // no-op read to burn time
    }

    // Re-trigger calc in case it stalled
    cell.getWorksheet().getWorkbook().getApplication().calculate(
      ExcelScript.CalculationType.full
    );
  }

  // Return whatever we have — caller should validate
  const finalVal = cell.getValue();
  if (typeof finalVal === "number") {
    return finalVal;
  }
  throw new Error(
    `Cell ${cell.getAddress()} did not resolve after ${maxAttempts} attempts. Last value: ${finalVal}`
  );
}

interface CurrencyResult {
  currency: string;
  rate: number;
  timestamp: string;
}
