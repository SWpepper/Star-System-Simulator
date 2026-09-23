/**
 * Tracks GPU resources and ensures each resource is disposed once.
 */
export class ResourceTracker {
  constructor() {
    this.resources = new Set();
  }

  track(resource) {
    if (resource?.dispose && typeof resource.dispose === 'function') {
      this.resources.add(resource);
    }

    return resource;
  }

  trackObject(object) {
    if (!object) {
      return object;
    }

    object.traverse((child) => {
      this.track(child.geometry);

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        this.track(material);
        for (const value of Object.values(material ?? {})) {
          if (value?.isTexture) {
            this.track(value);
          }
        }
      }
    });

    return object;
  }

  disposeAll() {
    for (const resource of this.resources) {
      try {
        resource.dispose();
      } catch (error) {
        console.warn('释放渲染资源失败:', error);
      }
    }

    this.resources.clear();
  }
}
