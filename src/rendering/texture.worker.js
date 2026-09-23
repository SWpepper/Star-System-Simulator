import { createTextureData } from './textureData.js';

self.onmessage = ({ data }) => {
  const { id, options } = data;

  try {
    const image = createTextureData(options);
    const canvas = new OffscreenCanvas(options.width, options.height);
    const context = canvas.getContext('2d');
    context.putImageData(new ImageData(image, options.width, options.height), 0, 0);
    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
