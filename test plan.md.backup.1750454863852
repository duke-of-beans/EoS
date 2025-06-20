# Eye of Sauron Test Plan

## Scope
Covers CLI, API, scanner engine, report generation, and telemetry.

---

## Test Categories

### 1️⃣ Configuration Loading
✅ CLI loads config from file, env, and args  
✅ API loads defaults + env overrides  
✅ Scanner initializes with distributed config  
✅ Invalid config gracefully fails with clear error

---

### 2️⃣ Scan Execution
✅ Quick, deep, and quantum modes complete without fatal errors  
✅ Scanner respects file size, depth, and pattern exclusions  
✅ Policies enforced via `ScanPolicyManager`  
✅ Vision prophecies generated in cross-file mode  

---

### 3️⃣ Report Generation
✅ JSON report is valid and saves to disk  
✅ Console report prints without error  
✅ HTML report saves if enabled  

---

### 4️⃣ API Endpoints
✅ `/health` returns 200 and correct payload  
✅ `/scan` executes and returns summary  
✅ `/report/:id` retrieves existing reports  

---

### 5️⃣ CI/CD
✅ GitHub Actions pipeline passes on clean code  
✅ Artifacts generated + uploaded  
✅ Node 18.x + 20.x matrix passes  

---

### 6️⃣ Telemetry + Archiving
✅ Telemetry pushes without blocking  
✅ Archives generated and stored  

---

## Artifacts
- `eye-of-sauron-report.json`
- `eye-of-sauron-report.html`
- `scan-artifacts.zip`
- `telemetry-log.json`
