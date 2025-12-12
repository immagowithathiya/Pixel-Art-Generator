const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const config = require("./benchmark_config");

const STATS_FILE = "benchmark/stats/benchmark.json";
const OUTPUT_DIR = config.outputDir;

/* ---------- Helpers ---------- */

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function loadStats() {
  return JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
}

function appendResult(entry) {
  const json = loadStats();
  json.outputs.push(entry);
  fs.writeFileSync(STATS_FILE, JSON.stringify(json, null, 2));
}

function assertImageExists(imgPath) {
  if (!fs.existsSync(imgPath)) {
    throw new Error(`Missing benchmark image: ${imgPath}`);
  }
}

async function saveOutputImage(page, metadata) {
  try {
    const filename = `${metadata.experiment}_${metadata.image}_${metadata.resolution}_` +
                     `${metadata.mode}_c${metadata.colors}_p${metadata.pixelSize}_` +
                     `s${metadata.outputScale}_${metadata.dithering}.png`;
    
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Trigger download and wait for file to be saved
    await page.evaluate((filename) => {
      // Use the existing downloadImage function but save to our benchmark directory
      if (!processedImageData || !currentImage) {
        throw new Error("No processed image data available");
      }
      
      const outputScale = parseInt(document.getElementById('outputScale').value) / 100;
      let baseWidth = Math.floor(currentImage.width * outputScale);
      let baseHeight = Math.floor(currentImage.height * outputScale);
      
      // Create canvas at processed size
      const processCanvas = document.createElement('canvas');
      processCanvas.width = processedImageData.width;
      processCanvas.height = processedImageData.height;
      const processCtx = processCanvas.getContext('2d');
      processCtx.putImageData(processedImageData, 0, 0);
      
      // Upscale to base resolution
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = baseWidth;
      baseCanvas.height = baseHeight;
      const baseCtx = baseCanvas.getContext('2d');
      baseCtx.imageSmoothingEnabled = false;
      baseCtx.drawImage(processCanvas, 0, 0, baseWidth, baseHeight);
      
      // Return base64 data
      return baseCanvas.toDataURL('image/png');
    }, filename).then(dataURL => {
      // Convert data URL to buffer and save
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filepath, buffer);
    });
    
    return filename;
  } catch (error) {
    console.log(`   ⚠️  Warning: Failed to save output image: ${error.message}`);
    return null;
  }
}

function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/* ---------- Main Benchmark Runner ---------- */

(async () => {
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║  COMPREHENSIVE PIXEL ART GENERATOR BENCHMARK SUITE" + " ".repeat(17) + "║");
  console.log("╚" + "═".repeat(68) + "╝");
  console.log();

  ensureOutputDir();

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  let totalTests = 0;
  let completedTests = 0;
  let failedTests = 0;

  // Calculate total test count
  for (const exp of config.experiments) {
    const resolutions = exp.resolutions || config.resolutions;
    const images = exp.images || ["lena"];
    const modes = exp.modes || ["normal"];
    const scales = exp.outputScale || [100];
    const colors = exp.colors || [16];
    const pixelSizes = exp.pixelSize || [1];
    const dithering = exp.dithering || ["floyd"];

    totalTests += modes.length * resolutions.length * images.length * 
                  scales.length * colors.length * pixelSizes.length * dithering.length;
  }

  console.log(`📊 Total experiments: ${config.experiments.length}`);
  console.log(`🧪 Total test cases: ${totalTests}`);
  console.log();

  const startTime = Date.now();

  for (const exp of config.experiments) {
    console.log("─".repeat(70));
    console.log(`🔬 Experiment: ${exp.name}`);
    console.log(`   ${exp.description}`);
    console.log("─".repeat(70));

    const resolutions = exp.resolutions || config.resolutions;
    const images = exp.images || ["lena"];
    const modes = exp.modes || ["normal"];

    for (const imageName of images) {
      for (const mode of modes) {
        for (const res of resolutions) {
          for (const scale of exp.outputScale) {
            for (const colors of exp.colors) {
              for (const pixelSize of exp.pixelSize) {
                for (const dithering of exp.dithering) {
                  
                  completedTests++;
                  const progress = ((completedTests / totalTests) * 100).toFixed(1);

                  console.log(
                    `[${completedTests}/${totalTests}] (${progress}%) ` +
                    `${imageName} | ${res}px | ${mode} | scale:${scale}% | ` +
                    `colors:${colors} | pixel:${pixelSize}x | ${dithering}`
                  );

                  try {
                    const imgPath = config.imagePath(res, imageName);
                    assertImageExists(imgPath);

                    await page.goto(config.baseUrl, { waitUntil: "networkidle" });

                    // Upload image
                    await page.setInputFiles("#imageUpload", imgPath);
                    await page.waitForTimeout(800); // Increased from 500ms

                    // FIX: Set heavy mode FIRST, then wait for UI update
                    if (mode === "heavy") {
                      await page.check("#heavyProcessingMode");
                      await page.waitForTimeout(200); // Let the UI update limits
                    } else {
                      await page.uncheck("#heavyProcessingMode");
                      await page.waitForTimeout(200);
                    }

                    // Set parameters with proper event dispatching
                    await page.evaluate(
                      ({ scale, colors, pixelSize, dithering }) => {
                        // Output scale
                        const outputScaleEl = document.getElementById("outputScale");
                        outputScaleEl.value = scale;
                        outputScaleEl.dispatchEvent(new Event("input", { bubbles: true }));

                        // Color count - IMPORTANT: Check if value is within allowed range
                        const colorCountEl = document.getElementById("colorCount");
                        const maxColors = parseInt(colorCountEl.max);
                        const targetColors = Math.min(colors, maxColors);
                        colorCountEl.value = targetColors;
                        colorCountEl.dispatchEvent(new Event("input", { bubbles: true }));

                        // Pixel size
                        const pixelSizeEl = document.getElementById("pixelSize");
                        if (pixelSizeEl) {
                          pixelSizeEl.value = pixelSize;
                          pixelSizeEl.dispatchEvent(new Event("input", { bubbles: true }));
                        }

                        // Dithering
                        document.getElementById("ditherAlgo").value = dithering;
                      },
                      { scale, colors, pixelSize, dithering }
                    );

                    await page.waitForTimeout(300); // Let parameters settle

                    // Verify parameters were set correctly (for debugging)
                    const actualParams = await page.evaluate(() => ({
                      heavyMode: document.getElementById("heavyProcessingMode").checked,
                      colorCount: parseInt(document.getElementById("colorCount").value),
                      colorMax: parseInt(document.getElementById("colorCount").max),
                      pixelSize: parseInt(document.getElementById("pixelSize")?.value || 1),
                      outputScale: parseInt(document.getElementById("outputScale").value),
                      dithering: document.getElementById("ditherAlgo").value
                    }));

                    // Run processing
                    const processStart = Date.now();
                    await page.click("#processBtn");

                    // Wait for completion with extended timeout for 16K images
                    const timeout = res >= 16384 ? 180000 : (mode === "heavy" ? 90000 : 30000);
                    await page.waitForSelector(
                      "#processing.active",
                      { state: "hidden", timeout }
                    );

                    const totalTime = Date.now() - processStart;

                    // Collect stats
                    const stats = await page.evaluate(() => ({
                      resolution: document.getElementById("originalCanvas")?.width || 0,
                      algorithmTime_ms: parseFloat(
                        document.getElementById("statPerfTime")
                          ?.innerText.replace("ms", "").trim() || "0"
                      ),
                      totalTime_ms: parseFloat(
                        document.getElementById("statTime")
                          ?.innerText.replace("ms", "").trim() || "0"
                      ),
                      colors: parseInt(
                        document.getElementById("statColors")?.innerText || "0"
                      ),
                      iterations: parseInt(
                        document.getElementById("statIterations")?.innerText || "0"
                      ),
                      pixelsProcessed: parseInt(
                        document.getElementById("statPixels")?.innerText.replace(/,/g, "") || "0"
                      ),
                      dithering: document.getElementById("ditherAlgo")?.value || "unknown"
                    }));

                    // Save output image if requested
                    let outputFilename = null;
                    if (exp.saveOutput) {
                      await page.waitForTimeout(500); // Ensure canvas is fully rendered
                      outputFilename = await saveOutputImage(page, {
                        experiment: exp.name,
                        image: imageName,
                        resolution: res,
                        mode,
                        outputScale: scale,
                        colors: actualParams.colorCount, // Use actual value set
                        pixelSize,
                        dithering
                      });
                    }

                    // Append result with actual parameters used
                    appendResult({
                      experiment: exp.name,
                      experimentDescription: exp.description,
                      imageName,
                      mode,
                      resolution: res,
                      outputScale: scale / 100,
                      colors: actualParams.colorCount, // FIX: Use actual value
                      colorMax: actualParams.colorMax,
                      pixelSize: actualParams.pixelSize,
                      dithering: actualParams.dithering,
                      algorithmTime_ms: stats.algorithmTime_ms,
                      totalProcessingTime_ms: totalTime,
                      iterations: stats.iterations,
                      pixelsProcessed: stats.pixelsProcessed,
                      outputImage: outputFilename,
                      timestamp: new Date().toISOString(),
                      success: true
                    });

                    console.log(`   ✓ Completed in ${formatTime(stats.algorithmTime_ms)}`);
                    if (outputFilename) {
                      console.log(`   💾 Saved: ${outputFilename}`);
                    }

                    // Cooldown
                    await page.waitForTimeout(config.cooldownMs[mode]);

                  } catch (error) {
                    failedTests++;
                    console.log(`   ✗ FAILED: ${error.message}`);
                    
                    appendResult({
                      experiment: exp.name,
                      imageName,
                      mode,
                      resolution: res,
                      outputScale: scale / 100,
                      colors,
                      pixelSize,
                      dithering,
                      error: error.message,
                      timestamp: new Date().toISOString(),
                      success: false
                    });

                    await page.waitForTimeout(2000);
                  }
                }
              }
            }
          }
        }
      }
    }
    console.log();
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║  BENCHMARK COMPLETE" + " ".repeat(49) + "║");
  console.log("╚" + "═".repeat(68) + "╝");
  console.log(`✓ Successful tests: ${completedTests - failedTests}/${totalTests}`);
  console.log(`✗ Failed tests: ${failedTests}`);
  console.log(`⏱  Total time: ${totalTime} minutes`);
  console.log();

  await browser.close();
})();