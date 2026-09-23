function hash2D(x, y, seed) {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hash2D(x0, y0, seed);
  const b = hash2D(x0 + 1, y0, seed);
  const c = hash2D(x0, y0 + 1, seed);
  const d = hash2D(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function fractalNoise(x, y, seed, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + octave * 1013) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
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
      let detail;
      let red = base.r;
      let green = base.g;
      let blue = base.b;
      let alpha = 255;

      if (kind === 'star') {
        detail = fractalNoise(x * 0.035, y * 0.035, seed, 4);
        const flare = Math.max(0, 1 - Math.abs(normalizedY - 0.5) * 1.8);
        const brightness = 0.78 + detail * 0.28 + flare * 0.08;
        red *= brightness;
        green *= brightness;
        blue *= brightness;
      } else if (kind === 'ring') {
        const ring = normalizedX;
        const noise = valueNoise(x * 0.12, y * 0.7, seed);
        alpha = 80 + noise * 105;

        for (const gap of [
          { position: 0.3, width: 0.02 },
          { position: 0.5, width: 0.01 },
          { position: 0.7, width: 0.015 },
        ]) {
          if (Math.abs(ring - gap.position) < gap.width) {
            alpha *= 0.18;
          }
        }

        if (ring < 0.08 || ring > 0.92) {
          alpha *= ring < 0.08 ? ring / 0.08 : (1 - ring) / 0.08;
        }

        const brightness = 180 + noise * 55;
        red = brightness;
        green = brightness * 0.9;
        blue = brightness * 0.7;
      } else if (kind === 'moon') {
        detail = fractalNoise(x * 0.04, y * 0.04, seed, 4);
        let brightness = 96 + detail * 84;
        const craterCount = 15;

        for (let crater = 0; crater < craterCount; crater += 1) {
          const craterX = hash2D(crater * 17, seed, 71) * width;
          const craterY = hash2D(crater * 31, seed, 113) * height;
          const radius = 4 + hash2D(crater, seed, 211) * 14;
          const distance = Math.hypot(x - craterX, y - craterY);

          if (distance < radius) {
            brightness *= distance > radius * 0.7 ? 1.28 : 0.68;
          }
        }

        red = brightness;
        green = brightness * 0.98;
        blue = brightness * 0.95;
      } else {
        detail = fractalNoise(x * 0.025, y * 0.025, seed, 5);

        switch (appearance) {
          case 'cloudy': {
            const swirl = Math.sin(normalizedX * 20 + detail * 5) * 0.1;
            red = base.r * 1.02;
            green = base.g * (0.92 + (detail + swirl) * 0.18);
            blue = base.b * (0.72 + detail * 0.3);
            break;
          }
          case 'earth': {
            const terrain = fractalNoise(x * 0.02, y * 0.02, seed, 6);
            const clouds = fractalNoise(x * 0.015, y * 0.015, seed + 100, 4);

            if (terrain > 0.45) {
              red = 255 * (0.18 + terrain * 0.28);
              green = 255 * (0.34 + terrain * 0.42);
              blue = 255 * (0.12 + terrain * 0.18);
            } else {
              red = 255 * (0.06 + terrain * 0.16);
              green = 255 * (0.22 + terrain * 0.26);
              blue = 255 * (0.52 + terrain * 0.34);
            }

            if (clouds > 0.5) {
              const blend = (clouds - 0.5) * 2;
              red = red * (1 - blend) + 245 * blend;
              green = green * (1 - blend) + 245 * blend;
              blue = blue * (1 - blend) + 245 * blend;
            }
            break;
          }
          case 'desert': {
            const dunes = Math.sin(normalizedX * 50 + detail * 10) * 0.15;
            red = base.r * (0.96 + (detail + dunes) * 0.16);
            green = base.g * (0.7 + detail * 0.24);
            blue = base.b * (0.54 + detail * 0.14);
            break;
          }
          case 'gas': {
            const bands = Math.sin(
              normalizedY * 30 + valueNoise(normalizedX * 5, normalizedY * 5, seed) * 2,
            );
            const storm = valueNoise(x * 0.005, y * 0.01, seed + 200);
            const bandColor = storm > 0.8 ? 1.18 : bands > 0 ? 1 : 0.84;
            red = base.r * bandColor;
            green = base.g * (bandColor * 0.92 + detail * 0.08);
            blue = base.b * bandColor * 0.78;
            break;
          }
          case 'ice': {
            const ice = Math.sin(normalizedX * 10 + detail * 3) * 0.2;
            red = base.r * (0.94 + (detail + ice) * 0.12);
            green = base.g * (0.97 + detail * 0.08);
            blue = base.b;
            break;
          }
          default: {
            const craters = Math.max(0, 1 - valueNoise(x * 0.01, y * 0.01, seed + 50) * 3);
            red = base.r * (0.88 + detail * 0.24);
            green = base.g * (0.84 + detail * 0.19);
            blue = base.b * (0.8 + detail * 0.14 - craters * 0.06);
          }
        }
      }

      image[offset] = clampChannel(red);
      image[offset + 1] = clampChannel(green);
      image[offset + 2] = clampChannel(blue);
      image[offset + 3] = clampChannel(alpha);
    }
  }

  return image;
}
