# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

########################################
# System Setup & Driver Installation
########################################

.DEFAULT_GOAL := help

INCLUDE_GPU ?= True
INCLUDE_NPU ?= True

GPU_FLAG := $(if $(filter True true TRUE yes YES,$(INCLUDE_GPU)),--reinstall-gpu-driver=yes,)
NPU_FLAG := $(if $(filter True true TRUE yes YES,$(INCLUDE_NPU)),--reinstall-npu-driver=yes,)

.PHONY: help
help:
	@echo "System Setup & Driver Installation"
	@echo "==================================="
	@echo ""
	@echo "Targets:"
	@echo "  make prereqs                Install OS dependencies and compute drivers"
	@echo "  make check                  Run system compatibility check"
	@echo ""
	@echo "Options:"
	@echo "  INCLUDE_GPU=True|False      Install GPU drivers (default: True)"
	@echo "  INCLUDE_NPU=True|False      Install NPU drivers (default: True)"
	@echo ""
	@echo "Examples:"
	@echo "  make prereqs                              # Install everything"
	@echo "  make prereqs INCLUDE_NPU=False             # Skip NPU drivers"

.PHONY: prereqs
prereqs:
	@if [ -x ./install_prerequisites.sh ]; then \
		./install_prerequisites.sh $(GPU_FLAG) $(NPU_FLAG); \
	else \
		echo "[ Error ] install_prerequisites.sh not found or not executable"; \
		exit 1; \
	fi

.PHONY: check
check:
	@if [ -x ./check-compatibility.sh ]; then \
		./check-compatibility.sh; \
	else \
		echo "[ Error ] check-compatibility.sh not found or not executable"; \
		exit 1; \
	fi
