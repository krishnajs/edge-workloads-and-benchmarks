# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

########################################
# Vision Model Download & Conversion
########################################

.DEFAULT_GOAL := help

IMAGENET_ROOT ?=
COLLATERAL := $(abspath $(CURDIR)/../../collateral/models)
VERBOSE ?= 0

.PHONY: help
help:
	@echo ""
	@echo "Vision Model Conversion"
	@echo "======================="
	@echo ""
	@echo "Checks:"
	@echo "  make verify                 Optional: Check that all required model files are present"
	@echo ""
	@echo "Conversion:"
	@echo "  make download               Download, convert, and quantize all vision models"
	@echo ""
	@echo "  Options:"
	@echo "    IMAGENET_ROOT             Optional: Path to ImageNet dataset for accuracy validation"
	@echo "                              Defaults to CIFAR-100 dataset if unset"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean                  Optional: Remove converted models from collateral"
	@echo "  make clean-venv             Optional: Remove the Python virtual environment"
	@echo ""

.PHONY: download
download:
	@printf "\033[0;36m[ Info ]\033[0m Downloading and quantizing vision models...\n"
	@if [ -n "$(IMAGENET_ROOT)" ]; then \
		./convert_models.sh -i "$(IMAGENET_ROOT)"; \
	else \
		./convert_models.sh; \
	fi

.PHONY: verify
verify:
	@bash ../../utils/verify_collateral.sh --section vision $(if $(filter 1,$(VERBOSE)),--verbose,)

.PHONY: clean
clean:
	@printf "\033[0;36m[ Info ]\033[0m Removing converted models from collateral...\n"
	@rm -rf "$(COLLATERAL)/detection" "$(COLLATERAL)/classification"

.PHONY: clean-venv
clean-venv:
	@printf "\033[0;36m[ Info ]\033[0m Removing virtual environment.\n"
	@rm -rf venv
