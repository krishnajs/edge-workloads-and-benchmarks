# Vision Model Downloader

Download, convert, and quantize AI models for Deep Learning Streamer (DL Streamer) pipelines.

#### Required for the following workloads:
 - Edge AI Pipelines
 - Vision Benchmarks



## Usage

```Makefile
Vision Model Conversion
=======================

Checks:
  make verify                 Optional: Check that all required model files are present

Conversion:
  make download               Download, convert, and quantize all vision models

  Options:
    IMAGENET_ROOT             Optional: Path to ImageNet dataset for accuracy validation
                              Defaults to CIFAR-100 dataset if unset and skips accuracy

Cleanup:
  make clean                  Optional: Remove converted models from collateral
  make clean-venv             Optional: Remove the Python virtual environment
```
**Note:** Please refer to [IMAGENET.md](IMAGENET.md) for enabling accuracy validation on ResNet-50 and MobileNet-2.

## Requirements

- Python 3.10+ with `venv` support.
- ~2 GB disk space for the virtual environment and intermediate files.

## Overview

1. Creates a Python virtual environment and installs conversion dependencies (`openvino`, `nncf`, `torch`, `ultralytics`).

2. Downloads, converts, and quantizes two classification models to OpenVINO INT8 format:
   - `resnet-50` — ResNet-50 (calibrated with ImageNet or CIFAR-100)
   - `mobilenet-v2` — MobileNet-V2 (calibrated with ImageNet or CIFAR-100)

3. Downloads, converts, and quantizes three detection models to OpenVINO INT8 format:
   - `yolo11n` — YOLOv11-N (calibrated with COCO 2017)
   - `yolo11m` — YOLOv11-M (calibrated with COCO 2017)
   - `yolov5m` — YOLOv5-M (calibrated with COCO 2017)

4. Validates all converted models and saves them to `collateral/models/` at the repository root.

## Model Sources
| Model Name   | Task           | Dimensions     | Dataset  | Source Model |
|--------------|----------------|----------------|----------|--------------|
| Yolo-v11n    | Detection      | 640x640 (INT8) | COCO     | [source](https://docs.ultralytics.com/models/yolo11/)   |
| Yolo-v11m    | Detection      | 640x640 (INT8) | COCO     | [source](https://docs.ultralytics.com/models/yolo11/)   |
| Yolo-v5m     | Detection      | 640x640 (INT8) | COCO     | [source](https://github.com/dlstreamer/pipeline-zoo-models/tree/main/storage/yolov5m-640_INT8)   |
| Resnet-50    | Classification | 224x224 (INT8) | ImageNet | [source](https://www.kaggle.com/models/google/resnet-v1/tensorFlow2/50-classification/)   |
| Mobilenet-V2 | Classification | 224x224 (INT8) | ImageNet | [source](https://pytorch.org/hub/pytorch_vision_mobilenet_v2/)   |