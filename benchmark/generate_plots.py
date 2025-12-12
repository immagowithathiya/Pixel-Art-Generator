import json
import os
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
import seaborn as sns

# Set publication-quality style
sns.set_style("whitegrid")
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['legend.fontsize'] = 9

STATS_FILE = "benchmark/stats/benchmark.json"
PLOT_DIR = "benchmark/stats/plots"

os.makedirs(PLOT_DIR, exist_ok=True)

with open(STATS_FILE) as f:
    raw_data = json.load(f)
    data = [d for d in raw_data["outputs"] if d.get("success", True)]

print(f"Loaded {len(data)} successful test results")
print("=" * 70)

# Filter data by mode
normal_data = [d for d in data if d.get("mode") == "normal"]
heavy_data = [d for d in data if d.get("mode") == "heavy"]

print(f"Normal mode tests: {len(normal_data)}")
print(f"Heavy mode tests: {len(heavy_data)}")
print()

# ========== 1. RESOLUTION SCALING ANALYSIS ==========
print("📊 Generating resolution scaling plots...")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

res_normal = defaultdict(list)
res_heavy = defaultdict(list)

for d in normal_data:
    if d.get("experiment") in ["resolution_scaling", "high_resolution_stress"]:
        res_normal[d["resolution"]].append(d["algorithmTime_ms"])

for d in heavy_data:
    if d.get("experiment") in ["resolution_scaling", "high_resolution_stress"]:
        res_heavy[d["resolution"]].append(d["algorithmTime_ms"])

# Get resolutions that exist in both modes
resolutions = sorted(set(res_normal.keys()) & set(res_heavy.keys()))

if len(resolutions) >= 2:
    normal_times = [np.mean(res_normal[r]) for r in resolutions]
    heavy_times = [np.mean(res_heavy[r]) for r in resolutions]

    # Linear scale
    ax1.plot(resolutions, normal_times, marker='o', label='Normal Mode', linewidth=2)
    ax1.plot(resolutions, heavy_times, marker='s', label='Heavy Mode', linewidth=2)
    ax1.set_xlabel("Image Resolution (pixels)")
    ax1.set_ylabel("Processing Time (ms)")
    ax1.set_title("Algorithm Performance vs Resolution")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Log-log scale
    ax2.loglog(resolutions, normal_times, marker='o', label='Normal Mode', linewidth=2)
    ax2.loglog(resolutions, heavy_times, marker='s', label='Heavy Mode', linewidth=2)
    ax2.set_xlabel("Image Resolution (pixels)")
    ax2.set_ylabel("Processing Time (ms)")
    ax2.set_title("Log-Log Scale: Algorithmic Complexity")
    ax2.legend()
    ax2.grid(True, alpha=0.3, which="both")

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/01_resolution_scaling.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Resolution scaling")
else:
    plt.close(fig)
    print("  ⚠ Skipped (need at least 2 resolutions)")

# ========== 2. COLOR DEPTH ANALYSIS ==========
print("📊 Generating color depth analysis...")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

color_normal = defaultdict(list)
color_heavy = defaultdict(list)

for d in normal_data:
    if "color" in d.get("experiment", "").lower():
        color_normal[d["colors"]].append(d["algorithmTime_ms"])

for d in heavy_data:
    if "color" in d.get("experiment", "").lower():
        color_heavy[d["colors"]].append(d["algorithmTime_ms"])

colors_list = sorted(set(color_normal.keys()) & set(color_heavy.keys()))

if len(colors_list) >= 2:
    normal_color_times = [np.mean(color_normal[c]) for c in colors_list]
    heavy_color_times = [np.mean(color_heavy[c]) for c in colors_list]

    ax1.plot(colors_list, normal_color_times, marker='o', label='Normal Mode', linewidth=2)
    ax1.plot(colors_list, heavy_color_times, marker='s', label='Heavy Mode', linewidth=2)
    ax1.set_xlabel("Number of Colors")
    ax1.set_ylabel("Processing Time (ms)")
    ax1.set_title("Color Quantization Impact")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Relative overhead
    overhead = [(h/n - 1) * 100 for h, n in zip(heavy_color_times, normal_color_times)]
    ax2.bar(colors_list, overhead, color='coral', alpha=0.7)
    ax2.set_xlabel("Number of Colors")
    ax2.set_ylabel("Heavy Mode Overhead (%)")
    ax2.set_title("Relative Processing Overhead")
    ax2.grid(True, alpha=0.3, axis='y')
    ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/02_color_depth_analysis.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Color depth analysis")
else:
    plt.close(fig)
    print("  ⚠ Skipped (need at least 2 color depths)")

# ========== 3. PIXEL SIZE EFFECT ==========
print("📊 Generating pixel size analysis...")

pixel_normal = defaultdict(list)
pixel_heavy = defaultdict(list)

for d in normal_data:
    if "pixel_size" in d.get("experiment", "").lower():
        pixel_normal[d.get("pixelSize", 1)].append(d["algorithmTime_ms"])

for d in heavy_data:
    if "pixel_size" in d.get("experiment", "").lower():
        pixel_heavy[d.get("pixelSize", 1)].append(d["algorithmTime_ms"])

pixel_sizes = sorted(set(pixel_normal.keys()) & set(pixel_heavy.keys()))

if len(pixel_sizes) >= 2:
    fig, ax = plt.subplots(figsize=(10, 6))
    
    normal_pixel_times = [np.mean(pixel_normal[p]) for p in pixel_sizes]
    heavy_pixel_times = [np.mean(pixel_heavy[p]) for p in pixel_sizes]

    ax.plot(pixel_sizes, normal_pixel_times, marker='o', label='Normal Mode', linewidth=2)
    ax.plot(pixel_sizes, heavy_pixel_times, marker='s', label='Heavy Mode', linewidth=2)
    ax.set_xlabel("Pixel Size (multiplier)")
    ax.set_ylabel("Processing Time (ms)")
    ax.set_title("Pixelation Parameter Impact on Performance")
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/03_pixel_size_effect.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Pixel size effect")
else:
    print("  ⚠ Skipped (need at least 2 pixel sizes)")

# ========== 4. OUTPUT SCALE OPTIMIZATION ==========
print("📊 Generating output scale analysis...")

scale_normal = defaultdict(list)
scale_heavy = defaultdict(list)

for d in normal_data:
    if "scale" in d.get("experiment", "").lower():
        scale_normal[int(d["outputScale"] * 100)].append(d["algorithmTime_ms"])

for d in heavy_data:
    if "scale" in d.get("experiment", "").lower():
        scale_heavy[int(d["outputScale"] * 100)].append(d["algorithmTime_ms"])

scales = sorted(set(scale_normal.keys()) & set(scale_heavy.keys()))

if len(scales) >= 2:
    fig, ax = plt.subplots(figsize=(10, 6))
    
    normal_scale_times = [np.mean(scale_normal[s]) for s in scales]
    heavy_scale_times = [np.mean(scale_heavy[s]) for s in scales]

    ax.plot(scales, normal_scale_times, marker='o', label='Normal Mode', linewidth=2)
    ax.plot(scales, heavy_scale_times, marker='s', label='Heavy Mode', linewidth=2)
    ax.set_xlabel("Output Scale (%)")
    ax.set_ylabel("Processing Time (ms)")
    ax.set_title("Downscaling Impact on Processing Time")
    ax.legend()
    ax.grid(True, alpha=0.3)
    ax.invert_xaxis()

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/04_output_scale_optimization.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Output scale optimization")
else:
    print("  ⚠ Skipped (need at least 2 output scales)")

# ========== 5. DITHERING ALGORITHM COMPARISON ==========
print("📊 Generating dithering comparison...")

dither_normal = defaultdict(list)
dither_heavy = defaultdict(list)

for d in normal_data:
    if "dithering" in d.get("experiment", "").lower():
        dither = d.get("dithering", "unknown")
        if dither != "unknown":
            dither_normal[dither].append(d["algorithmTime_ms"])

for d in heavy_data:
    if "dithering" in d.get("experiment", "").lower():
        dither = d.get("dithering", "unknown")
        if dither != "unknown":
            dither_heavy[dither].append(d["algorithmTime_ms"])

dither_algos = sorted(set(dither_normal.keys()) & set(dither_heavy.keys()))

if len(dither_algos) >= 1:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    normal_dither_times = [np.mean(dither_normal[d]) for d in dither_algos]
    heavy_dither_times = [np.mean(dither_heavy[d]) for d in dither_algos]

    x = np.arange(len(dither_algos))
    width = 0.35

    ax1.bar(x - width/2, normal_dither_times, width, label='Normal Mode', alpha=0.8)
    ax1.bar(x + width/2, heavy_dither_times, width, label='Heavy Mode', alpha=0.8)
    ax1.set_xlabel("Dithering Algorithm")
    ax1.set_ylabel("Processing Time (ms)")
    ax1.set_title("Dithering Algorithm Performance")
    ax1.set_xticks(x)
    ax1.set_xticklabels(dither_algos)
    ax1.legend()
    ax1.grid(True, alpha=0.3, axis='y')

    # Normalized comparison
    if len(normal_dither_times) > 0 and min(normal_dither_times) > 0:
        normal_norm = [t / min(normal_dither_times) for t in normal_dither_times]
        heavy_norm = [t / min(heavy_dither_times) for t in heavy_dither_times]
        
        ax2.bar(x - width/2, normal_norm, width, label='Normal Mode', alpha=0.8)
        ax2.bar(x + width/2, heavy_norm, width, label='Heavy Mode', alpha=0.8)
        ax2.set_xlabel("Dithering Algorithm")
        ax2.set_ylabel("Relative Performance (normalized)")
        ax2.set_title("Normalized Algorithm Comparison")
        ax2.set_xticks(x)
        ax2.set_xticklabels(dither_algos)
        ax2.legend()
        ax2.grid(True, alpha=0.3, axis='y')
        ax2.axhline(y=1, color='r', linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/05_dithering_comparison.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Dithering comparison")
else:
    print("  ⚠ Skipped (no valid dithering data)")

# ========== 6. IMAGE COMPLEXITY COMPARISON ==========
print("📊 Generating image complexity analysis...")

image_times = defaultdict(lambda: {"normal": [], "heavy": []})

for d in data:
    if "complexity" in d.get("experiment", "").lower():
        img_name = d.get("imageName", "unknown")
        mode = d.get("mode", "normal")
        image_times[img_name][mode].append(d["algorithmTime_ms"])

images = sorted([img for img in image_times.keys() if image_times[img]["normal"] and image_times[img]["heavy"]])

if len(images) >= 1:
    fig, ax = plt.subplots(figsize=(10, 6))
    
    normal_img_times = [np.mean(image_times[img]["normal"]) for img in images]
    heavy_img_times = [np.mean(image_times[img]["heavy"]) for img in images]

    x = np.arange(len(images))
    width = 0.35

    ax.bar(x - width/2, normal_img_times, width, label='Normal Mode', alpha=0.8)
    ax.bar(x + width/2, heavy_img_times, width, label='Heavy Mode', alpha=0.8)
    ax.set_xlabel("Test Image")
    ax.set_ylabel("Processing Time (ms)")
    ax.set_title("Performance Across Different Image Types")
    ax.set_xticks(x)
    ax.set_xticklabels(images, rotation=15, ha='right')
    ax.legend()
    ax.grid(True, alpha=0.3, axis='y')

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/06_image_complexity.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Image complexity")
else:
    print("  ⚠ Skipped (insufficient image complexity data)")

# ========== 7. PERFORMANCE HEATMAP ==========
print("📊 Generating performance heatmap...")

heatmap_data = defaultdict(lambda: defaultdict(list))

for d in data:
    if d.get("mode") == "heavy" and d.get("experiment") in ["resolution_scaling", "color_depth_analysis"]:
        res = d.get("resolution")
        colors = d.get("colors")
        if res and colors:
            heatmap_data[res][colors].append(d["algorithmTime_ms"])

if len(heatmap_data) > 1:
    resolutions_heat = sorted(heatmap_data.keys())
    colors_heat = sorted(set(c for res_dict in heatmap_data.values() for c in res_dict.keys()))
    
    if len(colors_heat) > 1:
        matrix = np.zeros((len(colors_heat), len(resolutions_heat)))
        for i, color in enumerate(colors_heat):
            for j, res in enumerate(resolutions_heat):
                if color in heatmap_data[res] and heatmap_data[res][color]:
                    matrix[i, j] = np.mean(heatmap_data[res][color])
                else:
                    matrix[i, j] = np.nan
        
        fig, ax = plt.subplots(figsize=(12, 8))
        im = ax.imshow(matrix, cmap='YlOrRd', aspect='auto', interpolation='nearest')
        
        ax.set_xticks(np.arange(len(resolutions_heat)))
        ax.set_yticks(np.arange(len(colors_heat)))
        ax.set_xticklabels(resolutions_heat)
        ax.set_yticklabels(colors_heat)
        
        ax.set_xlabel("Resolution (pixels)")
        ax.set_ylabel("Number of Colors")
        ax.set_title("Processing Time Heatmap (Heavy Mode, ms)")
        
        plt.colorbar(im, ax=ax, label="Time (ms)")
        plt.tight_layout()
        plt.savefig(f"{PLOT_DIR}/07_performance_heatmap.png", bbox_inches='tight')
        plt.close()
        print("  ✓ Performance heatmap")
    else:
        print("  ⚠ Skipped (need multiple color depths)")
else:
    print("  ⚠ Skipped (insufficient heatmap data)")

# ========== 8. SUMMARY STATISTICS ==========
print("📊 Generating summary statistics...")

if len(data) >= 10:
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))

    # Processing time distribution
    all_times = [d["algorithmTime_ms"] for d in data]
    ax1.hist(all_times, bins=50, alpha=0.7, edgecolor='black')
    ax1.set_xlabel("Processing Time (ms)")
    ax1.set_ylabel("Frequency")
    ax1.set_title("Processing Time Distribution")
    ax1.axvline(np.median(all_times), color='r', linestyle='--', label=f'Median: {np.median(all_times):.1f}ms')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Mode comparison boxplot
    normal_times = [d["algorithmTime_ms"] for d in normal_data]
    heavy_times = [d["algorithmTime_ms"] for d in heavy_data]
    if normal_times and heavy_times:
        ax2.boxplot([normal_times, heavy_times], labels=['Normal', 'Heavy'])
        ax2.set_ylabel("Processing Time (ms)")
        ax2.set_title("Mode Performance Distribution")
        ax2.grid(True, alpha=0.3, axis='y')

    # Pixels vs time scatter
    pixels = [d["resolution"] ** 2 for d in data if d.get("resolution")]
    times = [d["algorithmTime_ms"] for d in data if d.get("resolution")]
    modes = [d.get("mode", "normal") for d in data if d.get("resolution")]
    
    if pixels and times:
        colors_scatter = ['blue' if m == 'normal' else 'red' for m in modes]
        ax3.scatter(pixels, times, c=colors_scatter, alpha=0.5, s=20)
        ax3.set_xlabel("Total Pixels")
        ax3.set_ylabel("Processing Time (ms)")
        ax3.set_title("Computational Complexity Analysis")
        ax3.set_xscale('log')
        ax3.set_yscale('log')
        ax3.grid(True, alpha=0.3)
        from matplotlib.patches import Patch
        legend_elements = [Patch(facecolor='blue', label='Normal Mode'),
                          Patch(facecolor='red', label='Heavy Mode')]
        ax3.legend(handles=legend_elements)

    # Experiment coverage
    exp_counts = defaultdict(int)
    for d in data:
        exp_counts[d.get("experiment", "unknown")] += 1

    experiments = list(exp_counts.keys())
    counts = list(exp_counts.values())
    ax4.barh(experiments, counts, alpha=0.7)
    ax4.set_xlabel("Number of Tests")
    ax4.set_title("Test Coverage by Experiment")
    ax4.grid(True, alpha=0.3, axis='x')

    plt.tight_layout()
    plt.savefig(f"{PLOT_DIR}/08_summary_statistics.png", bbox_inches='tight')
    plt.close()
    print("  ✓ Summary statistics")
else:
    print("  ⚠ Skipped (need at least 10 data points)")

print()
print("=" * 70)
print(f"✓ Plot generation complete!")
print(f"✓ Analyzed {len(data)} successful test results")
print(f"✓ Plots saved to: {PLOT_DIR}/")