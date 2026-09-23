import { describe, expect, it } from 'vitest';
import { SimulationClock, SPEED_LEVELS } from '../../src/core/clock.js';

describe('SimulationClock', () => {
  it('supports pause, speed changes and reset', () => {
    const clock = new SimulationClock();

    expect(clock.update(1)).toBeCloseTo(0.25 / 60);
    clock.togglePause();
    expect(clock.update(2)).toBe(0);
    clock.togglePause();
    expect(clock.speedUp()).toBe(2);
    expect(clock.speedUp()).toBe(5);
    expect(clock.slowDown()).toBe(2);
    expect(clock.speed).toBe(2);

    clock.speedIndex = SPEED_LEVELS.length - 1;
    expect(clock.speedUp()).toBe(10);
    clock.speedIndex = 0;
    expect(clock.slowDown()).toBe(0.1);

    clock.reset();
    expect(clock.elapsedYears).toBe(0);
    expect(clock.speed).toBe(1);
    expect(clock.paused).toBe(false);
  });

  it('caps a resumed frame to avoid large jumps', () => {
    const clock = new SimulationClock();
    expect(clock.update(30)).toBeCloseTo(0.25 / 60);
  });
});
