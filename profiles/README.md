# Benchmark Profiles

Run a **user-defined subset** of OpenVINO benchmarks on **CPU, GPU, or NPU**
using YAML profile files and `benchmark_app`.

## Quick Start

```bash
# Download models for a profile (one-time)
make profile-models PROFILE=profiles/aam-avionics.yaml

# Run benchmarks on CPU (default)
make benchmark-profile PROFILE=profiles/aam-avionics.yaml

# Run on GPU
make benchmark-profile PROFILE=profiles/aam-avionics.yaml DEVICE=GPU

# Run on NPU
make benchmark-profile PROFILE=profiles/aam-vertiport-security.yaml DEVICE=NPU

# Override duration
make benchmark-profile PROFILE=profiles/aam-avionics.yaml DEVICE=GPU DURATION=120
```

## Included Profiles (Advanced Air Mobility)

| Profile | File | OpenVINO Models |
|---|---|---|
| Avionics (Onboard Compute) | `aam-avionics.yaml` | yolo-v4-tf, ssd-resnet34-1200-onnx, ssd_mobilenet_v2_coco |
| Air Traffic Control / UTM | `aam-air-traffic-control.yaml` | yolo-v4-tf, ssd-resnet34-1200-onnx |
| Vertiport Security | `aam-vertiport-security.yaml` | yolo-v4-tf, ssd_mobilenet_v2_coco, mobilenet-v2, aclnet |

## YAML Profile Schema

```yaml
name: "Profile Name"
domain: "Domain Name"
description: "What this profile benchmarks"

settings:
  device: "CPU"           # Default device: CPU, GPU, NPU
  duration: 60            # Seconds per benchmark
  hint: "latency"         # latency or throughput
  nireq: 0                # Inference requests (0 = auto)
  batch_size: 1           # Batch size

benchmarks:
  - name: "Human-readable benchmark name"
    model: "omz-model-name"       # Open Model Zoo identifier
    type: "openvino"              # openvino | compute
    precision: "FP16-INT8"        # IR precision
    target_latency_ms: 25         # Target latency (ms)
    target_fps: 40                # Target throughput (FPS)
    device: "GPU"                 # Optional per-benchmark device override
    rationale: "Why this target"

  - name: "Non-AI Benchmark"
    type: "compute"               # Skipped by benchmark_app
    note: "Requires separate tool"
```

### Fields

| Field | Required | Description |
|---|---|---|
| `name` | yes | Profile display name |
| `settings.device` | yes | Default inference device (`CPU`, `GPU`, `NPU`) |
| `settings.duration` | yes | Seconds to run each benchmark |
| `settings.hint` | yes | `latency` or `throughput` |
| `benchmarks[].model` | yes (openvino) | Model identifier from the Open Model Zoo |
| `benchmarks[].type` | yes | `openvino` (run by benchmark_app) or `compute` (informational) |
| `benchmarks[].precision` | no | Model precision, default `FP16-INT8` |
| `benchmarks[].target_latency_ms` | no | Pass/fail threshold for median latency |
| `benchmarks[].target_fps` | no | Pass/fail threshold for throughput |
| `benchmarks[].device` | no | Override `settings.device` for this benchmark |

## Supported OpenVINO Models

All models below are from the [Open Model Zoo](https://github.com/openvinotoolkit/open_model_zoo)
and are confirmed compatible with `benchmark_app`:

| Model ID | Type | OMZ Category | Description |
|---|---|---|---|
| `yolo-v4-tf` | Detection | public | YOLO v4 TensorFlow (608×608) |
| `ssd-resnet34-1200-onnx` | Detection | public | SSD ResNet-34 ONNX (1200×1200) |
| `ssd_mobilenet_v2_coco` | Detection | public | SSD MobileNet v2 COCO (300×300) |
| `mobilenet-v2` | Classification | intel | MobileNet v2 (224×224) |
| `aclnet` | Audio | intel | Audio Classification Network |

To add new models, add entries to `MODEL_REGISTRY` in `run_profile.py` using
the model's Open Model Zoo name.

## Prerequisites

```bash
# Ensure the model-conversion venv exists
make models

# Install OMZ tools for model downloading (inside the venv)
source model-conversion/venv/bin/activate
pip install openvino-dev
```

## Output

Results are saved as CSV files under `results/profiles/`:

```
results/profiles/profile_Avionics__Onboard_Compute__CPU_20250420-143022.csv
```

Each row contains the model name, device, measured latency/throughput,
targets, and PASS/FAIL status.

## Creating Custom Profiles

1. Copy an existing profile YAML as a template
2. Edit the benchmarks list — use model IDs from the table above
3. Set targets appropriate for your workload
4. Run: `make benchmark-profile PROFILE=profiles/my-profile.yaml`
