#!/bin/bash

# SPDX-FileCopyrightText: (C) 2024 - 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

require_file() {
    [[ -f "$1" ]] || { echo "[ Error ] Missing required file: $1"; return 1; }
}

validate_assets() {
    (( $# == 3 )) || { echo "[ Error ] validate_assets <config> <models_root> <media_root>"; return 1; }
    local config="$1" models="$2" media="$3" missing=0

    # Validate media
    case "${config}" in
        light|heavy)
            require_file "${media}/hevc/bears_1080.h265" || missing=1
            ;;
        medium)
            require_file "${media}/hevc/apple_1080.h265" || missing=1
            ;;
        *)
            echo "[ Error ] validate_assets: unknown config ${config}"; return 1
            ;;
    esac

    # Validate detection models
    case "${config}" in
        light)
            require_file "${models}/detection/yolov11n_640x640/INT8/yolo11n.xml" || missing=1
            require_file "${models}/detection/yolov11n_640x640/INT8/yolo11n.bin" || missing=1
            ;;
        medium)
            require_file "${models}/detection/yolov5m_640x640/INT8/yolov5m-640_INT8.xml" || missing=1
            require_file "${models}/detection/yolov5m_640x640/INT8/yolov5m-640_INT8.bin" || missing=1
            require_file "${models}/detection/yolov5m_640x640/yolo-v5.json" || missing=1
            ;;
        heavy)
            require_file "${models}/detection/yolov11m_640x640/INT8/yolo11m.xml" || missing=1
            require_file "${models}/detection/yolov11m_640x640/INT8/yolo11m.bin" || missing=1
            ;;
    esac

    # Validate classification models
    require_file "${models}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.xml" || missing=1
    require_file "${models}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.bin" || missing=1
    require_file "${models}/classification/resnet-v1-50-tf/resnet-50.json" || missing=1

    case "${config}" in
        medium|heavy)
            require_file "${models}/classification/mobilenet-v2-1.0-224-tf/INT8/mobilenet-v2-1.0-224.xml" || missing=1
            require_file "${models}/classification/mobilenet-v2-1.0-224-tf/INT8/mobilenet-v2-1.0-224.bin" || missing=1
            require_file "${models}/classification/mobilenet-v2-1.0-224-tf/mobilenet-v2.json" || missing=1
            ;;
    esac

    if (( missing )); then
        echo "[ Error ] One or more required pipeline assets are missing. Run model and media preparation scripts first."; return 1
    fi
    return 0
}
