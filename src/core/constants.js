export const SYSTEM_MODEL_VERSION = 1;

export const AU = 1.496e11;
export const G = 6.674e-11;
export const SOLAR_MASS = 1.989e30;
export const EARTH_MASS = 5.972e24;
export const SOLAR_RADIUS = 6.96e8;
export const EARTH_RADIUS = 6.371e6;
export const EARTH_YEAR_SECONDS = 365.25 * 24 * 3600;
export const WORLD_UNITS_PER_AU = 50;

export const SYSTEM_STATUS = {
  SINGLE: '单星系统',
  BINARY: '双星系统',
  ROGUE: '裸星系统',
  SOLAR: '太阳系',
};

export const BODY_TYPES = {
  STAR: '恒星',
  PLANET: '行星',
  MOON: '卫星',
};

export const LIFE_STATUS = {
  YES: '已确认生命',
  POSSIBLE: '可能存在生命',
  NO: '无生命迹象',
};

export const STAR_TYPES = [
  {
    id: 'red-dwarf',
    name: '红矮星',
    temperature: 3000,
    color: 0xff4500,
    glowColor: 0xff6633,
    massRange: [0.08, 0.5],
  },
  {
    id: 'orange-star',
    name: '橙色恒星',
    temperature: 4000,
    color: 0xff8c00,
    glowColor: 0xffaa44,
    massRange: [0.5, 0.8],
  },
  {
    id: 'yellow-dwarf',
    name: '黄矮星',
    temperature: 5500,
    color: 0xffdd44,
    glowColor: 0xffff88,
    massRange: [0.8, 1.2],
  },
  {
    id: 'yellow-white-star',
    name: '黄白恒星',
    temperature: 7000,
    color: 0xffffcc,
    glowColor: 0xffffff,
    massRange: [1.2, 1.5],
  },
  {
    id: 'white-star',
    name: '白色恒星',
    temperature: 10000,
    color: 0xf0f8ff,
    glowColor: 0xe0f0ff,
    massRange: [1.5, 2.5],
  },
  {
    id: 'blue-white-star',
    name: '蓝白恒星',
    temperature: 20000,
    color: 0xb0e0ff,
    glowColor: 0x88ccff,
    massRange: [2.5, 10],
  },
  {
    id: 'blue-giant',
    name: '蓝巨星',
    temperature: 30000,
    color: 0x6495ed,
    glowColor: 0x4488ff,
    massRange: [10, 50],
  },
];

export const PLANET_TYPES = [
  {
    id: 'mercury',
    name: '水星型',
    type: '岩石行星',
    baseColor: 0x8c7853,
    detail: 'rocky',
    sizeRange: [1.05, 1.4],
  },
  {
    id: 'venus',
    name: '金星型',
    type: '岩石行星',
    baseColor: 0xe6c87a,
    detail: 'cloudy',
    sizeRange: [1.2, 1.6],
  },
  {
    id: 'earth',
    name: '地球型',
    type: '类地行星',
    baseColor: 0x4a90d9,
    detail: 'earth',
    sizeRange: [1.5, 1.9],
  },
  {
    id: 'mars',
    name: '火星型',
    type: '岩石行星',
    baseColor: 0xcd5c5c,
    detail: 'desert',
    sizeRange: [1.05, 1.4],
  },
  {
    id: 'jupiter',
    name: '木星型',
    type: '气态巨行星',
    baseColor: 0xdaa06d,
    detail: 'gas',
    sizeRange: [4.4, 5.8],
  },
  {
    id: 'saturn',
    name: '土星型',
    type: '气态巨行星',
    baseColor: 0xfad6a5,
    detail: 'gas',
    hasRings: true,
    sizeRange: [4, 5.2],
  },
  {
    id: 'uranus',
    name: '天王星型',
    type: '冰巨行星',
    baseColor: 0x87ceeb,
    detail: 'ice',
    sizeRange: [2.9, 3.8],
  },
  {
    id: 'neptune',
    name: '海王星型',
    type: '冰巨行星',
    baseColor: 0x4169e1,
    detail: 'ice',
    sizeRange: [2.9, 3.8],
  },
];

export function formatMass(massKg) {
  if (massKg >= SOLAR_MASS * 0.1) {
    return `${(massKg / SOLAR_MASS).toFixed(2)} 太阳质量`;
  }

  if (massKg >= EARTH_MASS * 0.1) {
    return `${(massKg / EARTH_MASS).toFixed(2)} 地球质量`;
  }

  return `${(massKg / EARTH_MASS).toFixed(4)} 地球质量`;
}
