import { createRng, normalizeSeed } from '../core/random.js';
import {
  BODY_TYPES,
  EARTH_MASS,
  LIFE_STATUS,
  PLANET_TYPES,
  SOLAR_MASS,
  STAR_TYPES,
  SYSTEM_MODEL_VERSION,
  SYSTEM_STATUS,
  WORLD_UNITS_PER_AU,
} from '../core/constants.js';

function toRoman(value) {
  const numerals = [
    ['X', 10],
    ['IX', 9],
    ['VIII', 8],
    ['VII', 7],
    ['VI', 6],
    ['V', 5],
    ['IV', 4],
    ['III', 3],
    ['II', 2],
    ['I', 1],
  ];
  let number = value;
  let result = '';

  for (const [roman, amount] of numerals) {
    while (number >= amount) {
      result += roman;
      number -= amount;
    }
  }

  return result;
}

function toLowerRoman(value) {
  return toRoman(value).toLowerCase();
}
const SOLAR_SYSTEM = [
  { name: '水星', typeId: 'mercury', distanceAu: 0.39, radius: 1.8, mass: 0.055, moons: 0 },
  { name: '金星', typeId: 'venus', distanceAu: 0.72, radius: 2.5, mass: 0.815, moons: 0 },
  { name: '地球', typeId: 'earth', distanceAu: 1, radius: 2.8, mass: 1, moons: 1 },
  { name: '火星', typeId: 'mars', distanceAu: 1.52, radius: 2, mass: 0.107, moons: 2 },
  { name: '木星', typeId: 'jupiter', distanceAu: 5.2, radius: 7.5, mass: 317.8, moons: 4 },
  { name: '土星', typeId: 'saturn', distanceAu: 9.5, radius: 6.5, mass: 95.2, moons: 3 },
  { name: '天王星', typeId: 'uranus', distanceAu: 19.2, radius: 4, mass: 14.5, moons: 2 },
  { name: '海王星', typeId: 'neptune', distanceAu: 30, radius: 3.8, mass: 17.1, moons: 1 },
];

function createId(kind, seed, index) {
  return `${kind}-${seed.toString(36)}-${index + 1}`;
}

function createGalaxyNumber(rng) {
  const prefixes = ['NGC', 'M', 'UGC', 'IC', 'PGC'];
  return `${rng.pick(prefixes)} ${rng.integer(1000, 9999)}`;
}

function copyPlanetType(type) {
  return {
    id: type.id,
    name: type.name,
    type: type.type,
    detail: type.detail,
    baseColor: type.baseColor,
    hasRings: Boolean(type.hasRings),
  };
}

function createStar({ rng, seed, index, nameSuffix = '' }) {
  const starType = rng.pick(STAR_TYPES);
  const massMultiplier = rng.range(starType.massRange[0], starType.massRange[1]);

  return {
    id: createId('star', seed, index),
    kind: 'star',
    name: `${starType.name}${nameSuffix}`,
    type: BODY_TYPES.STAR,
    parentId: null,
    massKg: SOLAR_MASS * massMultiplier,
    orbit: null,
    render: {
      radiusWorld: 6 + Math.sqrt(massMultiplier) * 4,
      appearance: starType.id,
      baseColor: starType.color,
      glowColor: starType.glowColor,
      seed: rng.seed + index * 7919,
    },
    meta: {
      massSolar: massMultiplier,
      temperatureK: starType.temperature,
      starTypeId: starType.id,
    },
  };
}

function createPlanet({
  rng,
  seed,
  index,
  distanceAu,
  centralMassSolar,
  name,
  type,
  radius,
  massEarth,
  lifeStatus = LIFE_STATUS.NO,
}) {
  const orbitalPeriodYears = Math.sqrt(distanceAu ** 3 / centralMassSolar);
  const phase = rng.range(0, Math.PI * 2);

  return {
    id: createId('planet', seed, index),
    kind: 'planet',
    name,
    type: BODY_TYPES.PLANET,
    parentId: null,
    massKg: EARTH_MASS * massEarth,
    orbit: {
      center: 'barycenter',
      centerId: null,
      radiusWorld: distanceAu * WORLD_UNITS_PER_AU,
      radiusAu: distanceAu,
      periodYears: orbitalPeriodYears,
      phase,
    },
    render: {
      radiusWorld: radius,
      appearance: type.detail,
      baseColor: type.baseColor,
      hasRings: Boolean(type.hasRings),
      rotationSpeed: rng.range(0.12, 0.45),
      seed: rng.seed + 1000 + index * 104729,
    },
    meta: {
      planetType: copyPlanetType(type),
      lifeStatus,
    },
    satellites: [],
  };
}

function createMoon({ rng, planet, index, solarMoon = null }) {
  const moonName = solarMoon?.name ?? `${planet.name}-${toLowerRoman(index + 1)}`;
  const radius = solarMoon?.radius ?? rng.range(0.4, 1);
  const massEarth = solarMoon?.massEarth ?? 0.01;
  const periodYears = solarMoon?.periodYears ?? rng.range(0.02, 0.1);

  return {
    id: `${planet.id}-moon-${index + 1}`,
    kind: 'moon',
    name: moonName,
    type: BODY_TYPES.MOON,
    parentId: planet.id,
    massKg: EARTH_MASS * massEarth,
    orbit: {
      center: 'parent',
      centerId: planet.id,
      radiusWorld: planet.render.radiusWorld * 1.5 + index * 1.5 + rng.range(0, 1),
      radiusAu: null,
      periodYears,
      phase: rng.range(0, Math.PI * 2),
    },
    render: {
      radiusWorld: radius,
      appearance: 'moon',
      baseColor: 0xb8b1a6,
      rotationSpeed: rng.range(0.05, 0.18),
      seed: rng.seed + 2000 + index * 65537,
    },
    meta: {},
  };
}

function generateRandomSystem(seed) {
  const rng = createRng(seed);
  const roll = rng.next();
  const isRogueStar = roll < 0.1;
  const isBinarySystem = !isRogueStar && roll < 0.4;
  const starCount = isBinarySystem ? 2 : 1;
  const stars = [];
  const planets = [];

  for (let index = 0; index < starCount; index += 1) {
    stars.push(
      createStar({
        rng,
        seed,
        index,
        nameSuffix: isBinarySystem ? (index === 0 ? ' A' : ' B') : '',
      }),
    );
  }

  let centralMassSolar = stars.reduce((sum, star) => sum + star.meta.massSolar, 0);
  let binaryOrbitRadius = 0;

  if (isBinarySystem) {
    const firstRadius = stars[0].render.radiusWorld;
    const secondRadius = stars[1].render.radiusWorld;
    binaryOrbitRadius = Math.max(25, (firstRadius + secondRadius) * 3);
    const totalMass = centralMassSolar;
    const firstRatio = stars[0].meta.massSolar / totalMass;
    const secondRatio = stars[1].meta.massSolar / totalMass;

    stars[0].orbit = {
      center: 'barycenter',
      centerId: null,
      radiusWorld: binaryOrbitRadius * secondRatio,
      radiusAu: null,
      periodYears: 0.5,
      phase: 0,
    };
    stars[1].orbit = {
      center: 'barycenter',
      centerId: null,
      radiusWorld: binaryOrbitRadius * firstRatio,
      radiusAu: null,
      periodYears: 0.5,
      phase: Math.PI,
    };
  }

  if (!isRogueStar) {
    const planetCount = rng.integer(3, 10);
    let distanceAu = isBinarySystem ? (binaryOrbitRadius * 1.2) / WORLD_UNITS_PER_AU : 0.6;

    for (let index = 0; index < planetCount; index += 1) {
      if (index > 0 || isBinarySystem) {
        distanceAu *= rng.range(1.4, 2);
      }

      const name = `行星 ${toRoman(index + 1)}`;

      const type = rng.pick(PLANET_TYPES);
      const massEarth = rng.range(0.3, 100.3);
      const radius = rng.range(type.sizeRange[0], type.sizeRange[1]);
      const inHabitableZone = distanceAu >= 0.8 && distanceAu <= 1.5;
      const lifeStatus =
        inHabitableZone && type.detail === 'earth' ? LIFE_STATUS.POSSIBLE : LIFE_STATUS.NO;
      const planet = createPlanet({
        rng,
        seed,
        index,
        distanceAu,
        centralMassSolar,
        name,
        type,
        radius,
        massEarth,
        lifeStatus,
      });

      planet.parentId = isBinarySystem ? null : stars[0].id;

      const moonCount = index >= 2 && massEarth > 2 ? rng.integer(1, 4) : 0;
      for (let moonIndex = 0; moonIndex < moonCount; moonIndex += 1) {
        planet.satellites.push(createMoon({ rng, planet, index: moonIndex }));
      }

      planets.push(planet);
    }
  }

  return {
    version: SYSTEM_MODEL_VERSION,
    seed: normalizeSeed(seed),
    mode: 'random',
    status: isRogueStar
      ? SYSTEM_STATUS.ROGUE
      : isBinarySystem
        ? SYSTEM_STATUS.BINARY
        : SYSTEM_STATUS.SINGLE,
    galaxyNumber: createGalaxyNumber(rng),
    stars,
    planets,
  };
}

function generateSolarSystem(seed) {
  const rng = createRng(seed);
  const sunType = STAR_TYPES.find((star) => star.id === 'yellow-dwarf');
  const sun = {
    id: createId('star', seed, 0),
    kind: 'star',
    name: '太阳',
    type: BODY_TYPES.STAR,
    parentId: null,
    massKg: SOLAR_MASS,
    orbit: null,
    render: {
      radiusWorld: 15,
      appearance: sunType.id,
      baseColor: sunType.color,
      glowColor: sunType.glowColor,
      seed: 1000,
    },
    meta: {
      massSolar: 1,
      temperatureK: 5778,
      starTypeId: sunType.id,
    },
  };

  const planets = SOLAR_SYSTEM.map((data, index) => {
    const type = PLANET_TYPES.find((entry) => entry.id === data.typeId);
    const lifeStatus = data.name === '地球' ? LIFE_STATUS.POSSIBLE : LIFE_STATUS.NO;
    const planet = createPlanet({
      rng,
      seed,
      index,
      distanceAu: data.distanceAu,
      centralMassSolar: 1,
      name: data.name,
      type,
      radius: data.radius,
      massEarth: data.mass,
      lifeStatus,
    });

    planet.parentId = sun.id;
    planet.orbit.centerId = sun.id;
    planet.render.seed = 1000 + index * 100;

    for (let moonIndex = 0; moonIndex < data.moons; moonIndex += 1) {
      const isMoon = data.name === '地球' && moonIndex === 0;
      planet.satellites.push(
        createMoon({
          rng,
          planet,
          index: moonIndex,
          solarMoon: isMoon
            ? {
                name: '月球',
                radius: 0.75,
                massEarth: 0.0123,
                periodYears: 27.3 / 365.25,
              }
            : null,
        }),
      );
    }

    return planet;
  });

  return {
    version: SYSTEM_MODEL_VERSION,
    seed: normalizeSeed(seed),
    mode: 'solar',
    status: SYSTEM_STATUS.SOLAR,
    galaxyNumber: SYSTEM_STATUS.SOLAR,
    stars: [sun],
    planets,
  };
}

/**
 * Build a serializable system model. Rendering code accepts this model but this
 * generator never imports Three.js.
 * @param {{ mode?: 'random'|'solar', seed?: number|string }} options
 */
export function generateSystem({ mode = 'random', seed = Date.now() } = {}) {
  const normalizedSeed = normalizeSeed(seed);
  return mode === 'solar'
    ? generateSolarSystem(normalizedSeed)
    : generateRandomSystem(normalizedSeed);
}

export function getAllBodies(model) {
  return [
    ...model.stars,
    ...model.planets,
    ...model.planets.flatMap((planet) => planet.satellites),
  ];
}

export function findBody(model, bodyId) {
  return getAllBodies(model).find((body) => body.id === bodyId) ?? null;
}
