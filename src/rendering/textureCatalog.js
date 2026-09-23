import earthCloudsUrl from '../assets/textures/2k_earth_clouds.webp?url';
import earthDayUrl from '../assets/textures/2k_earth_daymap.jpg?url';
import earthNightUrl from '../assets/textures/2k_earth_nightmap.jpg?url';
import earthNormalUrl from '../assets/textures/2k_earth_normal.webp?url';
import earthRoughnessUrl from '../assets/textures/2k_earth_roughness.webp?url';
import jupiterUrl from '../assets/textures/2k_jupiter.jpg?url';
import marsUrl from '../assets/textures/2k_mars.jpg?url';
import mercuryUrl from '../assets/textures/2k_mercury.jpg?url';
import moonUrl from '../assets/textures/2k_moon.jpg?url';
import neptuneUrl from '../assets/textures/2k_neptune.jpg?url';
import saturnRingUrl from '../assets/textures/2k_saturn_ring_alpha.png?url';
import saturnUrl from '../assets/textures/2k_saturn.jpg?url';
import sunUrl from '../assets/textures/2k_sun.jpg?url';
import uranusUrl from '../assets/textures/2k_uranus.jpg?url';
import venusAtmosphereUrl from '../assets/textures/2k_venus_atmosphere.webp?url';
import venusSurfaceUrl from '../assets/textures/2k_venus_surface.jpg?url';

export const PLANET_TEXTURES = {
  mercury: mercuryUrl,
  venus: venusSurfaceUrl,
  earth: earthDayUrl,
  mars: marsUrl,
  jupiter: jupiterUrl,
  saturn: saturnUrl,
  uranus: uranusUrl,
  neptune: neptuneUrl,
};

export const PLANET_CLOUD_TEXTURES = {
  venus: venusAtmosphereUrl,
  earth: earthCloudsUrl,
};

export const SPECIAL_TEXTURES = {
  earthNight: earthNightUrl,
  earthNormal: earthNormalUrl,
  earthRoughness: earthRoughnessUrl,
  moon: moonUrl,
  saturnRing: saturnRingUrl,
  sun: sunUrl,
};

export function getBodyTextureUrl(body) {
  if (body.kind === 'star') {
    return SPECIAL_TEXTURES.sun;
  }

  if (body.kind === 'moon') {
    return SPECIAL_TEXTURES.moon;
  }

  return PLANET_TEXTURES[body.meta?.planetType?.id] ?? null;
}

export function getBodyCloudTextureUrl(body) {
  return PLANET_CLOUD_TEXTURES[body.meta?.planetType?.id] ?? null;
}
