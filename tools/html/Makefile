# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

########################################
# HTML Dashboard Report Generation
########################################

.DEFAULT_GOAL := help

PORT ?= 8000
HOSTIP ?= 127.0.0.1
REPORT_NAME ?= report
ROOT := $(realpath $(CURDIR)/../..)

.PHONY: help
help:
	@echo ""
	@echo "HTML Dashboard Report"
	@echo "====================="
	@echo ""
	@echo "Reporting:"
	@echo "  make report                 Generate data.json + bundled HTML report"
	@echo "                              Run 'make report' again to update with new data"
	@echo ""
	@echo "    Options:"
	@echo "      REPORT_NAME             Set report filename (default: report)"
	@echo ""
	@echo "  make serve                  Serve generated report locally in web browser"
	@echo "                              Requires 'make report' to be run first"
	@echo ""
	@echo "    Options:"
	@echo "      PORT                    HTTP server port (default: 8000)"
	@echo "      HOSTIP                  HTTP server bind address (default: 127.0.0.1)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean                  Remove generated data.json and chart.js cache"
	@echo ""

.PHONY: report
report:
	@bash generate_system_info.sh
	@echo "[ Info ] Generating HTML dashboard from CSV results..."
	@python3 generate_report.py
	@echo "[ Info ] Bundling self-contained report..."
	@cd "$(ROOT)" && python3 tools/html/bundle_report.py $(REPORT_NAME)

.PHONY: serve
serve:
	@if [ ! -f index.html ]; then \
		echo "[ Error ] index.html not found."; \
		exit 1; \
	fi
	@echo "[ Info ] Starting HTTP server for HTML dashboard"
	@echo "[ Info ] Dashboard available at: http://$(HOSTIP):$(PORT)"
	@echo "[ Info ] Press Ctrl+C to stop the server"
	@python3 -m http.server $(PORT) --bind $(HOSTIP)

.PHONY: clean
clean:
	@echo "[ Info ] Removing generated report files..."
	@rm -f data.json .chartjs_cache.js
