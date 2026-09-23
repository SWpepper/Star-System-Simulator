import { describe, expect, it } from 'vitest';
import { createTextureData } from '../../src/rendering/textureData.js';

describe('createTextureData', () => {
  it('returns deterministic RGBA data', () => {
    const options = {
      kind: 'planet',
      appearance: 'earth',
      color: 0x4a90d9,
      seed: 42,
      width: 32,
      height: 16,
    };

    expect(createTextureData(options)).toEqual(createTextureData(options));
  });
  it('creates detailed bump and cloud channels', () => {
    const common = {
      appearance: 'earth',
      color: 0x4a90d9,
      seed: 42,
      width: 64,
      height: 32,
    };
    const bump = createTextureData({ ...common, kind: 'bump' });
    const cloud = createTextureData({ ...common, kind: 'cloud' });
    const cloudAlpha = [];
    for (let index = 3; index < cloud.length; index += 4) {
      cloudAlpha.push(cloud[index]);
    }

    expect(new Set(bump).size).toBeGreaterThan(8);
    expect(Math.min(...cloudAlpha)).toBe(0);
    expect(Math.max(...cloudAlpha)).toBeGreaterThan(0);
  });
});
