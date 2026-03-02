# .NET Alternative: Graph API + External Exchange Rate API

## Why This Exists

If you can't use Office Scripts + Power Automate (e.g., no M365 Business license, need tighter .NET integration, or want to avoid Power Automate costs at scale), this approach bypasses `_FV` entirely by fetching exchange rates from an external API.

## Tradeoffs

| Aspect | Office Scripts + Power Automate | .NET + External API |
|---|---|---|
| Uses workbook's `_FV` rates | ✅ Yes — same rates as manual use | ❌ No — rates may differ slightly |
| Requires M365 Business | ✅ Yes | ❌ No (any Graph API access) |
| Rate source | Microsoft's connected data | Your chosen API (may need paid plan) |
| Latency | ~5-15s per currency (recalc wait) | ~200ms per API call |
| Offline/batch capable | ❌ Needs Excel Online running | ✅ Fully independent |
| Complexity | Low (no-code flow + scripts) | Medium (C# code, auth, API keys) |

## Architecture

```
.NET App
  → Call exchange rate API (e.g., exchangerate-api.com, Open Exchange Rates)
  → Calculate conversions in code
  → Write results to Excel via Microsoft Graph API
```

## Sample Code

### 1. Install Packages

```bash
dotnet add package Microsoft.Graph
dotnet add package Azure.Identity
```

### 2. Exchange Rate Service

```csharp
using System.Net.Http.Json;

public class ExchangeRateService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    public ExchangeRateService(HttpClient http, string apiKey)
    {
        _http = http;
        _apiKey = apiKey;
    }

    public async Task<decimal> GetRateAsync(string from, string to)
    {
        // Using exchangerate-api.com (free tier: 1500 req/month)
        var url = $"https://v6.exchangerate-api.com/v6/{_apiKey}/pair/{from}/{to}";
        var result = await _http.GetFromJsonAsync<ExchangeResponse>(url);
        return result?.ConversionRate ?? throw new Exception($"No rate for {from}/{to}");
    }
}

public record ExchangeResponse(
    string Result,
    decimal ConversionRate
);
```

### 3. Write to Excel via Graph API

```csharp
using Azure.Identity;
using Microsoft.Graph;

public class ExpenseWriter
{
    private readonly GraphServiceClient _graph;
    private readonly ExchangeRateService _rates;

    public ExpenseWriter(ExchangeRateService rates, string tenantId, string clientId, string clientSecret)
    {
        var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        _graph = new GraphServiceClient(credential);
        _rates = rates;
    }

    public async Task FillExpensesAsync(
        string userId,
        string driveItemId,
        string targetCurrency,
        List<ExpenseEntry> expenses)
    {
        // Group by currency to minimize API calls
        var grouped = expenses.GroupBy(e => e.Currency.ToUpper());
        var rates = new Dictionary<string, decimal>();

        foreach (var group in grouped)
        {
            rates[group.Key] = await _rates.GetRateAsync(group.Key, targetCurrency);
        }

        // Build rows for the table
        var rows = expenses.Select(e => new
        {
            values = new object[][]
            {
                new object[]
                {
                    e.Description,
                    e.Amount,
                    e.Currency,
                    Math.Round(e.Amount * rates[e.Currency.ToUpper()], 2)
                }
            }
        });

        // Add rows to the Expenses table
        foreach (var row in rows)
        {
            await _graph.Users[userId]
                .Drive.Items[driveItemId]
                .Workbook.Tables["Expenses"]
                .Rows
                .PostAsync(new Microsoft.Graph.Models.WorkbookTableRow
                {
                    Values = new UntypedArray(
                        row.values[0].Select(v => v switch
                        {
                            string s => new UntypedString(s),
                            decimal d => new UntypedDouble((double)d),
                            double d => new UntypedDouble(d),
                            _ => new UntypedString(v?.ToString() ?? "")
                        }).ToList<UntypedNode>())
                });
        }
    }
}

public record ExpenseEntry(string Description, decimal Amount, string Currency);
```

### 4. Usage

```csharp
var http = new HttpClient();
var rates = new ExchangeRateService(http, "YOUR_API_KEY");
var writer = new ExpenseWriter(rates, "TENANT_ID", "CLIENT_ID", "CLIENT_SECRET");

var expenses = new List<ExpenseEntry>
{
    new("Hotel", 200m, "USD"),
    new("Taxi", 50m, "GBP"),
    new("Dinner", 75m, "EUR"),
};

await writer.FillExpensesAsync(
    userId: "user@contoso.com",
    driveItemId: "DRIVE_ITEM_ID",
    targetCurrency: "EUR",
    expenses: expenses
);
```

## Exchange Rate API Options

| Provider | Free Tier | Notes |
|---|---|---|
| [exchangerate-api.com](https://www.exchangerate-api.com/) | 1,500 req/month | Simple, reliable |
| [Open Exchange Rates](https://openexchangerates.org/) | 1,000 req/month | USD base only on free |
| [Fixer.io](https://fixer.io/) | 100 req/month | EUR base only on free |
| [ECB Reference Rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/) | Unlimited | Free, daily updates only, EUR base |

## When to Choose This

- You need sub-second conversions (no waiting for `_FV` recalc)
- You're already in a .NET codebase and want to avoid Power Automate
- You don't have M365 Business licenses
- You need audit-trail control over which rate source is used
- You're processing thousands of rows (Office Scripts has a 120s timeout)
