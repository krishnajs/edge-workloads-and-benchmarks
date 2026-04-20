#!/usr/bin/env python3

# SPDX-FileCopyrightText: (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

"""
Profile-based benchmark runner for OpenVINO models.

Parses YAML benchmark profiles and runs OpenVINO benchmark_app for each
model entry, comparing results against target latency and throughput metrics.

Usage:
    python3 run_profile.py --profile <profile.yaml> [--device CPU|GPU|NPU]
    python3 run_profile.py --profile <profile.yaml> --download-only
"""

import argparse
import csv
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
MODEL_DIR = PROJECT_ROOT / "model-conversion" / "profile-models"
RESULTS_DIR = PROJECT_ROOT / "results" / "profiles"

# ---------------------------------------------------------------------------
# Model registry — maps profile model identifiers to Open Model Zoo names.
#
# All models below are verified to exist in the OpenVINO Open Model Zoo and
# produce IR files compatible with benchmark_app.
#
#   Category "intel"  → pre-trained IR; omz_downloader delivers .xml/.bin
#   Category "public" → original framework model; omz_converter produces IR
# ---------------------------------------------------------------------------
MODEL_REGISTRY = {
    "yolo-v4-tf": {
        "omz_name": "yolo-v4-tf",
        "category": "public",
        "description": "YOLO v4 TensorFlow — 608x608 object detection",
    },
    "ssd-resnet34-1200-onnx": {
        "omz_name": "ssd-resnet34-1200-onnx",
        "category": "public",
        "description": "SSD ResNet-34 1200x1200 ONNX object detection",
    },
    "ssd_mobilenet_v2_coco": {
        "omz_name": "ssd_mobilenet_v2_coco",
        "category": "public",
        "description": "SSD MobileNet v2 COCO 300x300 object detection",
    },
    "mobilenet-v2": {
        "omz_name": "mobilenet-v2",
        "category": "intel",
        "description": "MobileNet v2 224x224 image classification",
    },
    "aclnet": {
        "omz_name": "aclnet",
        "category": "intel",
        "description": "Audio Classification Network (ACLNet)",
    },
}

VALID_DEVICES = {"CPU", "GPU", "NPU"}


# ── helpers ────────────────────────────────────────────────────────────────

def _tool_available(name):
    """Return True if *name* is on PATH."""
    return shutil.which(name) is not None


def _benchmark_app_cmd():
    """Return the benchmark_app invocation list, or None."""
    if _tool_available("benchmark_app"):
        return ["benchmark_app"]
    # Fallback to python module form
    try:
        subprocess.run(
            [sys.executable, "-m", "openvino.tools.benchmark_app", "-h"],
            capture_output=True, check=True,
        )
        return [sys.executable, "-m", "openvino.tools.benchmark_app"]
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


# ── profile loading ───────────────────────────────────────────────────────

def load_profile(path):
    """Load and validate a YAML benchmark profile."""
    path = Path(path)
    if not path.exists():
        print(f"[ Error ] Profile not found: {path}")
        sys.exit(1)

    with open(path, "r") as fh:
        profile = yaml.safe_load(fh)

    for key in ("name", "settings", "benchmarks"):
        if key not in profile:
            print(f"[ Error ] Profile missing required key: '{key}'")
            sys.exit(1)

    settings = profile["settings"]
    settings.setdefault("device", "CPU")
    settings.setdefault("duration", 60)
    settings.setdefault("hint", "latency")
    settings.setdefault("nireq", 0)
    settings.setdefault("batch_size", 1)

    device = settings["device"].upper()
    if device not in VALID_DEVICES and not device.startswith("GPU."):
        print(f"[ Error ] Invalid default device '{settings['device']}'. Use CPU, GPU, or NPU.")
        sys.exit(1)
    settings["device"] = device

    return profile


# ── model discovery ───────────────────────────────────────────────────────

def find_model_ir(model_name, precision, base_dir):
    """
    Search for the model IR (.xml) under *base_dir* using the directory
    layouts produced by omz_downloader / omz_converter.
    """
    info = MODEL_REGISTRY.get(model_name, {})
    category = info.get("category", "public")
    omz_name = info.get("omz_name", model_name)

    # Exact paths produced by OMZ tools
    candidates = [
        base_dir / category / omz_name / precision,
        base_dir / omz_name / precision,
        base_dir / "public" / omz_name / precision,
        base_dir / "intel" / omz_name / precision,
    ]
    for cdir in candidates:
        if cdir.is_dir():
            xmls = sorted(cdir.glob("*.xml"))
            if xmls:
                return xmls[0]

    # Broader recursive search as last resort
    norm = precision.lower().replace("-", "")
    for xml_path in sorted(base_dir.rglob("*.xml")):
        if omz_name in xml_path.parts and norm in str(xml_path).lower().replace("-", ""):
            return xml_path

    return None


# ── model download ────────────────────────────────────────────────────────

def download_omz_model(model_name, precision, output_dir):
    """Download (and convert if needed) an OMZ model into *output_dir*."""
    info = MODEL_REGISTRY.get(model_name)
    if not info or not info.get("omz_name"):
        return False

    omz_name = info["omz_name"]
    category = info["category"]
    download_dir = output_dir / "_downloads"

    # --- omz_downloader ---------------------------------------------------
    if not _tool_available("omz_downloader"):
        print(
            "[ Error ] 'omz_downloader' not found.\n"
            "          Install with: pip install openvino-dev"
        )
        return False

    cmd = [
        "omz_downloader",
        "--name", omz_name,
        "--output_dir", str(download_dir),
        "--precisions", precision,
    ]
    print(f"  Downloading {omz_name} ({precision}) ...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[ Error ] omz_downloader failed:\n{result.stderr.strip()}")
        return False

    # --- omz_converter (public models only) -------------------------------
    if category == "public":
        if not _tool_available("omz_converter"):
            print(
                "[ Error ] 'omz_converter' not found.\n"
                "          Install with: pip install openvino-dev"
            )
            return False

        cmd = [
            "omz_converter",
            "--name", omz_name,
            "--download_dir", str(download_dir),
            "--output_dir", str(output_dir),
            "--precisions", precision,
        ]
        print(f"  Converting {omz_name} to IR ({precision}) ...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[ Error ] omz_converter failed:\n{result.stderr.strip()}")
            return False
    else:
        # Intel pre-trained models are already IR — copy them into place
        src = download_dir / "intel" / omz_name
        dst = output_dir / "intel" / omz_name
        if src.exists() and not dst.exists():
            shutil.copytree(src, dst)

    return True


def ensure_model(model_name, precision, model_dir):
    """Return path to model .xml, downloading if necessary."""
    xml = find_model_ir(model_name, precision, model_dir)
    if xml:
        return xml

    if model_name not in MODEL_REGISTRY:
        print(f"[ Error ] Unknown model '{model_name}' — not in registry")
        return None

    ok = download_omz_model(model_name, precision, model_dir)
    if not ok:
        return None

    return find_model_ir(model_name, precision, model_dir)


# ── benchmark execution ──────────────────────────────────────────────────

def run_benchmark_app(model_xml, device, duration, hint, nireq, batch_size):
    """
    Run benchmark_app and return parsed results dict, or None on failure.
    """
    ba_cmd = _benchmark_app_cmd()
    if not ba_cmd:
        print(
            "[ Error ] 'benchmark_app' not found.\n"
            "          Ensure OpenVINO is installed: pip install openvino"
        )
        return None

    cmd = ba_cmd + [
        "-m", str(model_xml),
        "-d", device,
        "-t", str(duration),
        "-hint", hint,
    ]
    if nireq > 0:
        cmd += ["-nireq", str(nireq)]
    if batch_size > 1:
        cmd += ["-b", str(batch_size)]

    print(f"  $ {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=duration + 120,
        )
    except subprocess.TimeoutExpired:
        print("[ Error ] benchmark_app timed out")
        return None

    if result.returncode != 0:
        print(f"[ Error ] benchmark_app exited {result.returncode}:\n{result.stderr}")
        return None

    # Parse the standard benchmark_app output format:
    #   [ INFO ]    Median:     5.12 ms
    #   [ INFO ]    Average:    5.23 ms
    #   [ INFO ] Throughput:    195.12 FPS
    latency_median = None
    latency_avg = None
    throughput = None

    for line in result.stdout.splitlines():
        stripped = line.strip()
        m = re.search(r"Median:\s+([\d.]+)\s*ms", stripped)
        if m:
            latency_median = float(m.group(1))
            continue
        m = re.search(r"Average:\s+([\d.]+)\s*ms", stripped)
        if m:
            latency_avg = float(m.group(1))
            continue
        m = re.search(r"Throughput:\s+([\d.]+)\s*FPS", stripped)
        if m:
            throughput = float(m.group(1))

    return {
        "latency_median_ms": latency_median,
        "latency_avg_ms": latency_avg,
        "throughput_fps": throughput,
        "raw_output": result.stdout,
    }


# ── evaluation ────────────────────────────────────────────────────────────

def evaluate(result, benchmark):
    """Compare a benchmark_app result against the profile targets."""
    verdicts = []
    target_lat = benchmark.get("target_latency_ms")
    target_fps = benchmark.get("target_fps")

    if target_lat and result.get("latency_median_ms") is not None:
        met = result["latency_median_ms"] <= target_lat
        verdicts.append({
            "metric": "latency",
            "target": f"<= {target_lat} ms",
            "actual": f"{result['latency_median_ms']:.2f} ms",
            "pass": met,
        })

    if target_fps and result.get("throughput_fps") is not None:
        met = result["throughput_fps"] >= target_fps
        verdicts.append({
            "metric": "throughput",
            "target": f">= {target_fps} FPS",
            "actual": f"{result['throughput_fps']:.2f} FPS",
            "pass": met,
        })

    return verdicts


# ── CSV output ────────────────────────────────────────────────────────────

def write_csv(rows, profile_name, device, output_dir):
    """Write benchmark results to a timestamped CSV file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    safe = re.sub(r"[^\w\-]", "_", profile_name)
    path = output_dir / f"profile_{safe}_{device}_{ts}.csv"

    with open(path, "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow([
            "Profile", "Benchmark", "Model", "Device", "Precision",
            "Latency_Median_ms", "Latency_Avg_ms", "Throughput_FPS",
            "Target_Latency_ms", "Target_FPS",
            "Latency_Pass", "Throughput_Pass", "Rationale",
        ])
        for r in rows:
            writer.writerow([
                profile_name,
                r.get("name", ""),
                r.get("model", ""),
                r.get("device", ""),
                r.get("precision", ""),
                r.get("latency_median_ms", ""),
                r.get("latency_avg_ms", ""),
                r.get("throughput_fps", ""),
                r.get("target_latency_ms", ""),
                r.get("target_fps", ""),
                r.get("latency_pass", ""),
                r.get("throughput_pass", ""),
                r.get("rationale", ""),
            ])
    return path


# ── main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Run an OpenVINO benchmark profile",
    )
    parser.add_argument(
        "--profile", required=True,
        help="Path to a YAML benchmark profile",
    )
    parser.add_argument(
        "--device",
        help="Override the default device for all benchmarks (CPU, GPU, NPU)",
    )
    parser.add_argument(
        "--duration", type=int,
        help="Override the default benchmark duration (seconds)",
    )
    parser.add_argument(
        "--download-only", action="store_true",
        help="Download / convert models without running benchmarks",
    )
    parser.add_argument(
        "--model-dir", type=Path, default=MODEL_DIR,
        help="Directory for downloaded models",
    )
    parser.add_argument(
        "--results-dir", type=Path, default=RESULTS_DIR,
        help="Directory for result CSV files",
    )
    args = parser.parse_args()

    # Load profile
    profile = load_profile(args.profile)
    settings = profile["settings"]
    benchmarks = profile["benchmarks"]

    device = (args.device or settings["device"]).upper()
    duration = args.duration or settings["duration"]
    hint = settings["hint"]
    nireq = settings["nireq"]
    batch_size = settings["batch_size"]
    model_dir = args.model_dir
    results_dir = args.results_dir

    # Split benchmarks by type
    ov_benchmarks = [b for b in benchmarks if b.get("type") == "openvino"]
    compute_benchmarks = [b for b in benchmarks if b.get("type") == "compute"]

    # Banner
    print()
    print("=" * 72)
    print(f"  Profile : {profile['name']}")
    print(f"  Domain  : {profile.get('domain', 'N/A')}")
    print(f"  Device  : {device}")
    print(f"  Duration: {duration}s per benchmark")
    print(f"  Models  : {model_dir}")
    print("=" * 72)
    print()

    if compute_benchmarks:
        print(f"[ Info ] {len(compute_benchmarks)} compute benchmark(s) in profile (skipped by benchmark_app):")
        for cb in compute_benchmarks:
            print(f"         - {cb['name']}: {cb.get('note', 'N/A')}")
        print()

    if not ov_benchmarks:
        print("[ Info ] No OpenVINO benchmarks in profile — nothing to run.")
        return

    print(f"[ Info ] {len(ov_benchmarks)} OpenVINO benchmark(s) to process")
    print()

    # ── Step 1: ensure models are available ───────────────────────────────
    print("[ Step 1/3 ] Checking model availability ...")
    all_ready = True
    for bench in ov_benchmarks:
        model_name = bench["model"]
        precision = bench.get("precision", "FP16-INT8")
        xml = find_model_ir(model_name, precision, model_dir)
        if xml:
            print(f"  [ OK ] {model_name} ({precision}) -> {xml}")
        else:
            print(f"  [ -- ] {model_name} ({precision}) not found — will download")
            all_ready = False
    print()

    # ── Step 2: download missing models ───────────────────────────────────
    if not all_ready:
        print("[ Step 2/3 ] Downloading missing models ...")
        for bench in ov_benchmarks:
            model_name = bench["model"]
            precision = bench.get("precision", "FP16-INT8")
            if find_model_ir(model_name, precision, model_dir):
                continue
            xml = ensure_model(model_name, precision, model_dir)
            if xml:
                print(f"  [ OK ] {model_name} ready -> {xml}")
            else:
                print(f"  [FAIL] {model_name} — could not obtain model")
        print()
    else:
        print("[ Step 2/3 ] All models available — nothing to download")
        print()

    if args.download_only:
        print("[ Done ] --download-only requested; skipping benchmark execution.")
        return

    # ── Step 3: run benchmarks ────────────────────────────────────────────
    print("[ Step 3/3 ] Running benchmarks ...")
    print()
    all_results = []

    for idx, bench in enumerate(ov_benchmarks, 1):
        model_name = bench["model"]
        precision = bench.get("precision", "FP16-INT8")
        bench_device = (bench.get("device") or device).upper()
        bench_name = bench["name"]

        print(f"  [{idx}/{len(ov_benchmarks)}] {bench_name}")
        print(f"      Model: {model_name}  Device: {bench_device}  Precision: {precision}")

        xml = find_model_ir(model_name, precision, model_dir)
        if not xml:
            print("      [ SKIP ] Model IR not available")
            print()
            continue

        result = run_benchmark_app(xml, bench_device, duration, hint, nireq, batch_size)

        row = {
            "name": bench_name,
            "model": model_name,
            "device": bench_device,
            "precision": precision,
            "target_latency_ms": bench.get("target_latency_ms"),
            "target_fps": bench.get("target_fps"),
            "rationale": bench.get("rationale", ""),
        }

        if result:
            row["latency_median_ms"] = result.get("latency_median_ms")
            row["latency_avg_ms"] = result.get("latency_avg_ms")
            row["throughput_fps"] = result.get("throughput_fps")

            verdicts = evaluate(result, bench)
            for v in verdicts:
                tag = "PASS" if v["pass"] else "FAIL"
                if v["metric"] == "latency":
                    row["latency_pass"] = tag
                else:
                    row["throughput_pass"] = tag
                print(f"      [{tag}] {v['metric']}: {v['actual']} (target {v['target']})")
        else:
            print("      [ ERROR ] benchmark_app failed")

        all_results.append(row)
        print()

    # ── Summary ───────────────────────────────────────────────────────────
    csv_path = write_csv(all_results, profile["name"], device, results_dir)

    W = 72
    print("=" * W)
    print(f"  RESULTS SUMMARY — {profile['name']}  (device: {device})")
    print("=" * W)
    print()
    hdr = f"  {'Benchmark':<36} {'Latency(ms)':<14} {'FPS':<10} {'Result':<8}"
    print(hdr)
    print(f"  {'-'*36} {'-'*14} {'-'*10} {'-'*8}")

    for r in all_results:
        lat = f"{r['latency_median_ms']:.2f}" if r.get("latency_median_ms") is not None else "N/A"
        fps = f"{r['throughput_fps']:.2f}" if r.get("throughput_fps") is not None else "N/A"
        lp = r.get("latency_pass", "-")
        fp = r.get("throughput_pass", "-")
        if "FAIL" in (lp, fp):
            status = "FAIL"
        elif lp == "PASS" or fp == "PASS":
            status = "PASS"
        else:
            status = "-"
        print(f"  {r['name']:<36} {lat:<14} {fps:<10} {status:<8}")

    print()
    print(f"  CSV: {csv_path}")
    print("=" * W)


if __name__ == "__main__":
    main()
