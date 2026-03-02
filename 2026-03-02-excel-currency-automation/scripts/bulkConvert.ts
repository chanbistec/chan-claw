/**
 * bulkConvert.ts — Office Script
 *
 * Converts an array of amounts from one currency to another
 * using the workbook's _FV exchange rate function.
 *
 * Does NOT modify the expenses table — purely a conversion utility.
 *
 * Usage from Power Automate:
 *   Parameters: {
 *     "sourceCurrency": "USD",
 *     "targetCurrency": "EUR",
 *     "amounts": [100, 250.50, 75, 1000]
 *   }
 *   Returns: {
 *     "sourceCurrency": "USD",
 *     "targetCurrency": "EUR",
 *     "rate": 0.92,
 *     "convertedAmounts": [92.00, 230.46, 69.00, 920.00]
 *   }
 */

function main(
  workbook: ExcelScript.Workbook,
  sourceCurrency: string,
  targetCurrency: string,
  amounts: number[]
): BulkConvertResult {
  // --- Configuration ---
  const SETTINGS_SHEET = "Settings";
  const CURRENCY_CELL = "B2";
  const RATE_CELL = "B3";

  if (!sourceCurrency || !targetCurrency) {
    throw new Error("Both sourceCurrency and targetCurrency are required");
  }
  if (!amounts || amounts.length === 0) {
    throw new Error("amounts array is required and must not be empty");
  }

  const source = sourceCurrency.trim().toUpperCase();
  const target = targetCurrency.trim().toUpperCase();

  // Same currency — no conversion needed
  if (source === target) {
    return {
      sourceCurrency: source,
      targetCurrency: target,
      rate: 1.0,
      convertedAmounts: amounts.map((a) => Math.round(a * 100) / 100),
    };
  }

  const settingsSheet = workbook.getWorksheet(SETTINGS_SHEET);
  if (!settingsSheet) {
    throw new Error(`Worksheet "${SETTINGS_SHEET}" not found`);
  }

  const pickerCell = settingsSheet.getRange(CURRENCY_CELL);
  const rateCell = settingsSheet.getRange(RATE_CELL);

  // Save original currency to restore later
  const originalCurrency = pickerCell.getValue() as string;

  // Set the target currency to get the conversion rate
  pickerCell.setValue(target);
  workbook.getApplication().calculate(ExcelScript.CalculationType.fullRebuild);

  let rate = rateCell.getValue() as number;

  // Retry if rate is invalid
  if (typeof rate !== "number" || isNaN(rate) || rate <= 0) {
    workbook.getApplication().calculate(ExcelScript.CalculationType.full);
    rate = rateCell.getValue() as number;
  }

  if (typeof rate !== "number" || isNaN(rate) || rate <= 0) {
    // Restore original currency before throwing
    pickerCell.setValue(originalCurrency);
    workbook.getApplication().calculate(ExcelScript.CalculationType.full);
    throw new Error(
      `Could not get valid exchange rate for ${source}→${target}. Rate returned: ${rate}`
    );
  }

  // Convert all amounts
  const convertedAmounts = amounts.map((amount) =>
    Math.round(amount * rate * 100) / 100
  );

  // Restore the original currency
  pickerCell.setValue(originalCurrency);
  workbook.getApplication().calculate(ExcelScript.CalculationType.full);

  return {
    sourceCurrency: source,
    targetCurrency: target,
    rate,
    convertedAmounts,
  };
}

interface BulkConvertResult {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  convertedAmounts: number[];
}
