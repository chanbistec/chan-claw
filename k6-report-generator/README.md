# k6 Performance Test Report Generator

Generates a professional, client-ready Word (.docx) report from k6 test results.

## Supported Input Formats

| Format | How to Export from k6 | Best For |
|---|---|---|
| **JSON summary** | `handleSummary()` in your script | Smallest file, aggregated data |
| **JSON lines** | `k6 run --out json=results.json script.js` | Granular data + time-series charts |
| **CSV** | `k6 run --out csv=results.csv script.js` | Spreadsheet-compatible |

### Exporting from k6

```bash
# Option 1: JSON line-delimited (recommended — enables time-series charts)
k6 run --out json=results.json script.js

# Option 2: CSV
k6 run --out csv=results.csv script.js

# Option 3: JSON summary (add to your k6 script)
export function handleSummary(data) {
  return { "summary.json": JSON.stringify(data) };
}
```

## Requirements

```bash
pip install python-docx matplotlib
```

## Usage

```bash
# Basic
python generate_report.py -i results.json -f json

# Full options
python generate_report.py \
  -i results.json \
  -f json \
  -t "Payment API Load Test" \
  -c "Acme Corp" \
  -e "Production" \
  --tester "QA Team" \
  --version "v2.4.1" \
  --notes "Test conducted during maintenance window" \
  -o payment-api-perf-report.docx
```

## Report Contents

1. **Cover Page** — title, client, environment, date, confidentiality notice
2. **Executive Summary** — key metrics at a glance with pass/marginal/fail verdict
3. **Test Configuration** — environment, tool, VUs, iterations
4. **Results Overview** — data transfer, throughput, error rate
5. **Response Time Analysis** — percentile table + bar chart + phase breakdown chart + time-series (if available)
6. **Throughput & Errors** — request counts, success/failure breakdown
7. **Checks & Thresholds** — pass/fail status for all k6 checks and thresholds
8. **Detailed Metrics** — full breakdown by category (HTTP, Execution, Network, Custom)
9. **Recommendations** — auto-generated based on metrics (high latency, errors, TLS overhead, etc.)

## CLI Options

| Flag | Default | Description |
|---|---|---|
| `-i, --input` | (required) | Path to k6 results file |
| `-f, --format` | (required) | `json` or `csv` |
| `-o, --output` | `k6-report-YYYY-MM-DD.docx` | Output file path |
| `-t, --title` | `Performance Test Report` | Report title |
| `-c, --client` | `[Client Name]` | Client company name |
| `-e, --env` | `Production` | Test environment |
| `--tester` | `QA Team` | Tester name/team |
| `--version` | | Application version |
| `--notes` | | Additional notes |
