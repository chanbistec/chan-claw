/**
 * Office Script: bulkConvert
 *
 * Accepts a source currency, target currency, and array of amounts.
 * Sets the currency picker to source/target, waits for _FV, and
 * returns all converted amounts.
 *
 * Workbook layout assumptions:
 *   - Currency picker: Sheet1!B2 (accepts "EUR/USD" style pair)
 *   - _FV rate result: Sheet1!C2
 */

interface BulkConvertResult {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  conversions: {
    original: number;
    converted: number;
  }[];
  timestamp: string;
}

function main(
  workbook: ExcelScript.Workbook,
  sourceCurrency: string,
  targetCurrency: string,
  amounts: string // JSON string array, e.g. "[100, 250, 50.75]"
): BulkConvertResult {
  const amountList: number[] = JSON.parse(amounts);
  const sheet = workbook.getWorksheet("Sheet1");
  const pickerCell = sheet.getRange("B2");
  const rateCell = sheet.getRange("C2");

  // Set currency pair
  const pair = `${sourceCurrency.toUpperCase()}/${targetCurrency.toUpperCase()}`;
  pickerCell.setValue(pair);

  // Recalculate
  workbook.getApplication().calculate(ExcelScript.CalculationType.fullRebuild);
  const rate = waitForRate(rateCell, 10, 500);

  // Convert all amounts
  const conversions = amountList.map((amt) => ({
    original: amt,
    converted: Math.round(amt * rate * 100) / 100,
  }));

  return {
    sourceCurrency: sourceCurrency.toUpperCase(),
    targetCurrency: targetCurrency.toUpperCase(),
    rate,
    conversions,
    timestamp: new Date().toISOString(),
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
