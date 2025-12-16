module.exports = {
  baseUrl: "http://localhost:5500",

  // Extended cooldown for stability
  cooldownMs: {
    normal: 2000,
    heavy: 8000
  },

  // Comprehensive resolution coverage including 16K
  resolutions: [256, 512, 1024, 2048, 4096, 8192, 16384],

  // Canonical image location
  imagePath: (res, name = "lena") => `benchmark/inputs/${name}_${res}.png`,

  // Output directory for processed images
  outputDir: "benchmark/outputs",

  experiments: [
    // 1. Core resolution scaling benchmark
    {
      name: "resolution_scaling",
      description: "Algorithm performance across resolution spectrum",
      modes: ["normal", "heavy"],
      images: ["lena"],
      outputScale: [100],
      colors: [16],
      pixelSize: [1],
      dithering: ["floyd"],
      saveOutput: true
    },

    // 2. Extended resolution stress test (8K-16K)
    {
      name: "high_resolution_stress",
      description: "Performance characteristics at extreme resolutions",
      modes: ["normal", "heavy"],
      resolutions: [8192, 16384],
      images: ["lena", "mandrill"],
      outputScale: [100],
      colors: [16, 32],
      pixelSize: [1],
      dithering: ["floyd"],
      saveOutput: true
    },

    // 3. Color depth comprehensive analysis
    {
      name: "color_depth_analysis",
      description: "Color quantization impact on processing time",
      modes: ["normal", "heavy"],
      resolutions: [2048, 4096],
      images: ["lena", "peppers"],
      outputScale: [100],
      colors: [4, 8, 16, 24, 32, 64, 96, 128],
      pixelSize: [1],
      dithering: ["floyd"],
      saveOutput: true
    },

    // 4. Pixel size effect analysis
    {
      name: "pixel_size_effect",
      description: "Pixelation parameter impact on performance",
      modes: ["normal", "heavy"],
      resolutions: [2048, 4096],
      images: ["lena"],
      outputScale: [100],
      colors: [16],
      pixelSize: [1, 2, 4, 6, 8, 12, 16],
      dithering: ["floyd"],
      saveOutput: true
    },

    // 5. Output scale optimization
    {
      name: "output_scale_optimization",
      description: "Downscaling impact on algorithm efficiency",
      modes: ["normal", "heavy"],
      resolutions: [4096, 8192],
      images: ["lena"],
      outputScale: [100, 90, 80, 70, 60, 50, 40, 30, 25, 20],
      colors: [16],
      pixelSize: [1],
      dithering: ["floyd"],
      saveOutput: false
    },

    // 6. Dithering algorithm comparison
    {
      name: "dithering_algorithms",
      description: "Comparative analysis of dithering techniques",
      modes: ["normal", "heavy"],
      resolutions: [2048],
      images: ["lena", "mandrill", "peppers"],
      outputScale: [100],
      colors: [16],
      pixelSize: [1],
      dithering: ["none", "floyd", "atkinson", "ordered"],
      saveOutput: true
    },

    // 7. Combined parameter stress test
    {
      name: "parameter_interaction",
      description: "Multi-parameter interaction effects",
      modes: ["normal", "heavy"],
      resolutions: [4096],
      images: ["lena"],
      outputScale: [100, 50],
      colors: [8, 32, 128],
      pixelSize: [1, 4, 8],
      dithering: ["floyd"],
      saveOutput: true
    },

    // 8. Image complexity comparison
    {
      name: "image_complexity",
      description: "Algorithm behavior across different image types",
      modes: ["normal", "heavy"],
      resolutions: [2048, 4096],
      images: ["lena", "mandrill", "peppers", "landscape"],
      outputScale: [100],
      colors: [16],
      pixelSize: [1],
      dithering: ["floyd"],
      saveOutput: true
    }
  ]
};