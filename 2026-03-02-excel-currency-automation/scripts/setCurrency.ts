/**
 * setCurrency.ts — Office Script
 *
 * Updates the currency picker cell and forces a full recalculation
 * so that _FV connected data functions refresh with the new currency pair.
 *
 * Usage from Power Automate:
 *   Script name: setCurrency
 *   Parameters:  { "targetCurrency": "GBP" }
 *   Returns:     { "currency": "GBP", "rate": 0.79, "previousCurrency": "USD" }
 */

function main(
  workbook: ExcelScript.Workbook,
  targetCurrency: string
): SetCurrencyResult {
  // --- Configuration ---
  const SETTINGS_SHEET = "Settings";
  const CURRENCY_CELL = "B2";   // The data-validation dropdown cell
  const RATE_CELL = "B3";       // Cell containing _FV formula (e.g., =_FV("USD/EUR"))

  // Validate input
  if (!targetCurrency || targetCurrency.trim().length === 0) {
    throw new Error("targetCurrency parameter is required (e.g., 'EUR', 'GBP', 'JPY')");
  }

  const currency = targetCurrency.trim().toUpperCase();

  // Get the settings sheet
  const sheet = workbook.getWorksheet(SETTINGS_SHEET);
  if (!sheet) {
    throw new Error(`Worksheet "${SETTINGS_SHEET}" not found. Check your workbook layout.`);
  }

  // Read previous currency for the response
  const pickerCell = sheet.getRange(CURRENCY_CELL);
  const previousCurrency = pickerCell.getValue() as string;

  // Update the currency picker cell
  pickerCell.setValue(currency);

  // Force full recalculation — this triggers _FV to fetch the new exchange rate
  workbook.getApplication().calculate(ExcelScript.CalculationType.fullRebuild);

  // Read the refreshed exchange rate
  const rateCell = sheet.getRange(RATE_CELL);
  const rate = rateCell.getValue() as number;

  // Validate the rate looks reasonable
  if (typeof rate !== "number" || isNaN(rate) || rate <= 0) {
    // _FV may need a moment — try one more recalc
    workbook.getApplication().calculate(ExcelScript.CalculationType.full);
    const retryRate = rateCell.getValue() as number;

    if (typeof retryRate !== "number" || isNaN(retryRate) || retryRate <= 0) {
      throw new Error(
        `Exchange rate for "${currency}" returned invalid value: ${retryRate}. ` +
        `The _FV function may not support this currency or the data connection is unavailable.`
      );
    }

    return {
      currency,
      rate: retryRate,
      previousCurrency,
    };
  }

  return {
    currency,
    rate,
    previousCurrency,
  };
}

interface SetCurrencyResult {
  currency: string;
  rate: number;
  previousCurrency: string;
}
