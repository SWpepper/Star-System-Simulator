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
});
