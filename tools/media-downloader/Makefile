# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

########################################
# Media Download & Transcode
########################################

.DEFAULT_GOAL := help

COLLATERAL := $(abspath $(CURDIR)/../../collateral/media)
VERBOSE ?= 0

.PHONY: help
help:
	@echo ""
	@echo "Media Conversion"
	@echo "================"
	@echo ""
	@echo "Checks:"
	@echo "  make verify                 Optional: Check that all required media files are present"
	@echo ""
	@echo "Conversion:"
	@echo "  make download               Download source videos and transcode to H.264/H.265"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean                  Optional: Remove transcoded media from collateral"
	@echo ""

.PHONY: download
download:
	@printf "\033[0;36m[ Info ]\033[0m Downloading and transcoding media...\n"
	@./download_and_encode.sh

.PHONY: verify
verify:
	@bash ../../utils/verify_collateral.sh --section media $(if $(filter 1,$(VERBOSE)),--verbose,)

.PHONY: clean
clean:
	@printf "\033[0;36m[ Info ]\033[0m Removing transcoded media from collateral...\n"
	@rm -f "$(COLLATERAL)/bears.h265" "$(COLLATERAL)/apple.h265"
	@rm -f "$(COLLATERAL)/bears.h264" "$(COLLATERAL)/apple.h264"
	@rm -f "$(COLLATERAL)/bears_4k.h265" "$(COLLATERAL)/apple_4k.h265"
	@rm -f "$(COLLATERAL)/bears_4k.h264" "$(COLLATERAL)/apple_4k.h264"
