import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  Color,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  PointLight,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { SPECIAL_TEXTURES, getBodyCloudTextureUrl, getBodyTextureUrl } from './textureCatalog.js';

const TWO_PI = Math.PI * 2;

function orbitalAngle(body, elapsedYears) {
  if (!body.orbit || !body.orbit.periodYears) {
    return body.orbit?.phase ?? 0;
  }

  return body.orbit.phase + (elapsedYears / body.orbit.periodYears) * TWO_PI;
}

function planetMaterialProfile(body) {
  switch (body.render.appearance) {
    case 'gas':
      return { roughness: 0.74, bumpScale: 0.12, atmosphere: 0xd8b77a, intensity: 0.12 };
    case 'ice':
      return { roughness: 0.38, bumpScale: 0.3, atmosphere: 0x8de8ff, intensity: 0.28 };
    case 'earth':
      return { roughness: 0.72, bumpScale: 0.42, atmosphere: 0x62c4ff, intensity: 0.46 };
    case 'cloudy':
      return { roughness: 0.7, bumpScale: 0.34, atmosphere: 0xffd28a, intensity: 0.36 };
    default:
      return { roughness: 0.94, bumpScale: 0.48, atmosphere: 0x7089b5, intensity: 0.16 };
  }
}

export class SystemScene {
  constructor({ scene, textureFactory, tracker, capabilities }) {
    this.scene = scene;
    this.textureFactory = textureFactory;
    this.tracker = tracker;
    this.capabilities = capabilities;
    this.root = null;
    this.model = null;
    this.views = new Map();
  }

  load(model) {
    this.dispose();

    this.model = model;
    this.root = new Group();
    this.root.name = `system-${model.seed}`;
    this.root.add(new AmbientLight(0x526685, 1.35));
    this.root.add(new HemisphereLight(0xdce9ff, 0x111725, 1.08));
    this.scene.add(this.root);

    for (const star of model.stars) {
      this.createStar(star);
    }

    for (const planet of model.planets) {
      this.createPlanet(planet);
    }
  }

  createSphere(radius, body, segments) {
    const geometry = this.tracker.track(
      new SphereGeometry(radius, segments, Math.max(16, Math.round(segments / 2))),
    );
    const textureSize = body.kind === 'moon' ? 256 : 512;
    const appearance = body.kind === 'moon' ? 'moon' : body.render.appearance;
    const sourceUrl = getBodyTextureUrl(body);
    const planetTypeId = body.meta?.planetType?.id;
    let material;

    if (body.kind === 'star') {
      const texture = this.textureFactory.createFromUrl(sourceUrl, {
        name: `${body.name}-surface`,
        width: 2048,
        height: 1024,
      });
      material = this.tracker.track(
        new MeshBasicMaterial({
          map: texture,
          color: new Color(body.render.baseColor),
          toneMapped: false,
        }),
      );
    } else {
      const map = sourceUrl
        ? this.textureFactory.createFromUrl(sourceUrl, {
            name: `${body.name}-albedo`,
            width: 2048,
            height: 1024,
          })
        : this.textureFactory.create({
            kind: body.kind === 'moon' ? 'moon' : 'planet',
            appearance,
            color: body.render.baseColor,
            seed: body.render.seed,
            width: textureSize,
            height: textureSize / 2,
          });
      const profile = planetMaterialProfile(body);
      const isEarth = planetTypeId === 'earth';
      const normalMap = isEarth
        ? this.textureFactory.createFromUrl(SPECIAL_TEXTURES.earthNormal, {
            name: 'earth-normal',
            colorSpace: NoColorSpace,
            width: 2048,
            height: 1024,
          })
        : null;
      const roughnessMap = isEarth
        ? this.textureFactory.createFromUrl(SPECIAL_TEXTURES.earthRoughness, {
            name: 'earth-roughness',
            colorSpace: NoColorSpace,
            width: 2048,
            height: 1024,
          })
        : null;
      const emissiveMap = isEarth
        ? this.textureFactory.createFromUrl(SPECIAL_TEXTURES.earthNight, {
            name: 'earth-night',
            width: 2048,
            height: 1024,
          })
        : null;
      const bumpMap =
        isEarth || sourceUrl
          ? null
          : this.textureFactory.create({
              kind: 'bump',
              appearance,
              color: 0xffffff,
              seed: body.render.seed + 997,
              width: this.capabilities.isLowPower ? 256 : 512,
              height: this.capabilities.isLowPower ? 128 : 256,
            });
      const emissive = emissiveMap
        ? new Color(0xffd8a8)
        : new Color(body.render.baseColor).multiplyScalar(body.kind === 'moon' ? 0.02 : 0.035);
      material = this.tracker.track(
        new MeshStandardMaterial({
          map,
          normalMap,
          normalScale: normalMap ? new Vector2(0.82, 0.82) : undefined,
          bumpMap,
          bumpScale: body.kind === 'moon' ? 0.5 : profile.bumpScale,
          roughnessMap,
          roughness: body.kind === 'moon' ? 0.96 : profile.roughness,
          metalness: 0,
          emissive,
          emissiveMap,
          emissiveIntensity: emissiveMap ? 0.78 : 1,
        }),
      );
    }

    const mesh = new Mesh(geometry, material);
    mesh.name = body.name;
    mesh.userData.body = body;
    this.root.add(mesh);
    return mesh;
  }

  createStar(star) {
    const segments = this.capabilities.isLowPower ? 32 : 64;
    const mesh = this.createSphere(star.render.radiusWorld, star, segments);
    const glowGroup = this.createGlow(star.render.radiusWorld, star.render.glowColor);
    const light = new PointLight(star.render.glowColor, 3.35, 0, 0);
    light.name = `${star.name}-light`;
    light.position.copy(mesh.position);
    this.root.add(light);
    this.root.add(glowGroup);
    this.views.set(star.id, { body: star, mesh, glowGroup, light, parentId: null });
  }

  createGlow(radius, color) {
    const group = new Group();
    const layers = [
      { scale: 1.15, opacity: 0.14 },
      { scale: 1.36, opacity: 0.072 },
      { scale: 1.7, opacity: 0.032 },
    ];

    for (const layer of layers) {
      const geometry = this.tracker.track(new SphereGeometry(radius * layer.scale, 32, 24));
      const material = this.tracker.track(
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      );
      group.add(new Mesh(geometry, material));
    }

    return group;
  }

  createCloudLayer(body) {
    if (!['earth', 'cloudy', 'ice'].includes(body.render.appearance)) {
      return null;
    }

    const width = this.capabilities.isLowPower ? 256 : 512;
    const height = this.capabilities.isLowPower ? 128 : 256;
    const cloudUrl = getBodyCloudTextureUrl(body);
    const cloudTexture = cloudUrl
      ? this.textureFactory.createFromUrl(cloudUrl, {
          name: `${body.name}-clouds`,
          width: 2048,
          height: 1024,
        })
      : this.textureFactory.create({
          kind: 'cloud',
          appearance: body.render.appearance,
          color: 0xffffff,
          seed: body.render.seed + 1777,
          width,
          height,
        });
    const geometry = this.tracker.track(
      new SphereGeometry(body.render.radiusWorld * 1.015, 48, 32),
    );
    const material = this.tracker.track(
      new MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: body.render.appearance === 'ice' ? 0.28 : 0.68,
        depthWrite: false,
        alphaTest: 0.015,
        roughness: 1,
        metalness: 0,
      }),
    );
    const cloudMesh = new Mesh(geometry, material);
    cloudMesh.name = `${body.name}-clouds`;
    cloudMesh.rotation.z = body.render.seed % 2 ? 0.12 : -0.12;
    return cloudMesh;
  }

  createAtmosphere(body) {
    const profile = planetMaterialProfile(body);
    if (!profile.atmosphere || profile.intensity <= 0) {
      return null;
    }

    const geometry = this.tracker.track(
      new SphereGeometry(body.render.radiusWorld * 1.075, 48, 32),
    );
    const material = this.tracker.track(
      new ShaderMaterial({
        uniforms: {
          glowColor: { value: new Color(profile.atmosphere) },
          intensity: { value: profile.intensity },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vNormal = normalize(mat3(modelMatrix) * normal);
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 2.6);
            gl_FragColor = vec4(glowColor, rim * intensity);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    );
    return new Mesh(geometry, material);
  }

  createPlanet(planet) {
    const segments = this.capabilities.isLowPower ? 32 : 64;
    const mesh = this.createSphere(planet.render.radiusWorld, planet, segments);
    const cloudMesh = this.createCloudLayer(planet);
    const atmosphere = this.createAtmosphere(planet);

    if (cloudMesh) {
      mesh.add(cloudMesh);
    }

    if (atmosphere) {
      mesh.add(atmosphere);
    }

    if (planet.render.hasRings) {
      const ringGeometry = this.tracker.track(
        new RingGeometry(planet.render.radiusWorld * 1.42, planet.render.radiusWorld * 2.9, 160, 3),
      );
      const ringTexture = this.textureFactory.createFromUrl(SPECIAL_TEXTURES.saturnRing, {
        name: `${planet.name}-ring`,
        width: 2048,
        height: 1024,
        clamp: true,
      });
      const ringMaterial = this.tracker.track(
        new MeshStandardMaterial({
          map: ringTexture,
          transparent: true,
          side: DoubleSide,
          opacity: 0.96,
          depthWrite: false,
          roughness: 0.82,
          metalness: 0,
          emissive: new Color(planet.render.baseColor).multiplyScalar(0.04),
        }),
      );
      const rings = new Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2;
      mesh.add(rings);
    }

    this.views.set(planet.id, {
      body: planet,
      mesh,
      cloudMesh,
      glowGroup: null,
      light: null,
      parentId: planet.parentId,
    });
    this.createOrbit(planet.orbit);

    for (const moon of planet.satellites) {
      const moonMesh = this.createSphere(
        moon.render.radiusWorld,
        moon,
        this.capabilities.isLowPower ? 20 : 32,
      );
      mesh.add(moonMesh);
      this.views.set(moon.id, {
        body: moon,
        mesh: moonMesh,
        cloudMesh: null,
        glowGroup: null,
        light: null,
        parentId: planet.id,
      });
    }
  }

  createOrbit(orbit) {
    if (!orbit || orbit.radiusWorld <= 0 || orbit.center === 'parent') {
      return null;
    }

    const geometry = this.tracker.track(
      new RingGeometry(orbit.radiusWorld - 0.3, orbit.radiusWorld + 0.3, 128),
    );
    const material = this.tracker.track(
      new MeshBasicMaterial({
        color: 0x3366aa,
        transparent: true,
        opacity: 0.25,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    const orbitMesh = new Mesh(geometry, material);
    orbitMesh.rotation.x = Math.PI / 2;
    this.root.add(orbitMesh);
    return orbitMesh;
  }

  update(elapsedYears, deltaSeconds = 0) {
    for (const view of this.views.values()) {
      const { body, mesh, glowGroup, light, cloudMesh } = view;

      if (body.kind === 'star' && body.orbit) {
        const angle = orbitalAngle(body, elapsedYears);
        mesh.position.set(
          Math.cos(angle) * body.orbit.radiusWorld,
          0,
          Math.sin(angle) * body.orbit.radiusWorld,
        );
      } else if (body.kind === 'planet' && body.orbit) {
        const center = body.orbit.centerId
          ? this.getWorldPosition(body.orbit.centerId)
          : { x: 0, z: 0 };
        const angle = orbitalAngle(body, elapsedYears);
        mesh.position.set(
          center.x + Math.cos(angle) * body.orbit.radiusWorld,
          0,
          center.z + Math.sin(angle) * body.orbit.radiusWorld,
        );
        mesh.rotation.y += body.render.rotationSpeed * deltaSeconds;
      } else if (body.kind === 'moon' && body.orbit) {
        const angle = orbitalAngle(body, elapsedYears);
        mesh.position.set(
          Math.cos(angle) * body.orbit.radiusWorld,
          Math.sin(angle * 0.3) * 0.5,
          Math.sin(angle) * body.orbit.radiusWorld,
        );
        mesh.rotation.y += body.render.rotationSpeed * deltaSeconds;
      }

      if (glowGroup) {
        glowGroup.position.copy(mesh.position);
      }

      if (light) {
        light.position.copy(mesh.position);
      }

      if (cloudMesh) {
        cloudMesh.rotation.y += deltaSeconds * 0.035;
      }
    }
  }

  getWorldPosition(bodyId) {
    const view = this.views.get(bodyId);
    if (!view) {
      return { x: 0, y: 0, z: 0 };
    }

    const position = view.mesh.getWorldPosition(new Vector3());
    return { x: position.x, y: position.y, z: position.z };
  }

  getBody(bodyId) {
    return this.views.get(bodyId)?.body ?? null;
  }

  pick(raycaster) {
    const meshes = [...this.views.values()].map((view) => view.mesh);
    const hit = raycaster.intersectObjects(meshes, true)[0];
    if (!hit) {
      return null;
    }

    let target = hit.object;
    while (target && !target.userData.body) {
      target = target.parent;
    }

    return target?.userData.body ?? null;
  }

  dispose() {
    if (this.root) {
      this.scene.remove(this.root);
      this.root.clear();
      this.root = null;
    }

    this.tracker.disposeAll();
    this.views.clear();
    this.model = null;
  }
}
