export const SPEED_LEVELS = [0.1, 0.5, 1, 2, 5, 10];
export const DEFAULT_SPEED_INDEX = 2;
export const REAL_SECONDS_PER_GAME_YEAR = 60;

/**
 * Frame-rate independent arcade simulation clock.
 */
export class SimulationClock {
  constructor() {
    this.reset();
  }

  reset() {
    this.elapsedYears = 0;
    this.speedIndex = DEFAULT_SPEED_INDEX;
    this.paused = false;
  }

  get speed() {
    return SPEED_LEVELS[this.speedIndex];
  }

  get displayYear() {
    return Math.floor(this.elapsedYears) + 1;
  }

  update(realSeconds) {
    if (this.paused || realSeconds <= 0) {
      return 0;
    }

    const safeDelta = Math.min(realSeconds, 0.25);
    const years = (safeDelta * this.speed) / REAL_SECONDS_PER_GAME_YEAR;
    this.elapsedYears += years;
    return years;
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  speedUp() {
    this.speedIndex = Math.min(this.speedIndex + 1, SPEED_LEVELS.length - 1);
    return this.speed;
  }

  slowDown() {
    this.speedIndex = Math.max(this.speedIndex - 1, 0);
    return this.speed;
  }
}
