# Eye of Sauron Token Efficiency Plan

---

## Principles
- Minimize token usage for telemetry, API payloads, report uploads.
- Avoid unnecessary large AI calls for pattern recognition / analysis.

---

## Strategies

✅ **Batching**
- Combine file analysis metrics in API telemetry calls (batch upload per N files)

✅ **Caching**
- Cache analyzer results for unchanged files in incremental mode
- Deduplicate identical issues across files before telemetry

✅ **Delta Updates**
- API sends only diff report segments if prior report exists

✅ **Standardized Prompt Templates**
- Use pre-built analysis prompts for any AI-assisted pattern detection to minimize token inflation

✅ **Token Cost Logging**
- Record estimated token use per scan for future optimization

---

## Goals
- Keep telemetry/AI calls under $0.01 per scan  
- Sub-5% redundant token usage across scans  
- <10KB typical API payload size
