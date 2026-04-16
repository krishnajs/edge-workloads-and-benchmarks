#!/bin/bash

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

require_dir() {
    [[ -d "$1" ]] || { echo "[ Error ] Missing required model directory: $1"; return 1; }
}

validate_assets() {
    (( $# == 1 )) || { echo "[ Error ] validate_assets <models_root>"; return 1; }
    local models="$1" missing=0

    # LLM models
    require_dir "${models}/genai/llama-3.2-3b-instruct/INT4_SYM_CW" || missing=1
    require_dir "${models}/genai/llama-3.2-3b-instruct/INT8_ASYM" || missing=1
    require_dir "${models}/genai/deepseek-qwen-1.5b/INT4_SYM_CW" || missing=1
    require_dir "${models}/genai/deepseek-qwen-1.5b/INT8_ASYM" || missing=1
    require_dir "${models}/genai/mistral-7b/INT4_SYM_CW" || missing=1
    require_dir "${models}/genai/mistral-7b/INT8_ASYM" || missing=1

    # VLM models
    require_dir "${models}/genai/minicpm-v-2.6/INT4_SYM_CW" || missing=1
    require_dir "${models}/genai/minicpm-v-2.6/INT8_ASYM" || missing=1
    require_dir "${models}/genai/gemma-3-4b-it/INT4_SYM_CW" || missing=1
    require_dir "${models}/genai/gemma-3-4b-it/INT8_ASYM" || missing=1
    require_dir "${models}/genai/phi-4-multimodal/INT4_SYM_CW" || missing=1
    require_dir "${models}/genai/phi-4-multimodal/INT8_ASYM" || missing=1

    if (( missing )); then
        echo "[ Error ] One or more required GenAI model assets are missing. Run 'make models-genai' first."; return 1
    fi
    return 0
}
