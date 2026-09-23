import { describe, expect, it, vi } from 'vitest';
import { ResourceTracker } from '../../src/core/resources.js';

describe('ResourceTracker', () => {
  it('disposes each registered resource exactly once', () => {
    const tracker = new ResourceTracker();
    const resource = { dispose: vi.fn() };

    tracker.track(resource);
    tracker.track(resource);
    tracker.disposeAll();
    tracker.disposeAll();

    expect(resource.dispose).toHaveBeenCalledTimes(1);
  });

  it('can be reused after a system is disposed', () => {
    const tracker = new ResourceTracker();
    const first = { dispose: vi.fn() };
    const second = { dispose: vi.fn() };

    tracker.track(first);
    tracker.disposeAll();
    tracker.track(second);
    tracker.disposeAll();

    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
  });

  it('tracks a scene graph and its textures', () => {
    const geometry = { dispose: vi.fn() };
    const texture = { isTexture: true, dispose: vi.fn() };
    const material = { map: texture, dispose: vi.fn() };
    const object = {
      geometry,
      material,
      traverse(visitor) {
        visitor(this);
      },
    };
    const tracker = new ResourceTracker();

    tracker.trackObject(object);
    tracker.disposeAll();

    expect(geometry.dispose).toHaveBeenCalledOnce();
    expect(material.dispose).toHaveBeenCalledOnce();
    expect(texture.dispose).toHaveBeenCalledOnce();
  });
});
