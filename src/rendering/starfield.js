import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three';
import { createRng } from '../core/random.js';

export function createStarfield({ count, seed = 2024, tracker }) {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = rng.range(3000, 7000);
    const theta = rng.range(0, Math.PI * 2);
    const phi = Math.acos(rng.range(-1, 1));
    const offset = index * 3;

    positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
    positions[offset + 1] = radius * Math.cos(phi);
    positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const color = new Color().setHSL(
      rng.range(0.54, 0.65),
      rng.range(0.05, 0.35),
      rng.range(0.65, 1),
    );
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const geometry = tracker.track(new BufferGeometry());
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = tracker.track(
    new PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );

  return new Points(geometry, material);
}
