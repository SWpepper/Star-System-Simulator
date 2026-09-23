export class TextureWorkerPool {
  constructor(size = 0) {
    this.workers = [];
    this.pending = new Map();
    this.nextRequestId = 1;
    this.nextWorkerIndex = 0;

    for (let index = 0; index < size; index += 1) {
      try {
        const worker = new Worker(new URL('./texture.worker.js', import.meta.url), {
          type: 'module',
        });
        worker.addEventListener('message', (event) => this.handleMessage(worker, event.data));
        worker.addEventListener('error', () => this.handleWorkerFailure(worker));
        this.workers.push(worker);
      } catch (error) {
        console.warn('纹理 Worker 不可用，将使用主线程降级:', error);
      }
    }
  }

  get available() {
    return this.workers.length > 0;
  }

  request(options) {
    if (!this.available) {
      return Promise.reject(new Error('Texture workers are unavailable.'));
    }

    const worker = this.workers[this.nextWorkerIndex % this.workers.length];
    this.nextWorkerIndex += 1;
    const id = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, worker });
      worker.postMessage({ id, options });
    });
  }

  handleMessage(worker, message) {
    const request = this.pending.get(message.id);
    if (!request) {
      return;
    }

    this.pending.delete(message.id);
    if (message.error) {
      request.reject(new Error(message.error));
      return;
    }

    request.resolve(message.bitmap);
  }

  handleWorkerFailure(worker) {
    for (const [id, request] of this.pending) {
      if (request.worker === worker) {
        this.pending.delete(id);
        request.reject(new Error('Texture worker failed.'));
      }
    }
  }

  dispose() {
    for (const request of this.pending.values()) {
      request.reject(new Error('Texture worker pool disposed.'));
    }

    this.pending.clear();

    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
  }
}
