#!/bin/bash

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

require_file() {
    [[ -f "$1" ]] || { echo "[ Error ] Missing required file: $1"; return 1; }
}

validate_assets() {
    (( $# == 1 )) || { echo "[ Error ] validate_assets <media_root>"; return 1; }
    local media="$1" missing=0

    require_file "${media}/hevc/bears_1080.h265" || missing=1
    require_file "${media}/hevc/apple_1080.h265" || missing=1
    require_file "${media}/avc/bears_1080.h264" || missing=1
    require_file "${media}/avc/apple_1080.h264" || missing=1
    require_file "${media}/hevc/bears_4k.h265" || missing=1
    require_file "${media}/hevc/apple_4k.h265" || missing=1
    require_file "${media}/avc/bears_4k.h264" || missing=1
    require_file "${media}/avc/apple_4k.h264" || missing=1

    if (( missing )); then
        echo "[ Error ] One or more required media assets are missing. Run 'make media' from the repository root first."
        return 1
    fi
    return 0
}
