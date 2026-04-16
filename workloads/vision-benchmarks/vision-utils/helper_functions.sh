#!/bin/bash

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

require_file() {
    [[ -f "$1" ]] || { echo "[ Error ] Missing required file: $1"; return 1; }
}

validate_assets() {
    (( $# == 1 )) || { echo "[ Error ] validate_assets <models_root>"; return 1; }
    local models="$1" missing=0

    # Detection models
    require_file "${models}/detection/yolov11n_640x640/INT8/yolo11n.xml" || missing=1
    require_file "${models}/detection/yolov11n_640x640/INT8/yolo11n.bin" || missing=1
    require_file "${models}/detection/yolov5m_640x640/INT8/yolov5m-640_INT8.xml" || missing=1
    require_file "${models}/detection/yolov5m_640x640/INT8/yolov5m-640_INT8.bin" || missing=1
    require_file "${models}/detection/yolov11m_640x640/INT8/yolo11m.xml" || missing=1
    require_file "${models}/detection/yolov11m_640x640/INT8/yolo11m.bin" || missing=1

    # Classification models
    require_file "${models}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.xml" || missing=1
    require_file "${models}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.bin" || missing=1
    require_file "${models}/classification/mobilenet-v2-1.0-224-tf/INT8/mobilenet-v2-1.0-224.xml" || missing=1
    require_file "${models}/classification/mobilenet-v2-1.0-224-tf/INT8/mobilenet-v2-1.0-224.bin" || missing=1

    if (( missing )); then
        echo "[ Error ] One or more required model assets are missing. Run model preparation scripts first."; return 1
    fi
    return 0
}
