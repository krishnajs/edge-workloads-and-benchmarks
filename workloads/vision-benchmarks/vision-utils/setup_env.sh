#!/bin/bash

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

basedir="$(realpath "$(dirname -- "$0")")"
venvdir="${basedir}/../venv"

if [[ -d "${venvdir}" ]]; then
    echo "[ Info ] Virtual environment already exists at ${venvdir}"
    exit 0
fi

echo "[ Info ] Creating virtual environment and installing OpenVINO..."
python3 -m venv "${venvdir}"
source "${venvdir}/bin/activate"
pip install --upgrade pip
pip install openvino
deactivate
echo "[ Info ] Setup complete."
