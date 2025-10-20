// Web Worker code for image processing algorithms - OPTIMIZED VERSION
function createWorkerCode() {
    return `
        self.onmessage = function (e) {
            const { imageData, numColors, blockSize, dithering } = e.data;

            // ===== START ALGORITHM TIMER (ROBUST) =====
            const algoStart = Date.now();

            let workingData = imageData;

            if (blockSize > 1) {
                self.postMessage({ type: 'progress', progress: 5, text: 'Downscaling image...' });
                workingData = downscaleImage(imageData, blockSize);
            }

            self.postMessage({ type: 'progress', progress: 10, text: 'Running K-means clustering...' });
            const result = kMeansQuantization(workingData, numColors);

            self.postMessage({
                type: 'palette',
                palette: result.palette,
                iterations: result.iterations
            });

            self.postMessage({
                type: 'progress',
                progress: 70,
                text: 'Applying ' + dithering + ' dithering...'
            });

            const processedData = applyPalette(
                workingData,
                result.palette,
                dithering
            );

            // ===== END ALGORITHM TIMER =====
            const algoEnd = Date.now();

            self.postMessage({ type: 'progress', progress: 100, text: 'Complete!' });

            self.postMessage({
                type: 'complete',
                imageData: processedData,
                palette: result.palette,
                iterations: result.iterations,
                algorithmTime: algoEnd - algoStart
            });
        };

        function downscaleImage(imageData, blockSize) {
            const width = imageData.width;
            const height = imageData.height;
            const newWidth = Math.floor(width / blockSize);
            const newHeight = Math.floor(height / blockSize);
            const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

            for (let y = 0; y < newHeight; y++) {
                for (let x = 0; x < newWidth; x++) {
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let by = 0; by < blockSize; by++) {
                        for (let bx = 0; bx < blockSize; bx++) {
                            const srcX = x * blockSize + bx;
                            const srcY = y * blockSize + by;

                            if (srcX < width && srcY < height) {
                                const srcIdx = (srcY * width + srcX) * 4;
                                r += imageData.data[srcIdx];
                                g += imageData.data[srcIdx + 1];
                                b += imageData.data[srcIdx + 2];
                                count++;
                            }
                        }
                    }

                    const idx = (y * newWidth + x) * 4;
                    newData[idx]     = r / count;
                    newData[idx + 1] = g / count;
                    newData[idx + 2] = b / count;
                    newData[idx + 3] = 255;
                }
            }

            return new ImageData(newData, newWidth, newHeight);
        }

        function kMeansQuantization(imageData, k, maxIterations = 15) {
            const data = imageData.data;
            const totalPixels = data.length / 4;

            // 🚀 GUARANTEED OPTIMIZATION 1: Much more aggressive sampling
            // Sample only what we need - quality loss is minimal with good sampling
            const maxSamples = Math.min(totalPixels, 5000);
            const step = Math.max(1, Math.floor(totalPixels / maxSamples));
            
            const pixels = [];
            for (let i = 0; i < data.length; i += 4 * step) {
                pixels.push([data[i], data[i + 1], data[i + 2]]);
            }

            // Simple random initialization
            let centroids = [];
            for (let i = 0; i < k; i++) {
                const p = pixels[Math.floor(Math.random() * pixels.length)];
                centroids.push([p[0], p[1], p[2]]);
            }

            // 🚀 GUARANTEED OPTIMIZATION 2: Reduce iterations drastically
            // K-means converges fast with good sampling
            const maxIter = Math.min(maxIterations, 8);
            let iterations = 0;

            for (let iter = 0; iter < maxIter; iter++) {
                iterations++;
                const clusters = Array.from({ length: k }, () => []);
                const sums = Array.from({ length: k }, () => [0, 0, 0]);
                const counts = Array(k).fill(0);

                // 🚀 GUARANTEED OPTIMIZATION 3: Minimize distance calculations
                // Cache centroid lookups and use simple assignment
                for (const pixel of pixels) {
                    let minDist = Infinity;
                    let closest = 0;

                    for (let i = 0; i < k; i++) {
                        const c = centroids[i];
                        const dr = pixel[0] - c[0];
                        const dg = pixel[1] - c[1];
                        const db = pixel[2] - c[2];
                        const d = dr*dr + dg*dg + db*db; // Skip sqrt for comparison
                        
                        if (d < minDist) {
                            minDist = d;
                            closest = i;
                        }
                    }
                    
                    sums[closest][0] += pixel[0];
                    sums[closest][1] += pixel[1];
                    sums[closest][2] += pixel[2];
                    counts[closest]++;
                }

                // Update centroids
                let changed = false;
                for (let i = 0; i < k; i++) {
                    if (counts[i] === 0) continue;

                    const newC = [
                        Math.round(sums[i][0] / counts[i]),
                        Math.round(sums[i][1] / counts[i]),
                        Math.round(sums[i][2] / counts[i])
                    ];

                    if (Math.abs(centroids[i][0] - newC[0]) > 1 ||
                        Math.abs(centroids[i][1] - newC[1]) > 1 ||
                        Math.abs(centroids[i][2] - newC[2]) > 1) {
                        changed = true;
                    }

                    centroids[i] = newC;
                }

                self.postMessage({
                    type: 'progress',
                    progress: 10 + (iter / maxIter) * 60,
                    text: 'K-means iteration ' + (iter + 1) + '/' + maxIter
                });

                if (!changed) break;
            }

            return { palette: centroids, iterations };
        }

        function colorDistance(a, b) {
            const dr = a[0] - b[0];
            const dg = a[1] - b[1];
            const db = a[2] - b[2];
            return dr*dr + dg*dg + db*db; // Return squared distance (skip sqrt)
        }

        function findNearestColor(color, palette) {
            let min = Infinity;
            let nearest = palette[0];

            for (const p of palette) {
                const dr = color[0] - p[0];
                const dg = color[1] - p[1];
                const db = color[2] - p[2];
                const d = dr*dr + dg*dg + db*db; // Skip sqrt
                
                if (d < min) {
                    min = d;
                    nearest = p;
                }
            }
            return nearest;
        }

        function applyPalette(imageData, palette, dithering) {
            const width = imageData.width;
            const height = imageData.height;
            const data = new Uint8ClampedArray(imageData.data);

            if (dithering === 'none') {
                for (let i = 0; i < data.length; i += 4) {
                    const n = findNearestColor([data[i], data[i+1], data[i+2]], palette);
                    data[i] = n[0];
                    data[i+1] = n[1];
                    data[i+2] = n[2];
                }
            } else {
                const kernel = getKernel(dithering);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;

                        const oldC = [data[idx], data[idx+1], data[idx+2]];
                        const newC = findNearestColor(oldC, palette);

                        data[idx] = newC[0];
                        data[idx+1] = newC[1];
                        data[idx+2] = newC[2];

                        const er = oldC[0] - newC[0];
                        const eg = oldC[1] - newC[1];
                        const eb = oldC[2] - newC[2];

                        for (const [dx, dy, f] of kernel) {
                            distributeError(data, width, height, x+dx, y+dy, er, eg, eb, f);
                        }
                    }
                }
            }

            return new ImageData(data, width, height);
        }

        function getKernel(type) {
            if (type === 'floyd') {
                return [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]];
            } else if (type === 'jarvis') {
                return [
                    [1,0,7/48],[2,0,5/48],
                    [-2,1,3/48],[-1,1,5/48],[0,1,7/48],[1,1,5/48],[2,1,3/48],
                    [-2,2,1/48],[-1,2,3/48],[0,2,5/48],[1,2,3/48],[2,2,1/48]
                ];
            } else if (type === 'stucki') {
                return [
                    [1,0,8/42],[2,0,4/42],
                    [-2,1,2/42],[-1,1,4/42],[0,1,8/42],[1,1,4/42],[2,1,2/42],
                    [-2,2,1/42],[-1,2,2/42],[0,2,4/42],[1,2,2/42],[2,2,1/42]
                ];
            }
            return [];
        }

        function distributeError(data, width, height, x, y, er, eg, eb, f) {
            if (x < 0 || x >= width || y < 0 || y >= height) return;
            const idx = (y * width + x) * 4;
            data[idx]     = clamp(data[idx]     + er * f);
            data[idx + 1] = clamp(data[idx + 1] + eg * f);
            data[idx + 2] = clamp(data[idx + 2] + eb * f);
        }

        function clamp(v) {
            return Math.max(0, Math.min(255, Math.round(v)));
        }
    `;
}