# Compute Driver Installation Scripts

Intel has validated the GPU and NPU compute drivers in terms of performance reproducibility, for Edge Workloads and Benchmarks.

## Usage

### GPU Driver Installation
```bash
./install_gpu_driver.sh
```

**Specifications:**
- GPU Driver Version: 26.09.37435.1
- IGC Version: 2.30.1

### NPU Driver Installation  
```bash
./install_npu_driver.sh
```

**Specifications:**
- NPU Driver Version: v1.32.0
- Level Zero: 1.27.0
- Requires Ubuntu 24.04


## Directory Structure

```
drivers/
├── gpu/
│   └── 26.09.37435.1/          # Downloaded GPU driver packages
└── npu/
    └── v1.32.0/                # Downloaded NPU driver packages
```

Downloaded packages are saved locally for offline reinstallation.

## Integration with the Main Prerequisite Script

Driver installation is **optional** by default. The main `install_prerequisites.sh` script does not automatically install drivers to maintain system stability.

Use these dedicated scripts or the `install_prerequisites.sh` script with the `--reinstall-gpu-driver=yes` / `--reinstall-npu-driver=yes` flags to install the compute drivers.
