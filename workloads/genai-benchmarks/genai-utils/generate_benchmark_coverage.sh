#!/bin/bash

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

set -e

# Initialize available devices
has_gpu=false
has_npu=false

# Verbose logging only if VERBOSE=1
log_verbose() {
    if [[ "${VERBOSE:-0}" == "1" ]]; then
        echo "# $*" >&2
    fi
}

detect_devices() {
    log_verbose "[ Info ] Detecting available compute devices..."

    # Check for GPU via /dev/dri
    if [[ -d /dev/dri ]] && compgen -G "/dev/dri/render*" >/dev/null 2>&1; then
        has_gpu=true
        log_verbose "[ Info ] GPU detected (/dev/dri available)"
    else
        log_verbose "[ Info ] GPU not detected"
    fi

    # Check for NPU via /dev/accel
    if [[ -e /dev/accel ]] && compgen -G "/dev/accel/accel*" >/dev/null 2>&1; then
        has_npu=true
        log_verbose "[ Info ] NPU detected (/dev/accel available)"
    else
        log_verbose "[ Info ] NPU not detected"
    fi
}

# GenAI models to sweep: short_name,type
MODELS=(
    "llama-3.2-3b-instruct,llm"
    "deepseek-qwen-1.5b,llm"
    "mistral-7b,llm"
    "minicpm-v-2.6,vlm"
    "gemma-3-4b-it,vlm"
    "phi-4-multimodal,vlm"
)

# Generate coverage matrix based on available devices
# Format: model,device,precision,type
generate_coverage() {
    local total_tests=0

    log_verbose "GenAI Benchmark Coverage Matrix"
    log_verbose "Format: model,device,precision,type"
    log_verbose ""

    for entry in "${MODELS[@]}"; do
        IFS=',' read -r model_name model_type <<< "${entry}"

        # GPU tests: INT8_ASYM + INT4_SYM_CW
        if [[ "$has_gpu" == true ]]; then
            echo "${model_name},GPU,INT8_ASYM,${model_type}"
            echo "${model_name},GPU,INT4_SYM_CW,${model_type}"
            total_tests=$((total_tests + 2))
            log_verbose "${model_name} GPU: 2 tests (INT8_ASYM, INT4_SYM_CW)"
        fi

        # NPU tests: INT4_SYM_CW only
        if [[ "$has_npu" == true ]]; then
            echo "${model_name},NPU,INT4_SYM_CW,${model_type}"
            total_tests=$((total_tests + 1))
            log_verbose "${model_name} NPU: 1 test (INT4_SYM_CW)"
        fi
    done

    echo "TOTAL_TESTS=${total_tests}"

    if [[ ${total_tests} -eq 0 ]]; then
        echo "[ Warning ] No benchmark tests generated. No GPU or NPU device was detected." >&2
        echo "[ Warning ] Please ensure the GPU and/or NPU drivers are installed." >&2
        echo "[ Warning ] See setup/drivers/README.md for installation instructions." >&2
    fi
}

main() {
    detect_devices
    log_verbose ""
    generate_coverage
}

main "$@"
