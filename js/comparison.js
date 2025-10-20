// Image comparison slider functionality

function initializeComparison() {
    const comparisonContainer = document.getElementById('comparisonContainer');
    const comparisonSlider = document.getElementById('comparisonSlider');
    const processedCanvas = document.getElementById('processedCanvas');
    
    let isDragging = false;

    // Mouse events
    comparisonContainer.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    comparisonContainer.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = comparisonContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = (x / rect.width) * 100;
            updateComparison(Math.max(0, Math.min(100, percent)));
        }
    });

    // Touch events
    comparisonContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        e.preventDefault();
    });
    
    comparisonContainer.addEventListener('touchend', () => isDragging = false);
    
    comparisonContainer.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const rect = comparisonContainer.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const percent = (x / rect.width) * 100;
            updateComparison(Math.max(0, Math.min(100, percent)));
            e.preventDefault();
        }
    });

    function updateComparison(percent) {
        comparisonSlider.style.left = percent + '%';
        processedCanvas.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    }
}