import os
import json
import requests
from PIL import Image
from io import BytesIO

# ---------------- CONFIG ----------------
BASE_DIR = "benchmark"
INPUT_DIR = os.path.join(BASE_DIR, "inputs")
STATS_DIR = os.path.join(BASE_DIR, "stats")

# Extended resolution range including 16K
RESOLUTIONS = [256, 512, 1024, 2048, 4096, 8192, 16384]

# Multiple test images for diverse scenarios
TEST_IMAGES = {
    "lena": {
        "url": "https://upload.wikimedia.org/wikipedia/en/7/7d/Lenna_%28test_image%29.png",
        "description": "Portrait with complex skin tones and texture"
    },
    "mandrill": {
        "url": "https://sipi.usc.edu/database/preview/misc/4.2.03.png",
        "description": "High-frequency detail and fur texture"
    },
    "peppers": {
        "url": "https://sipi.usc.edu/database/preview/misc/4.2.07.png",
        "description": "Vibrant colors and varied textures"
    },
    "landscape": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Rotating_earth_%28large%29.gif/480px-Rotating_earth_%28large%29.gif",
        "description": "Natural scenes with gradients"
    }
}
# ----------------------------------------


def ensure_dirs():
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(STATS_DIR, exist_ok=True)


def download_image(url, name):
    print(f"Downloading {name}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        # Handle animated GIFs - take first frame
        if hasattr(img, 'n_frames') and img.n_frames > 1:
            img.seek(0)
        return img.convert("RGB")
    except Exception as e:
        print(f"Warning: Failed to download {name}: {e}")
        return None


def generate_resolutions(images_dict):
    stats = []

    for name, data in images_dict.items():
        img = data.get('image')
        if img is None:
            continue
            
        for size in RESOLUTIONS:
            resized = img.resize((size, size), Image.BICUBIC)
            filename = f"{name}_{size}.png"
            path = os.path.join(INPUT_DIR, filename)
            resized.save(path, optimize=True)

            stats.append({
                "image": filename,
                "name": name,
                "width": size,
                "height": size,
                "pixels": size * size,
                "megapixels": round(size * size / 1_000_000, 2),
                "description": data['description']
            })

            print(f"✓ Saved {filename} ({size}x{size})")

    return stats


def write_stats(stats):
    stats_path = os.path.join(STATS_DIR, "benchmark.json")
    with open(stats_path, "w") as f:
        json.dump({
            "inputs": stats,
            "outputs": [],
            "metadata": {
                "total_images": len(stats),
                "resolutions": RESOLUTIONS,
                "generated": "2025-12-27",
                "version": "2.0"
            },
            "notes": "Comprehensive benchmark suite with extended resolution and parameter coverage"
        }, f, indent=2)

    print(f"\n✓ Benchmark stats initialized with {len(stats)} test images.")


if __name__ == "__main__":
    print("═" * 60)
    print("  COMPREHENSIVE BENCHMARK DATASET PREPARATION")
    print("═" * 60)
    
    ensure_dirs()
    
    # Download all test images
    images = {}
    for name, info in TEST_IMAGES.items():
        img = download_image(info['url'], name)
        if img:
            images[name] = {'image': img, 'description': info['description']}
    
    if not images:
        print("\n✗ Error: No images could be downloaded. Check URLs and network.")
        exit(1)
    
    # Generate all resolutions
    input_stats = generate_resolutions(images)
    write_stats(input_stats)
    
    print("\n" + "═" * 60)
    print("  Dataset preparation complete!")
    print("═" * 60)