#!/bin/bash

# SPDX-FileCopyrightText: (C) 2024 - 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

MODELS_ROOT="/home/dlstreamer/models"
MEDIA_ROOT="/home/dlstreamer/media"

construct_decode()
{
    local pipeconfig=${1:-light}
    local video

    case "${pipeconfig}" in
        light)
        video="${MEDIA_ROOT}/hevc/bears_1080.h265"
        ;;
        medium)
        video="${MEDIA_ROOT}/hevc/apple_1080.h265"
        ;;
        heavy)
        video="${MEDIA_ROOT}/hevc/bears_1080.h265"
        ;;
        *)
        echo "[ Error ] construct_decode: unknown config ${pipeconfig}" >&2; return 1
        ;;
    esac

    DecodePipe="filesrc location=${video} ! parsebin ! decodebin3"
    echo "${DecodePipe}"
}

construct_detection()
{
    local pipeconfig=${1:-light}
    local device=${2:-CPU}
    local batch=${3:-1}
    local instance_suffix=${4:-}

    local detmodel detproc modelID
    case "${pipeconfig}" in
        light)
        detmodel="${MODELS_ROOT}/detection/yolov11n_640x640/INT8/yolo11n.xml"
        modelID="yolov11n"
        ;;
        medium)
        detmodel="${MODELS_ROOT}/detection/yolov5m_640x640/INT8/yolov5m-640_INT8.xml"
        detproc="${MODELS_ROOT}/detection/yolov5m_640x640/yolo-v5.json"
        modelID="yolov5m"
        ;;
        heavy)
        detmodel="${MODELS_ROOT}/detection/yolov11m_640x640/INT8/yolo11m.xml"
        modelID="yolov11m"
        ;;
        *)
        echo "[ Error ] construct_detection: unknown config ${pipeconfig}" >&2; return 1
        ;;
    esac

    local ppbackend infconfig
    case "${device}" in
        CPU)
        ppbackend="opencv"
        infconfig=""
        ;;
        GPU|GPU.[0-9]*)
        ppbackend="va-surface-sharing"
        infconfig="nireq=2 ie-config=NUM_STREAMS=2"
        ;;
        NPU)
        ppbackend="va"
        infconfig="nireq=4"
        batch=1
        ;;
        *)
        echo "[ Error ] construct_detection: unknown device ${device}" >&2; return 1
        ;;
    esac

    DetectPipe="gvadetect model=${detmodel}"
    if [[ -n "${detproc:-}" ]]; then
        DetectPipe+=" model-proc=${detproc}"
    fi

    DetectPipe+=" device=${device} pre-process-backend=${ppbackend} ${infconfig} batch-size=${batch} inference-interval=3 threshold=0.5 model-instance-id=${modelID}${instance_suffix}"
    echo "${DetectPipe}"
}

construct_classification()
{
    local pipeconfig=${1:-light}
    local device=${2:-CPU}
    local batch=${3:-1}
    local instance_suffix=${4:-}

    local ppbackend infconfig
    case "${device}" in
        CPU)
        ppbackend="opencv"
        infconfig=""
        ;;
        GPU|GPU.[0-9]*)
        ppbackend="va-surface-sharing"
        infconfig="nireq=2 ie-config=NUM_STREAMS=2"
        ;;
        NPU)
        ppbackend="va"
        infconfig="nireq=4"
        batch=1
        ;;
        *)
        echo "[ Error ] construct_classification: unknown device ${device}" >&2; return 1
        ;;
    esac

    local classmodel classproc modelID classmodel2 classproc2 modelID2 pipeline1 pipeline2
    case "${pipeconfig}" in
        light)
        classmodel="${MODELS_ROOT}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.xml"
        classproc="${MODELS_ROOT}/classification/resnet-v1-50-tf/resnet-50.json"
        modelID="resnet50"

        ClassPipe="gvaclassify model=${classmodel} model-proc=${classproc} device=${device} pre-process-backend=${ppbackend} ${infconfig} batch-size=${batch} inference-interval=3 inference-region=1 model-instance-id=${modelID}${instance_suffix}"
        ;;
        medium)
        classmodel="${MODELS_ROOT}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.xml"
        classproc="${MODELS_ROOT}/classification/resnet-v1-50-tf/resnet-50.json"
        modelID="resnet50"
        classmodel2="${MODELS_ROOT}/classification/mobilenet-v2-1.0-224-tf/INT8/mobilenet-v2-1.0-224.xml"
        classproc2="${MODELS_ROOT}/classification/mobilenet-v2-1.0-224-tf/mobilenet-v2.json"
        modelID2="mobilenetv2"

        pipeline1="gvaclassify model=${classmodel} model-proc=${classproc} device=${device} pre-process-backend=${ppbackend} ${infconfig} batch-size=${batch} inference-interval=3 inference-region=1 model-instance-id=${modelID}${instance_suffix}"
        pipeline2="gvaclassify model=${classmodel2} model-proc=${classproc2} device=${device} pre-process-backend=${ppbackend} ${infconfig} batch-size=${batch} inference-interval=3 inference-region=1 model-instance-id=${modelID2}${instance_suffix}"
        ClassPipe="${pipeline1} ! queue ! ${pipeline2}"
        ;;
        heavy)
        classmodel="${MODELS_ROOT}/classification/resnet-v1-50-tf/INT8/resnet-v1-50-tf.xml"
        classproc="${MODELS_ROOT}/classification/resnet-v1-50-tf/resnet-50.json"
        modelID="resnet50"
        classmodel2="${MODELS_ROOT}/classification/mobilenet-v2-1.0-224-tf/INT8/mobilenet-v2-1.0-224.xml"
        classproc2="${MODELS_ROOT}/classification/mobilenet-v2-1.0-224-tf/mobilenet-v2.json"
        modelID2="mobilenetv2"

        pipeline1="gvaclassify model=${classmodel} model-proc=${classproc} device=${device} pre-process-backend=${ppbackend} ${infconfig} batch-size=${batch} inference-interval=3 inference-region=1 model-instance-id=${modelID}${instance_suffix}"
        pipeline2="gvaclassify model=${classmodel2} model-proc=${classproc2} device=${device} pre-process-backend=${ppbackend} ${infconfig} batch-size=${batch} inference-interval=3 inference-region=1 model-instance-id=${modelID2}${instance_suffix}"
        ClassPipe="${pipeline1} ! queue ! ${pipeline2}"
        ;;
        *)
        echo "[ Error ] construct_classification: unknown config ${pipeconfig}" >&2; return 1
        ;;
    esac
    echo "${ClassPipe}"
}
