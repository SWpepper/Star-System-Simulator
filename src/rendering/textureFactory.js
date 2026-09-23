import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { createTextureData } from './textureData.js';

function createPlaceholder(color, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, width, height);
  return canvas;
}

function applyCanvasData(texture, data, width, height) {
  const context = texture.image.getContext('2d');
  context.putImageData(new ImageData(data, width, height), 0, 0);
  texture.needsUpdate = true;
}

export class TextureFactory {
  constructor({ capabilities, tracker, workerPool }) {
    this.capabilities = capabilities;
    this.tracker = tracker;
    this.workerPool = workerPool;
  }

  create(options) {
    const scale = this.capabilities.textureScale;
    const width = Math.max(64, Math.round(options.width * scale));
    const height = Math.max(32, Math.round(options.height * scale));
    const placeholderColor = options.kind === 'bump' ? 0x8a8a8a : (options.color ?? 0x888888);
    const texture = new CanvasTexture(createPlaceholder(placeholderColor, width, height));
    texture.colorSpace = options.kind === 'bump' ? NoColorSpace : SRGBColorSpace;
    texture.name = `${options.kind}-${options.seed}`;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    if (options.kind !== 'ring') {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
    }

    let disposed = false;
    const baseDispose = texture.dispose.bind(texture);
    texture.dispose = () => {
      if (disposed) {
        return;
      }

      disposed = true;
      baseDispose();
    };

    this.tracker.track(texture);
    const requestOptions = { ...options, width, height };

    const fallback = () => {
      if (disposed) {
        return;
      }

      const data = createTextureData({ ...options, width, height });
      applyCanvasData(texture, data, width, height);
    };

    if (this.workerPool.available) {
      this.workerPool
        .request(requestOptions)
        .then((bitmap) => {
          if (disposed) {
            bitmap.close();
            return;
          }

          const context = texture.image.getContext('2d');
          context.clearRect(0, 0, width, height);
          context.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          texture.needsUpdate = true;
        })
        .catch(() => fallback());
    } else {
      queueMicrotask(fallback);
    }

    return texture;
  }
}
