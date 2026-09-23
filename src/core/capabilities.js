export function detectCapabilities() {
  const memory = navigator.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const isCompact = window.matchMedia('(max-width: 640px)').matches;
  const isLowPower = memory <= 4 || cores <= 4 || isCompact;
  const supportsWorker = typeof Worker !== 'undefined';
  const supportsOffscreenCanvas = supportsWorker && typeof OffscreenCanvas !== 'undefined';

  return {
    isLowPower,
    supportsOffscreenCanvas,
    maxPixelRatio: isLowPower ? 1.25 : 2,
    starCount: isLowPower ? 2200 : 5000,
    textureScale: isLowPower ? 0.5 : 1,
    workerCount: supportsOffscreenCanvas ? Math.min(2, Math.max(1, Math.floor(cores / 4))) : 0,
  };
}
