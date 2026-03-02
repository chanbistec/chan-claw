# .NET Alternative: Graph API + External Exchange Rate API

## When to Use This

Use this approach when:
- You **don't have** an M365 Business license (no Office Scripts)
- You need the conversion logic **outside** of Excel
- You want to run in a background service / Azure Function without Power Automate
- You don't need to preserve the `_FV` formula — you just need correct rates

## Architecture

Instead of relying on Excel's `_FV` connected data function, fetch exchange rates from a free API and write converted values directly via Microsoft Graph.

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────────┐
│ .NET App /   │────▶│ Exchange Rate API   │     │ Microsoft Graph  │
│ Azure Func   │     │ (frankfurter.app)   │     │ (write cells)    │
│              │     └────────────────────┘     │                  │
│              │─────────────────────────────────▶│ Excel Workbook   │
└─────────────┘                                  └──────────────────┘
```

## Sample C# Code

```csharp
using Microsoft.Graph;
using System.Text.Json;

public class CurrencyExpenseService
{
    private readonly GraphServiceClient _graphClient;
    private readonly HttpClient _httpClient;

    // Workbook identifiers
    private const string DriveItemId = "YOUR_DRIVE_ITEM_ID"; // or use path-based addressing
    private const string WorksheetName = "Expenses";

    public CurrencyExpenseService(GraphServiceClient graphClient, HttpClient httpClient)
    {
        _graphClient = graphClient;
        _httpClient = httpClient;
    }

    /// <summary>
    /// Get exchange rate from frankfurter.app (free, no API key needed, ECB data).
    /// </summary>
    public async Task<decimal> GetExchangeRateAsync(string from, string to)
    {
        var url = $"https://api.frankfurter.app/latest?from={from}&to={to}";
        var response = await _httpClient.GetStringAsync(url);
        var data = JsonDocument.Parse(response);
        return data.RootElement
            .GetProperty("rates")
            .GetProperty(to)
            .GetDecimal();
    }

    /// <summary>
    /// Write expenses with converted amounts directly to Excel via Graph API.
    /// </summary>
    public async Task FillExpensesAsync(
        List<ExpenseEntry> expenses,
        string baseCurrency = "USD")
    {
        // Get unique currencies and fetch all rates in one batch
        var currencies = expenses.Select(e => e.Currency).Distinct().ToList();
        var rates = new Dictionary<string, decimal>();

        foreach (var currency in currencies)
        {
            if (currency == baseCurrency)
            {
                rates[currency] = 1m;
                continue;
            }
            rates[currency] = await GetExchangeRateAsync(currency, baseCurrency);
        }

        // Build the values array for Graph API
        // Each row: [Description, Amount, Currency, ConvertedAmount]
        var values = expenses.Select(e => new object[]
        {
            e.Description,
            e.Amount,
            e.Currency,
            Math.Round(e.Amount * rates[e.Currency], 2)
        }).ToArray();

        // Write to Excel via Graph API
        // Range: starting from A2 (after header row)
        var endRow = expenses.Count + 1;
        var rangeAddress = $"A2:D{endRow}";

        await _graphClient
            .Me.Drive.Items[DriveItemId]
            .Workbook.Worksheets[WorksheetName]
            .Range(rangeAddress)
            .Request()
            .PatchAsync(new WorkbookRange
            {
                Values = JsonDocument.Parse(
                    JsonSerializer.Serialize(values)).RootElement
            });
    }
}

public record ExpenseEntry(string Description, decimal Amount, string Currency);

// --- Usage ---
// var service = new CurrencyExpenseService(graphClient, httpClient);
// var expenses = new List<ExpenseEntry>
// {
//     new("Hotel", 150m, "EUR"),
//     new("Taxi", 45m, "GBP"),
//     new("Lunch", 2500m, "JPY"),
// };
// await service.FillExpensesAsync(expenses, "USD");
```

## Free Exchange Rate APIs

| API | Key Required | Base Data | Rate Limit | URL |
|-----|:---:|-----------|------------|-----|
| **frankfurter.app** | No | ECB (European Central Bank) | Unlimited (fair use) | `api.frankfurter.app/latest?from=USD&to=EUR` |
| **exchangerate-api.com** | Free tier | Multiple sources | 1,500/mo free | `open.er-api.com/v6/latest/USD` |
| **Fixer.io** | Free tier | ECB | 100/mo free | `data.fixer.io/api/latest?access_key=KEY` |

## Tradeoffs vs Office Scripts

| Factor | Office Scripts + Power Automate | .NET + Graph API + External API |
|--------|:---:|:---:|
| Uses Excel's `_FV` rates | ✅ | ❌ (own rates) |
| Preserves workbook formulas | ✅ | ❌ (overwrites with values) |
| Requires M365 Business license | ✅ | ❌ |
| Runs outside Excel | ❌ | ✅ |
| Rate source control | Microsoft's data | You choose |
| Speed for bulk operations | Slower (recalc per currency) | Faster (API + batch write) |
| Works with desktop Excel formulas | ✅ | Partial (values only) |
| CI/CD integration | Via HTTP trigger | Native |
| Offline capable | ❌ | ✅ (with cached rates) |

## Graph API Authentication Setup

For an Azure Function or background service, use **app-only** authentication:

1. Register an app in Azure AD (Entra ID)
2. Grant `Files.ReadWrite.All` application permission
3. Admin consent the permission
4. Use client credentials flow:

```csharp
var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
var graphClient = new GraphServiceClient(credential);
```

For user-delegated scenarios (interactive), use `InteractiveBrowserCredential` or `DeviceCodeCredential`.
