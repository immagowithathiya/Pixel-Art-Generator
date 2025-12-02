// performance.js
const PerformanceTracker = (() => {
  let uiStart = 0;
  let workerStart = 0;

  return {
    startUI() {
      uiStart = performance.now();
    },

    startWorker() {
      workerStart = performance.now();
    },

    endWorker(pixelsProcessed) {
      const workerTime = performance.now() - workerStart;
      return {
        workerTime,
        throughput: (pixelsProcessed / workerTime).toFixed(2) // pixels/ms
      };
    },

    endUI(workerMetrics) {
      const totalTime = performance.now() - uiStart;
      const uiOverhead = totalTime - workerMetrics.workerTime;

      return {
        totalTime: totalTime.toFixed(2),
        workerTime: workerMetrics.workerTime.toFixed(2),
        uiOverhead: uiOverhead.toFixed(2),
        throughput: workerMetrics.throughput
      };
    }
  };
})();
