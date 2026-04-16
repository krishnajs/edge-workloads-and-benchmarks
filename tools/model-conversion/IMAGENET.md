# ImageNet Accuracy Check for Classification Networks (Optional)

The CIFAR dataset is used as a proxy dataset for classification network quantization. For classification accuracy validation, the ImageNet dataset is required.

### ImageNet Dataset Setup

1. Register at https://www.image-net.org/download.php
2. Download files:
   - `ILSVRC2012_devkit_t12.tar.gz` (2.5MB)
   - `ILSVRC2012_img_val.tar` (6.3GB)
3. Place in directory:
   ```bash
   ${Path-to-datasets}/datasets/imagenet-packages/
   ├── ILSVRC2012_devkit_t12.tar.gz
   └── ILSVRC2012_img_val.tar
   ```
   Keep the files as tar and tar.gz files.

```bash
make download IMAGENET_ROOT="${Path-to-datasets}/datasets/imagenet-packages"
```

## Output Structure

Models are saved to `collateral/models/` at the repository root:

```
collateral/models/
├── detection/
│   ├── yolov11n_640x640/INT8/
│   ├── yolov5m_640x640/INT8/
│   └── yolov11m_640x640/INT8/
└── classification/
    ├── resnet-v1-50-tf/INT8/
    └── mobilenet-v2-1.0-224-tf/INT8/
```
