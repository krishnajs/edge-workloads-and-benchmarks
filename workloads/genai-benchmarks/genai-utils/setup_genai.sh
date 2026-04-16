#!/bin/bash

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

set -e

basedir="$(realpath "$(dirname -- "$0")")"
workload_dir="$(realpath "${basedir}/..")"

echo "[ Info ] Setting up GenAI benchmarks runtime environment..."

if [[ -d "${workload_dir}/venv" ]]; then
    echo "[ Info ] Virtual environment already exists, skipping creation."
else
    echo "[ Info ] Creating Python virtual environment..."
    python3 -m venv "${workload_dir}/venv"
fi

source "${workload_dir}/venv/bin/activate"

# Clone openvino.genai repository for llm_bench tool
if [[ -d "${basedir}/openvino.genai" ]]; then
    echo "[ Info ] openvino.genai repository already cloned, skipping."
else
    echo "[ Info ] Cloning openvino.genai repository..."
    git clone --depth 1 https://github.com/openvinotoolkit/openvino.genai.git "${basedir}/openvino.genai"
fi

# Install llm_bench runtime dependencies
LLM_BENCH_REQS="${basedir}/openvino.genai/tools/llm_bench/requirements.txt"
if [[ -f "${LLM_BENCH_REQS}" ]]; then
    echo "[ Info ] Installing llm_bench dependencies..."
    pip install -q --upgrade pip
    pip install -q -r "${LLM_BENCH_REQS}"
fi

deactivate

echo "[ Info ] GenAI runtime environment ready."
