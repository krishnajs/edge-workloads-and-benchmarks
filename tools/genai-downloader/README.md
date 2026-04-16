# GenAI Model Downloader

Downloads and exports Generative AI models from Hugging Face to OpenVINO IR format for Edge Workloads and Benchmarks.

#### Required for the following workloads:
 - GenAI Benchmarks

## Usage

```Makefile
GenAI Model Conversion
======================

Checks:
  make verify                 Optional: Check that all required model directories are present

Conversion:
  make setup                  Create Python venv and install export dependencies
  make download               Download and export all GenAI models (~25 GB)

Cleanup:
  make clean                  Optional: Remove exported models from collateral
  make clean-venv             Optional: Remove the Python virtual environment
```
**Note:** Some models are gated and require a Hugging Face token.
  Run `huggingface-cli login` or `export HF_TOKEN=hf_...` with your token before download.

## Requirements

- Python 3.10+ with `venv` support.
- Hugging Face token for gated models (Llama, Mistral, Gemma, MiniCPM).
- ~50 GB disk space for all models.

## Overview

1. Creates a Python virtual environment and installs export dependencies (`openvino`, `optimum-intel`, `nncf`, `transformers`).

2. Downloads and resizes a COCO val2017 image to standard VLM input resolutions (224x224, 448x448, 640x640, 1080x1920).

3. Exports three LLM models in INT8_ASYM and INT4_SYM_CW precisions:
   - `llama-3.2-3b-instruct` — Meta Llama 3.2 3B Instruct
   - `deepseek-qwen-1.5b` — DeepSeek R1 Distill Qwen 1.5B
   - `mistral-7b` — Mistral 7B v0.1

4. Exports three VLM (Vision-Language) models in INT8_ASYM and INT4_SYM_CW precisions:
   - `phi-4-multimodal` — Phi-4 Multimodal Instruct (5.6B)
   - `gemma-3-4b-it` — Gemma 3 4B IT
   - `minicpm-v-2.6` — MiniCPM-V 2.6 (8B)

5. Saves exported models to `collateral/models/genai/` and test images to `collateral/media/images/` at the repository root.

## Model Sources
| Task | Model Name | Group | Link |
|------|------------|-------|------|
| LLM | Llama-3.2-3B-Instruct | meta-llama | [Huggingface](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct) |
| LLM | DeepSeek-R1-Distill-Qwen-1.5B | deepseek-ai | [Huggingface](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B) |
| LLM | Mistral-7B-v0.1 | mistralai | [Huggingface](https://huggingface.co/mistralai/Mistral-7B-v0.1) |
| VLM | Phi-4-multimodal-instruct | microsoft | [Huggingface](https://huggingface.co/microsoft/Phi-4-multimodal-instruct) |
| VLM | gemma-3-4b-it | google | [Huggingface](https://huggingface.co/google/gemma-3-4b-it) |
| VLM | MiniCPM-V-2_6 | openbmb | [Huggingface](https://huggingface.co/openbmb/MiniCPM-V-2_6) |