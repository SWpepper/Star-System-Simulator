/**
 * Convert arbitrary seed values into a stable unsigned integer.
 * @param {number|string|undefined} seed
 * @returns {number}
 */
export function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  const value = String(seed ?? Date.now());
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * Deterministic RNG suitable for system generation and tests.
 * @param {number|string|undefined} seed
 */
export function createRng(seed) {
  let state = normalizeSeed(seed);

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed: normalizeSeed(seed),
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    integer(min, maxInclusive) {
      return Math.floor(min + next() * (maxInclusive - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    chance(probability) {
      return next() < probability;
    },
  };
}
