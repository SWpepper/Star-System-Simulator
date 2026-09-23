import { describe, expect, it } from 'vitest';
import { generateSystem, getAllBodies } from '../../src/domain/systemGenerator.js';

describe('systemGenerator', () => {
  it('is deterministic for a fixed seed', () => {
    const first = generateSystem({ mode: 'random', seed: 123456 });
    const second = generateSystem({ mode: 'random', seed: 123456 });

    expect(first).toEqual(second);
  });

  it('always creates a structurally valid arcade system', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const model = generateSystem({ mode: 'random', seed });
      const bodies = getAllBodies(model);
      const ids = bodies.map((body) => body.id);

      expect(model.version).toBe(1);
      expect(model.stars.length).toBeGreaterThanOrEqual(1);
      expect(model.stars.length).toBeLessThanOrEqual(2);
      if (model.status === '裸星系统') {
        expect(model.planets).toHaveLength(0);
      } else {
        expect(model.planets.length).toBeGreaterThanOrEqual(3);
        expect(model.planets.length).toBeLessThanOrEqual(10);
      }
      expect(new Set(ids).size).toBe(ids.length);

      for (const body of bodies) {
        expect(body.id).toBeTruthy();
        expect(body.name).toBeTruthy();
        expect(body.massKg).toBeGreaterThan(0);
        if (body.orbit) {
          expect(body.orbit.radiusWorld).toBeGreaterThan(0);
          expect(body.orbit.periodYears).toBeGreaterThan(0);
          expect(body.orbit.phase).toBeGreaterThanOrEqual(0);
        }
      }

      for (const planet of model.planets) {
        expect(planet.satellites.length).toBeLessThanOrEqual(4);
        for (const moon of planet.satellites) {
          expect(moon.parentId).toBe(planet.id);
          expect(moon.orbit.centerId).toBe(planet.id);
        }
      }
    }
  });

  it('keeps planets and moons visibly smaller than their parent stars', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const model = generateSystem({ mode: 'random', seed });
      const minStarRadius = Math.min(...model.stars.map((star) => star.render.radiusWorld));
      const maxPlanetRadius = Math.max(
        0,
        ...model.planets.map((planet) => planet.render.radiusWorld),
      );

      expect(maxPlanetRadius).toBeLessThan(minStarRadius * 0.62);

      for (const planet of model.planets) {
        for (const moon of planet.satellites) {
          expect(moon.render.radiusWorld).toBeLessThan(planet.render.radiusWorld * 0.45);
        }
      }
    }
  });

  it('builds the solar system in the expected order', () => {
    const model = generateSystem({ mode: 'solar', seed: 7 });

    expect(model.status).toBe('太阳系');
    expect(model.stars.map((star) => star.name)).toEqual(['太阳']);
    expect(model.planets.map((planet) => planet.name)).toEqual([
      '水星',
      '金星',
      '地球',
      '火星',
      '木星',
      '土星',
      '天王星',
      '海王星',
    ]);
    expect(model.planets[2].satellites[0].name).toBe('月球');
  });
});
