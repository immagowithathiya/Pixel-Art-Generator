// Main application entry point and event handlers
const STRESS_MODE = true;
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeComparison();
});

function initializeEventListeners() {
    const imageUpload = document.getElementById('imageUpload');
    const colorCount = document.getElementById('colorCount');
    const colorValue = document.getElementById('colorValue');
    const pixelSize = document.getElementById('pixelSize');
    const pixelValue = document.getElementById('pixelValue');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const exportOptions = document.getElementById('exportOptions');
    const heavyMode = document.getElementById('heavyProcessingMode');
    const colorHint = document.getElementById('colorHint');
    const pixelHint = document.getElementById('pixelHint');
    const imageInfo = document.getElementById('imageInfo');
    const previewScale = document.getElementById('previewScale');
    const previewScaleValue = document.getElementById('previewScaleValue');
    const previewScaleHint = document.getElementById('previewScaleHint');
    const outputScale = document.getElementById('outputScale');
    const outputScaleValue = document.getElementById('outputScaleValue');
    const outputScaleHint = document.getElementById('outputScaleHint');

    // Update slider limits based on heavy mode
    function updateSliderLimits() {
        const isHeavyMode = heavyMode.checked;
        
        if (isHeavyMode) {
            colorCount.max = 128;
            colorHint.textContent = '⚡ Heavy mode: up to 128 colors available';
            colorHint.style.color = '#f59e0b';
            pixelHint.textContent = '⚡ Heavy mode: minimal auto-adjustments';
            pixelHint.style.color = '#f59e0b';
        } else {
            colorCount.max = 32;
            if (parseInt(colorCount.value) > 32) {
                colorCount.value = 32;
                colorValue.textContent = '32';
            }
            colorHint.textContent = 'Switch to heavy mode for more colors';
            colorHint.style.color = '#94a3b8';
            pixelHint.textContent = 'Auto-adjusted for large images';
            pixelHint.style.color = '#94a3b8';
        }
    }

    // Update scale displays and hints
    function updateScaleDisplays() {
        const previewPercent = parseInt(previewScale.value);
        const outputPercent = parseInt(outputScale.value);
        
        previewScaleValue.textContent = previewPercent + '%';
        outputScaleValue.textContent = outputPercent + '%';
        
        // Update hints based on scale values
        if (previewPercent < 50) {
            previewScaleHint.textContent = '⚡ Very low preview resolution - fast but may be hard to see details';
            previewScaleHint.style.color = '#f59e0b';
        } else if (previewPercent < 100) {
            previewScaleHint.textContent = '👍 Reduced preview size for better performance';
            previewScaleHint.style.color = '#10b981';
        } else {
            previewScaleHint.textContent = 'Full resolution preview - may be slow for large images';
            previewScaleHint.style.color = '#94a3b8';
        }
        
        if (outputPercent < 50) {
            outputScaleHint.textContent = '⚡ Low output resolution - very fast processing, smaller file size';
            outputScaleHint.style.color = '#f59e0b';
        } else if (outputPercent < 100) {
            outputScaleHint.textContent = '👍 Balanced quality and performance';
            outputScaleHint.style.color = '#10b981';
        } else {
            outputScaleHint.textContent = 'Full resolution output - best quality, slower processing';
            outputScaleHint.style.color = '#94a3b8';
        }
        
        // Update dimension displays if image is loaded
        if (currentImage) {
            updatePreviewDimensions(currentImage.width, currentImage.height, previewPercent / 100);
            updateOutputDimensions(currentImage.width, currentImage.height, outputPercent / 100);
        }
    }

    // Heavy mode toggle
    heavyMode.addEventListener('change', updateSliderLimits);

    // Preview scale slider
    previewScale.addEventListener('input', () => {
        updateScaleDisplays();
        // Redisplay the image if one is loaded
        if (currentImage) {
            displayOriginalImage(currentImage);
        }
    });

    // Output scale slider
    outputScale.addEventListener('input', updateScaleDisplays);

    // Slider updates
    colorCount.addEventListener('input', (e) => {
        colorValue.textContent = e.target.value;
    });

    pixelSize.addEventListener('input', (e) => {
        pixelValue.textContent = e.target.value + 'x';
    });

    // Image upload
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                displayOriginalImage(img);
                processBtn.disabled = false;
                downloadBtn.disabled = true;
                exportOptions.classList.remove('active');
                
                // Show image info
                const pixels = img.width * img.height;
                const megapixels = (pixels / 1_000_000).toFixed(1);
                imageInfo.textContent = `${img.width}×${img.height} (${megapixels}MP)`;
                imageInfo.style.color = '#10b981';
                
                // Update dimension displays
                updateScaleDisplays();
                
                console.log('Image loaded:', {
                    dimensions: `${img.width}×${img.height}`,
                    totalPixels: pixels.toLocaleString(),
                    megapixels: megapixels
                });
                
                // Suggest heavy mode for large images
                if (pixels > 2_000_000 && !heavyMode.checked) {
                    colorHint.textContent = '💡 Large image detected - consider Heavy Mode for best quality';
                    colorHint.style.color = '#10b981';
                    pixelHint.textContent = '💡 Heavy mode recommended for this image size';
                    pixelHint.style.color = '#10b981';
                }
                
                // Suggest lower output scale for very large images
                if (pixels > 4_000_000 && outputScale.value === '100') {
                    outputScaleHint.textContent = '💡 Very large image - consider reducing output scale (e.g., 50-75%) for faster processing';
                    outputScaleHint.style.color = '#10b981';
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Process button
    processBtn.addEventListener('click', () => {
        if (!currentImage) return;
        processImage();
    });

    // Download button
    downloadBtn.addEventListener('click', () => {
        exportOptions.classList.toggle('active');
    });

    // Initialize hints
    updateSliderLimits();
    updateScaleDisplays();
}