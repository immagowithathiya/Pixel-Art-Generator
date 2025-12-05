// Visualization functions for color palette and clustering

function visualizeAlgorithm(palette, iterations, pixels, time) {
    const visualizerSection = document.getElementById('visualizerSection');
    visualizerSection.style.display = 'block';
    
    visualizeColorPalette(palette);
    visualizeColorSpace(palette);
    updateStats(palette.length, iterations, pixels, time);
}

function visualizeColorPalette(palette) {
    const colorPaletteViz = document.getElementById('colorPaletteViz');
    colorPaletteViz.innerHTML = '';
    
    palette.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        swatch.title = `RGB(${color[0]}, ${color[1]}, ${color[2]})`;
        
        const code = document.createElement('span');
        code.className = 'color-code';
        code.textContent = `#${color.map(c => c.toString(16).padStart(2, '0')).join('')}`;
        swatch.appendChild(code);
        
        colorPaletteViz.appendChild(swatch);
    });
}

function visualizeColorSpace(palette) {
    const clusterViz = document.getElementById('clusterViz');
    const clusterCtx = clusterViz.getContext('2d');
    
    clusterViz.width = 300;
    clusterViz.height = 200;
    
    // Background
    clusterCtx.fillStyle = '#1e293b';
    clusterCtx.fillRect(0, 0, 300, 200);

    // Grid
    clusterCtx.strokeStyle = '#334155';
    clusterCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * 300;
        const y = (i / 10) * 200;
        clusterCtx.beginPath();
        clusterCtx.moveTo(x, 0);
        clusterCtx.lineTo(x, 200);
        clusterCtx.stroke();
        clusterCtx.beginPath();
        clusterCtx.moveTo(0, y);
        clusterCtx.lineTo(300, y);
        clusterCtx.stroke();
    }

    // Plot colors
    palette.forEach((color, i) => {
        const x = (color[0] / 255) * 300;
        const y = (1 - color[1] / 255) * 200;
        
        clusterCtx.beginPath();
        clusterCtx.arc(x, y, 8, 0, Math.PI * 2);
        clusterCtx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        clusterCtx.fill();
        clusterCtx.strokeStyle = '#f1f5f9';
        clusterCtx.lineWidth = 2;
        clusterCtx.stroke();

        clusterCtx.fillStyle = '#f1f5f9';
        clusterCtx.font = 'bold 10px sans-serif';
        clusterCtx.fillText(i + 1, x - 3, y + 20);
    });

    // Labels
    clusterCtx.fillStyle = '#94a3b8';
    clusterCtx.font = '11px sans-serif';
    clusterCtx.fillText('Red →', 250, 195);
    clusterCtx.save();
    clusterCtx.translate(10, 100);
    clusterCtx.rotate(-Math.PI / 2);
    clusterCtx.fillText('Green →', -30, 0);
    clusterCtx.restore();
}

function updateStats(colors, iterations, pixels, time) {
    document.getElementById('statColors').textContent = colors;
    document.getElementById('statIterations').textContent = iterations;
    document.getElementById('statPixels').textContent = pixels.toLocaleString();
    // Don't update time here - it's already updated in imageProcessor.js
}