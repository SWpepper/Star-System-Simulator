function hash2D(x, y, seed) {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(0, 1, x - x0);
  const ty = smoothstep(0, 1, y - y0);
  const a = hash2D(x0, y0, seed);
  const b = hash2D(x0 + 1, y0, seed);
  const c = hash2D(x0, y0 + 1, seed);
  const d = hash2D(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function fractalNoise(x, y, seed, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + octave * 1013) * amplitude;
    total += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / total;
}

function ridgedNoise(x, y, seed, octaves = 4) {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const sample = valueNoise(x * frequency, y * frequency, seed + octave * 1543);
    value += (1 - Math.abs(sample * 2 - 1)) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }

  return value / total;
}

function colorToRgb(color) {
  return {
    r: (color >> 16) & 255,
    g: (color >> 8) & 255,
    b: color & 255,
  };
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mix(first, second, amount) {
  return first + (second - first) * amount;
}

function craterField(x, y, width, height, seed, count, scale = 1) {
  let heightOffset = 0;
  const minDimension = Math.min(width, height);

  for (let crater = 0; crater < count; crater += 1) {
    const craterX = hash2D(crater * 17, seed, 71) * width;
    const craterY = hash2D(crater * 31, seed, 113) * height;
    const radius = (1.5 + hash2D(crater, seed, 211) * 0.045 * minDimension) * scale;
    const distance = Math.hypot(x - craterX, y - craterY);

    if (distance < radius) {
      const normalized = distance / radius;
      heightOffset += normalized > 0.76 ? 0.25 * (1 - normalized) : -0.38 * (1 - normalized);
    }
  }

  return heightOffset;
}

function sampleRocky(normalizedX, normalizedY, x, y, seed, base) {
  const warpX = x * 0.017 + (valueNoise(x * 0.008, y * 0.008, seed + 301) - 0.5) * 7;
  const warpY = y * 0.017 + (valueNoise(x * 0.008, y * 0.008, seed + 401) - 0.5) * 7;
  const coarse = fractalNoise(warpX, warpY, seed, 5);
  const fine = fractalNoise(x * 0.085, y * 0.085, seed + 17, 3);
  const craters = craterField(x, y, normalizedX * 900, normalizedY * 360, seed, 24, 1.25);
  const polar = smoothstep(0.72, 0.96, Math.abs(normalizedY * 2 - 1));
  const height = Math.max(0.08, Math.min(1, coarse * 0.56 + fine * 0.3 + craters + polar * 0.16));
  const shade = 0.6 + height * 0.68 - fine * 0.08;

  return {
    r: mix(base.r * shade, 235, polar * 0.78),
    g: mix(base.g * shade, 238, polar * 0.78),
    b: mix(base.b * shade, 242, polar * 0.78),
    height,
    cloud: 0,
  };
}

function sampleDesert(normalizedX, normalizedY, x, y, seed, base) {
  const warp = fractalNoise(x * 0.013, y * 0.018, seed + 77, 5) - 0.5;
  const dunes = (Math.sin((normalizedX * 48 + warp * 11) * Math.PI) + 1) * 0.5;
  const fine = fractalNoise(x * 0.075, y * 0.075, seed + 91, 3);
  const canyonNoise = ridgedNoise(x * 0.009, y * 0.009, seed + 131, 4);
  const canyon = smoothstep(0.78, 0.94, canyonNoise);
  const height = Math.max(0.12, dunes * 0.48 + fine * 0.33 - canyon * 0.28);

  return {
    r: base.r * (0.78 + height * 0.5),
    g: base.g * (0.68 + height * 0.4 - canyon * 0.12),
    b: base.b * (0.55 + height * 0.3 - canyon * 0.08),
    height,
    cloud: 0,
  };
}

function sampleEarth(normalizedX, normalizedY, x, y, seed) {
  const warp = fractalNoise(x * 0.009, y * 0.009, seed + 401, 5) - 0.5;
  const terrain = fractalNoise(x * 0.019 + warp * 2.4, y * 0.019 - warp * 1.5, seed, 6);
  const mountains = ridgedNoise(x * 0.038, y * 0.038, seed + 71, 4);
  const cloudNoise = fractalNoise(x * 0.017, y * 0.013, seed + 311, 5);
  const latitude = Math.abs(normalizedY * 2 - 1);
  const polar = smoothstep(0.72, 0.95, latitude + (terrain - 0.5) * 0.08);
  const cloud = smoothstep(
    0.48,
    0.72,
    cloudNoise + Math.sin(normalizedX * 18 + terrain * 5) * 0.05,
  );
  const isLand = terrain > 0.48;
  let red;
  let green;
  let blue;
  let height;

  if (isLand) {
    const elevation = smoothstep(0.48, 0.82, terrain);
    red = mix(58, 144, elevation) + mountains * 34;
    green = mix(104, 84, elevation) + mountains * 24;
    blue = mix(52, 48, elevation) + mountains * 18;
    height = 0.52 + elevation * 0.38 + mountains * 0.12;
  } else {
    const depth = smoothstep(0.25, 0.48, terrain);
    red = mix(4, 22, depth);
    green = mix(42, 108, depth);
    blue = mix(92, 196, depth);
    height = 0.08 + depth * 0.12;
  }

  if (Math.abs(terrain - 0.48) < 0.012) {
    red = mix(red, 205, 0.78);
    green = mix(green, 184, 0.78);
    blue = mix(blue, 126, 0.78);
  }

  red = mix(red, 236, polar);
  green = mix(green, 242, polar);
  blue = mix(blue, 248, polar);

  return { r: red, g: green, b: blue, height, cloud };
}

function sampleGas(normalizedX, normalizedY, x, y, seed, base) {
  const turbulence = fractalNoise(x * 0.012, y * 0.028, seed + 201, 5);
  const bandNoise = valueNoise(normalizedX * 4, normalizedY * 9, seed + 51);
  const bands = (Math.sin(normalizedY * 42 + bandNoise * 6 + turbulence * 3) + 1) * 0.5;
  const stormX = (normalizedX - 0.68) / 0.11;
  const stormY = (normalizedY - 0.61) / 0.07;
  const storm = Math.max(0, 1 - stormX * stormX - stormY * stormY);
  const brightness = 0.72 + bands * 0.48 + turbulence * 0.12 + storm * 0.18;
  const warmBand = smoothstep(0.48, 0.92, bands);

  return {
    r: base.r * brightness * (1 + warmBand * 0.08),
    g: base.g * brightness * (0.88 + warmBand * 0.12),
    b: base.b * brightness * (0.72 + (1 - warmBand) * 0.18),
    height: 0.35 + turbulence * 0.08,
    cloud: 0,
  };
}

function sampleIce(normalizedX, normalizedY, x, y, seed, base) {
  const plates = fractalNoise(x * 0.018, y * 0.018, seed + 31, 5);
  const cracks = Math.abs(valueNoise(x * 0.052, y * 0.052, seed + 71) - 0.5);
  const brittle = 1 - smoothstep(0.01, 0.055, cracks);
  const frost = ridgedNoise(x * 0.085, y * 0.085, seed + 111, 3);
  const latitude = Math.abs(normalizedY * 2 - 1);
  const height = 0.28 + plates * 0.34 - brittle * 0.24 + frost * 0.1;
  const brightness = 0.78 + plates * 0.28 + frost * 0.08 - brittle * 0.2;

  return {
    r: mix(base.r * brightness, 224, smoothstep(0.55, 0.95, latitude) * 0.22),
    g: mix(base.g * brightness, 239, smoothstep(0.55, 0.95, latitude) * 0.22),
    b: mix(base.b * brightness, 255, smoothstep(0.55, 0.95, latitude) * 0.18),
    height,
    cloud: smoothstep(0.7, 0.94, frost) * 0.18,
  };
}

function sampleCloudy(normalizedX, normalizedY, x, y, seed, base) {
  const warp = (valueNoise(x * 0.008, y * 0.011, seed + 51) - 0.5) * 7;
  const turbulence = fractalNoise(x * 0.022 + warp, y * 0.014, seed, 6);
  const swirl = Math.sin(normalizedX * 22 + turbulence * 8 + normalizedY * 10) * 0.12;
  const height = Math.max(0.12, turbulence + swirl);
  const warm = smoothstep(0.35, 0.8, turbulence);
  const cloud = smoothstep(0.42, 0.7, turbulence + swirl * 0.4);

  return {
    r: mix(base.r * 0.82, 248, warm * 0.24) * (0.86 + height * 0.3),
    g: mix(base.g * 0.82, 230, warm * 0.18) * (0.84 + height * 0.28),
    b: mix(base.b * 0.75, 188, warm * 0.12) * (0.76 + height * 0.3),
    height,
    cloud,
  };
}

function sampleSurface(appearance, normalizedX, normalizedY, x, y, seed, base) {
  switch (appearance) {
    case 'earth':
      return sampleEarth(normalizedX, normalizedY, x, y, seed);
    case 'cloudy':
      return sampleCloudy(normalizedX, normalizedY, x, y, seed, base);
    case 'desert':
      return sampleDesert(normalizedX, normalizedY, x, y, seed, base);
    case 'gas':
      return sampleGas(normalizedX, normalizedY, x, y, seed, base);
    case 'ice':
      return sampleIce(normalizedX, normalizedY, x, y, seed, base);
    default:
      return sampleRocky(normalizedX, normalizedY, x, y, seed, base);
  }
}

function createStarPixel(normalizedX, normalizedY, x, y, seed, base) {
  const warpX = x * 0.045 + Math.sin(y * 0.017 + seed) * 4.5;
  const warpY = y * 0.045 + Math.cos(x * 0.013 + seed) * 4.5;
  const plasma = fractalNoise(warpX, warpY, seed, 6);
  const cells = fractalNoise(x * 0.13, y * 0.13, seed + 451, 3);
  const flare = Math.pow(
    Math.max(0, valueNoise(x * 0.018, y * 0.018, seed + 91) - 0.54) * 2.2,
    2.2,
  );
  const brightness = 0.54 + plasma * 0.7 + cells * 0.18 + flare * 0.56;

  return {
    r: base.r * brightness + flare * 28,
    g: base.g * brightness + flare * 20,
    b: base.b * brightness + flare * 12,
    alpha: 255,
  };
}

function createRingPixel(normalizedX, x, y, seed) {
  const ring = normalizedX;
  const fine = fractalNoise(x * 0.22, y * 0.18, seed, 4);
  const broad = valueNoise(ring * 22, 0.5, seed + 71);
  const density = 0.36 + broad * 0.34 + Math.pow(fine, 1.8) * 0.34;

  const gaps = [
    { position: 0.18, width: 0.015, depth: 0.22 },
    { position: 0.31, width: 0.024, depth: 0.12 },
    { position: 0.51, width: 0.012, depth: 0.08 },
    { position: 0.68, width: 0.019, depth: 0.18 },
    { position: 0.83, width: 0.012, depth: 0.26 },
  ];
  let alpha = density;

  for (const gap of gaps) {
    const distance = Math.abs(ring - gap.position);
    if (distance < gap.width) {
      alpha *= gap.depth;
    }
  }

  if (ring < 0.07 || ring > 0.94) {
    alpha *= smoothstep(0, 0.07, Math.min(ring, 1 - ring));
  }

  const brightness = 0.72 + fine * 0.36 + broad * 0.12;
  return {
    r: 224 * brightness,
    g: 214 * brightness,
    b: 184 * brightness,
    alpha: alpha * 255,
  };
}

function createMoonPixel(normalizedX, normalizedY, x, y, seed) {
  const base = fractalNoise(x * 0.04, y * 0.04, seed, 5);
  const craters = craterField(x, y, normalizedX * 512, normalizedY * 256, seed + 7, 27, 0.72);
  const polar = smoothstep(0.72, 0.95, Math.abs(normalizedY * 2 - 1));
  const height = Math.max(0.05, Math.min(1, base * 0.7 + craters + polar * 0.12));
  const brightness = 82 + height * 104;

  return {
    r: brightness,
    g: brightness * 0.98,
    b: brightness * 0.94,
    height,
    cloud: 0,
  };
}

export function createTextureData({
  kind,
  appearance = 'rocky',
  color = 0x888888,
  seed = 1,
  width,
  height,
}) {
  const image = new Uint8ClampedArray(width * height * 4);
  const base = colorToRgb(color);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const normalizedX = x / width;
      const normalizedY = y / height;
      let pixel;

      if (kind === 'star') {
        pixel = createStarPixel(normalizedX, normalizedY, x, y, seed, base);
      } else if (kind === 'ring') {
        pixel = createRingPixel(normalizedX, x, y, seed);
      } else if (kind === 'moon' || appearance === 'moon') {
        pixel = createMoonPixel(normalizedX, normalizedY, x, y, seed);
      } else {
        pixel = sampleSurface(appearance, normalizedX, normalizedY, x, y, seed, base);
      }

      if (kind === 'bump') {
        const bump = clampChannel(88 + (pixel.height ?? 0.4) * 150);
        image[offset] = bump;
        image[offset + 1] = bump;
        image[offset + 2] = bump;
        image[offset + 3] = 255;
      } else if (kind === 'cloud') {
        const alpha = clampChannel((pixel.cloud ?? 0) * 255);
        image[offset] = 242;
        image[offset + 1] = 248;
        image[offset + 2] = 255;
        image[offset + 3] = alpha;
      } else {
        image[offset] = clampChannel(pixel.r);
        image[offset + 1] = clampChannel(pixel.g);
        image[offset + 2] = clampChannel(pixel.b);
        image[offset + 3] = clampChannel(pixel.alpha ?? 255);
      }
    }
  }

  return image;
}
