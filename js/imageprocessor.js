// Image processing and worker management

let currentImage = null;
let processedImageData = null;
let currentPalette = [];
let worker = null;

function displayOriginalImage(img) {
    const originalCanvas = document.getElementById('originalCanvas');
    const processedCanvas = document.getElementById('processedCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const processedCtx = processedCanvas.getContext('2d');

    const previewScale = parseInt(document.getElementById('previewScale').value) / 100;
    
    let width = Math.floor(img.width * previewScale);
    let height = Math.floor(img.height * previewScale);

    originalCanvas.width = width;
    originalCanvas.height = height;
    processedCanvas.width = width;
    processedCanvas.height = height;

    originalCtx.drawImage(img, 0, 0, width, height);
    processedCtx.clearRect(0, 0, width, height);
}

function updatePreviewDimensions(imgWidth, imgHeight, scale) {
    const previewDimensions = document.getElementById('previewDimensions');
    const previewDimText = document.getElementById('previewDimText');
    
    const scaledWidth = Math.floor(imgWidth * scale);
    const scaledHeight = Math.floor(imgHeight * scale);
    
    previewDimText.textContent = `${scaledWidth} × ${scaledHeight}`;
    previewDimensions.style.display = 'block';
}

function updateOutputDimensions(imgWidth, imgHeight, scale) {
    const outputDimensions = document.getElementById('outputDimensions');
    const outputDimText = document.getElementById('outputDimText');
    
    const scaledWidth = Math.floor(imgWidth * scale);
    const scaledHeight = Math.floor(imgHeight * scale);
    
    outputDimText.textContent = `${scaledWidth} × ${scaledHeight}`;
    outputDimensions.style.display = 'block';
}

function processImage() {
    const processing = document.getElementById('processing');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const visualizerSection = document.getElementById('visualizerSection');
    const processingText = document.getElementById('processingText');
    const progressFill = document.getElementById('progressFill');
    const originalCanvas = document.getElementById('originalCanvas');
    const processedCanvas = document.getElementById('processedCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const processedCtx = processedCanvas.getContext('2d');
    const showViz = document.getElementById('showViz');

    // ✅ START END-TO-END UI TIMING
    PerformanceTracker.startUI();

    processing.classList.add('active');
    processBtn.disabled = true;
    downloadBtn.disabled = true;
    visualizerSection.style.display = 'none';

    // Get the user's desired output scale
    const outputScale = parseInt(document.getElementById('outputScale').value) / 100;
    const heavyProcessingMode = document.getElementById('heavyProcessingMode').checked;
    
    // Determine the actual processing dimensions
    let processWidth = Math.floor(currentImage.width * outputScale);
    let processHeight = Math.floor(currentImage.height * outputScale);
    
    // Create a canvas at the processing resolution
    const processCanvas = document.createElement('canvas');
    processCanvas.width = processWidth;
    processCanvas.height = processHeight;
    const processCtx = processCanvas.getContext('2d');
    processCtx.drawImage(currentImage, 0, 0, processWidth, processHeight);
    
    const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);

    let numColors = parseInt(document.getElementById('colorCount').value);
    let blockSize = parseInt(document.getElementById('pixelSize').value);

    const totalPixels = processWidth * processHeight;

    /*
      ADAPTIVE QUALITY SYSTEM
      -------------------------
      Normal Mode: Conservative limits for smooth performance
      Heavy Mode: Aggressive quality, accepts longer processing
    */

    if (!heavyProcessingMode) {
        // 🔹 NORMAL MODE - Protect responsiveness
        if (totalPixels > 4_000_000) {
            // Very large images (4K+): strong downsampling
            blockSize = Math.max(blockSize, 8);
            numColors = Math.min(numColors, 32);
        } else if (totalPixels > 2_000_000) {
            // Large images (1080p-4K): moderate downsampling
            blockSize = Math.max(blockSize, 6);
            numColors = Math.min(numColors, 32);
        } else if (totalPixels > 1_000_000) {
            // Medium images: light constraints
            blockSize = Math.max(blockSize, 3);
        }
    } else {
        // 🔥 HEAVY MODE - Maximum quality
        if (totalPixels > 8_000_000) {
            // Extreme resolution (8K+): still need some limits
            blockSize = Math.max(blockSize, 2);
            numColors = Math.min(numColors, 96);
        } else if (totalPixels > 4_000_000) {
            // Very large (4K+): high quality allowed
            blockSize = Math.max(blockSize, 1);
            numColors = Math.min(numColors, 128);
        } else if (totalPixels > 2_000_000) {
            // Large images: minimal restrictions
            blockSize = Math.max(blockSize, 1);
            numColors = Math.min(numColors, 128);
        }
        // For smaller images in heavy mode: no restrictions at all
    }

    const effectiveWidth = Math.floor(processWidth / blockSize);
    const effectiveHeight = Math.floor(processHeight / blockSize);
    const effectivePixels = effectiveWidth * effectiveHeight;

    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('🎨 PROCESSING CONFIGURATION');
    console.log('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
    console.log('Mode:', heavyProcessingMode ? '🔥 HEAVY' : '🔹 NORMAL');
    console.log('Original Image:', `${currentImage.width}x${currentImage.height}`);
    console.log('Processing Size:', `${processWidth}x${processHeight} (${totalPixels.toLocaleString()} pixels)`);
    console.log('Effective Size:', `${effectiveWidth}x${effectiveHeight} (${effectivePixels.toLocaleString()} pixels)`);
    console.log('Block Size:', blockSize + 'x');
    console.log('Colors:', numColors);
    console.log('Compression Ratio:', (totalPixels / effectivePixels).toFixed(2) + 'x');
    console.log('Output Scale:', outputScale * 100 + '%');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n');

    const dithering = document.getElementById('ditherAlgo').value;

    const workerCode = createWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = function (e) {
        if (e.data.type === 'progress') {
            progressFill.style.width = e.data.progress + '%';
            processingText.textContent = e.data.text;
        }

        else if (e.data.type === 'palette') {
            currentPalette = e.data.palette;
        }

        else if (e.data.type === 'complete') {
            processedImageData = e.data.imageData;

            // Upscale to match the processing canvas dimensions
            const upscaled = upscaleImageData(
                processedImageData,
                processWidth,
                processHeight
            );

            // Now scale to preview canvas size (if downscale preview is enabled)
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = processWidth;
            previewCanvas.height = processHeight;
            const previewCtx = previewCanvas.getContext('2d');
            previewCtx.putImageData(upscaled, 0, 0);
            
            // Draw to the display canvas
            processedCanvas.width = originalCanvas.width;
            processedCanvas.height = originalCanvas.height;
            processedCtx.imageSmoothingEnabled = false;
            processedCtx.drawImage(previewCanvas, 0, 0, processedCanvas.width, processedCanvas.height);

            processing.classList.remove('active');
            processBtn.disabled = false;
            downloadBtn.disabled = false;

            // CORRECT: Use the actual processed pixels from the downscaled image
            const actualPixelsProcessed = processedImageData.width * processedImageData.height;

            const perf = PerformanceTracker.endUI({
                workerTime: e.data.algorithmTime
            });

            document.getElementById('statTime').textContent =
                perf.totalTime + ' ms';

            document.getElementById('statPerfTime').textContent =
                e.data.algorithmTime.toFixed(2) + ' ms';

            console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
            console.log('⚡ PERFORMANCE METRICS');
            console.log('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
            console.log('Total Time:', perf.totalTime + ' ms');
            console.log('Algorithm Time:', e.data.algorithmTime.toFixed(2) + ' ms');
            console.log('UI Overhead:', perf.uiOverhead + ' ms');
            console.log('Pixels Processed:', actualPixelsProcessed.toLocaleString());
            console.log('Throughput:', (actualPixelsProcessed / e.data.algorithmTime).toFixed(2) + ' px/ms');
            console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n');

            if (showViz.checked) {
                visualizeAlgorithm(
                    e.data.palette,
                    e.data.iterations,
                    actualPixelsProcessed,
                    perf.totalTime
                );
            }

            worker.terminate();
        }
    };

    worker.postMessage({
        imageData: imageData,
        numColors: numColors,
        blockSize: blockSize,
        dithering: dithering
    });
}

function upscaleImageData(smallData, targetWidth, targetHeight) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallData.width;
    tempCanvas.height = smallData.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(smallData, 0, 0);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    outputCtx.drawImage(
        tempCanvas,
        0,
        0,
        targetWidth,
        targetHeight
    );

    return outputCtx.getImageData(0, 0, targetWidth, targetHeight);
}

function downloadImage(scale) {
    if (!processedImageData || !currentImage) return;
    
    // Get the output scale setting
    const outputScale = parseInt(document.getElementById('outputScale').value) / 100;
    
    // Determine base output dimensions
    let baseWidth = Math.floor(currentImage.width * outputScale);
    let baseHeight = Math.floor(currentImage.height * outputScale);
    
    // Apply the download scale multiplier
    const finalWidth = baseWidth * scale;
    const finalHeight = baseHeight * scale;
    
    // Create canvas at processed size first
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
    
    // Apply scale multiplier
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = false;
    finalCtx.drawImage(baseCanvas, 0, 0, finalWidth, finalHeight);

    finalCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel-art-${baseWidth}x${baseHeight}-${scale}x.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}