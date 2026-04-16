# HTML Dashboard Report

Generates a self-contained HTML dashboard from raw benchmark results for Edge Workloads and Benchmarks.

## Usage

```Makefile
HTML Dashboard Report
=====================

Reporting:
  make report                 Generate data.json + bundled HTML report
                              Run 'make report' again to update with new data

    Options:
      REPORT_NAME             Set report filename (default: report)

  make serve                  Serve generated report locally in web browser
                              Requires 'make report' before running 'make serve'

    Options:
      PORT                    HTTP server port (default: 8000)
      HOSTIP                  HTTP server bind address (default: 127.0.0.1)

Cleanup:
  make clean                  Remove generated data.json and chart.js cache
```

## Requirements

- Python 3.10+
- Generated Benchmark CSV results in `collateral/results/`.

## Overview

1. Collects system information (CPU, GPU driver, NPU driver, VA-API, Docker, OpenVINO, OS, memory) into `system_info.json`.

2. Reads CSV results from all four workload categories:
   - Edge AI Pipelines
   - Vision Benchmarks
   - Media Benchmarks
   - GenAI Benchmarks

3. Aggregates raw benchmark results into `data.json`.

4. Bundles all report collateral into a single self-contained HTML file to `collateral/reports/` at the repository root.

5. **Optional:** Hosts report in web browser using `make serve`.