import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  CanvasTexture,
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
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from 'three';
import { createRng } from '../core/random.js';
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
  constructor({ scene, textureFactory, tracker, capabilities, camera }) {
    this.scene = scene;
    this.textureFactory = textureFactory;
    this.tracker = tracker;
    this.capabilities = capabilities;
    this.camera = camera;
    this.root = null;
    this.model = null;
    this.elapsedTime = 0;
    this.views = new Map();
  }

  load(model) {
    this.dispose();

    this.model = model;
    this.root = new Group();
    this.root.name = `system-${model.seed}`;
    this.root.add(new AmbientLight(0x5d7192, 1.52));
    this.root.add(new HemisphereLight(0xe8f1ff, 0x182033, 1.3));
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
      material = this.createStarSurfaceMaterial(texture, body);
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

  createCoronaMaterial(color) {
    const material = new ShaderMaterial({
      uniforms: {
        glowColor: { value: new Color(color).lerp(new Color(0xffffff), 0.18) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 cell = floor(p);
          vec2 local = fract(p);
          local = local * local * (3.0 - 2.0 * local);
          return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x), mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x), local.y);
        }
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += noise(p) * amplitude;
            p = p * 2.1 + 9.7;
            amplitude *= 0.5;
          }
          return value;
        }
        void main() {
          float angle = atan(vNormal.z, vNormal.x);
          float longitude = angle * 1.9 + vUv.y * 3.0;
          float streamers = fbm(vec2(longitude * 2.6 + time * 0.08, vUv.y * 5.0 - time * 0.04));
          float lace = fbm(vec2(longitude * 7.0, vUv.y * 11.0 + time * 0.12));
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 2.7);
          float tendrils = smoothstep(0.42, 0.82, streamers * 0.65 + lace * 0.35);
          float alpha = rim * (0.08 + tendrils * 0.62);
          vec3 color = mix(glowColor, vec3(1.0), tendrils * 0.28);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: BackSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });

    return this.tracker.track(material);
  }

  createCorona(radius, color) {
    const geometry = this.tracker.track(new SphereGeometry(radius * 1.075, 64, 48));
    const corona = new Mesh(geometry, this.createCoronaMaterial(color));
    corona.name = 'stellar-corona';
    return corona;
  }
  createProminenceTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const rng = createRng(seed + 9973);
    const center = 256;
    const innerRadius = 108;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';

    for (let ray = 0; ray < 110; ray += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const length = rng.range(58, 148);
      const bend = rng.range(-0.34, 0.34);
      const start = innerRadius + rng.range(-8, 16);
      const end = start + length;
      context.beginPath();
      context.strokeStyle = `rgba(255, 255, 255, ${rng.range(0.03, 0.21)})`;
      context.lineWidth = rng.range(0.45, 2.6);
      context.moveTo(center + Math.cos(angle) * start, center + Math.sin(angle) * start);
      context.quadraticCurveTo(
        center + Math.cos(angle + bend * 0.35) * ((start + end) * 0.5),
        center + Math.sin(angle + bend * 0.35) * ((start + end) * 0.5),
        center + Math.cos(angle + bend) * end,
        center + Math.sin(angle + bend) * end,
      );
      context.stroke();
    }

    for (let flare = 0; flare < 12; flare += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const length = rng.range(128, 218);
      context.beginPath();
      context.strokeStyle = `rgba(255, 255, 255, ${rng.range(0.08, 0.24)})`;
      context.lineWidth = rng.range(2.5, 7.5);
      context.moveTo(
        center + Math.cos(angle) * innerRadius,
        center + Math.sin(angle) * innerRadius,
      );
      context.lineTo(center + Math.cos(angle) * length, center + Math.sin(angle) * length);
      context.stroke();
    }

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return this.tracker.track(texture);
  }
  createProminences(radius, color, seed) {
    const group = new Group();
    group.name = 'solar-prominences';
    group.userData.radius = radius;
    const texture = this.createProminenceTexture(seed);

    for (const layer of [
      { scale: 2.25, opacity: 0.34, rotation: 0.2 },
      { scale: 3.05, opacity: 0.16, rotation: -1.15 },
    ]) {
      const material = this.tracker.track(
        new SpriteMaterial({
          map: texture,
          color: new Color(color).lerp(new Color(0xffffff), 0.2),
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          blending: AdditiveBlending,
          toneMapped: false,
        }),
      );
      material.rotation = layer.rotation;
      material.userData.baseRotation = layer.rotation;
      material.userData.baseOpacity = layer.opacity;
      const sprite = new Sprite(material);
      sprite.scale.set(radius * layer.scale, radius * layer.scale, 1);
      group.add(sprite);
    }

    return group;
  }
  createStarSurfaceMaterial(texture, body) {
    const color = new Color(body.render.baseColor).lerp(new Color(0xffffff), 0.28);
    const material = new ShaderMaterial({
      uniforms: {
        surfaceMap: { value: texture },
        baseColor: { value: color },
        time: { value: body.render.seed * 0.001 },
        intensity: { value: 1.22 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D surfaceMap;
        uniform vec3 baseColor;
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 cell = floor(p);
          vec2 local = fract(p);
          local = local * local * (3.0 - 2.0 * local);
          return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x), mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x), local.y);
        }
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
            value += noise(p) * amplitude;
            p = p * 2.03 + 17.1;
            amplitude *= 0.5;
          }
          return value;
        }
        void main() {
          vec2 flow = vec2(time * 0.018, time * 0.009);
          float surface = texture2D(surfaceMap, fract(vUv + flow)).r;
          vec2 p = vUv * vec2(46.0, 23.0);
          float turbulence = fbm(p + flow * 7.0);
          float fine = fbm(p * 3.1 - flow * 10.0);
          float filaments = 1.0 - abs(turbulence * 2.0 - 1.0);
          float granulation = surface * 0.48 + turbulence * 0.26 + fine * 0.26;
          float flare = pow(max(0.0, filaments - 0.58) * 2.4, 2.0);
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 0.7);
          float pulse = 0.96 + sin(time * 0.85) * 0.035;
          vec3 base = mix(baseColor * 0.62, baseColor * 1.2, smoothstep(0.28, 0.86, granulation));
          base += mix(baseColor, vec3(1.0), 0.68) * flare * 0.72;
          base += baseColor * rim * 0.2;
          gl_FragColor = vec4(base * intensity * pulse, 1.0);
        }
      `,
      toneMapped: false,
    });

    return this.tracker.track(material);
  }
  createStar(star) {
    const segments = this.capabilities.isLowPower ? 32 : 64;
    const mesh = this.createSphere(star.render.radiusWorld, star, segments);
    const glowGroup = this.createGlow(star.render.radiusWorld, star.render.glowColor);
    const corona = this.createCorona(star.render.radiusWorld, star.render.glowColor);
    const prominences = this.createProminences(
      star.render.radiusWorld,
      star.render.glowColor,
      star.render.seed,
    );
    const light = new PointLight(star.render.glowColor, 4.15, 0, 0);
    light.name = `${star.name}-light`;
    light.position.copy(mesh.position);
    this.root.add(light);
    this.root.add(glowGroup);
    this.root.add(corona);
    this.root.add(prominences);
    this.views.set(star.id, {
      body: star,
      mesh,
      glowGroup,
      corona,
      prominences,
      light,
      parentId: null,
    });
  }

  createGlowTexture() {
    if (this.glowTexture) {
      return this.glowTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.12, 'rgba(255, 255, 255, 0.82)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.32)');
    gradient.addColorStop(0.62, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    this.glowTexture = this.tracker.track(new CanvasTexture(canvas));
    this.glowTexture.colorSpace = SRGBColorSpace;
    return this.glowTexture;
  }

  createGlow(radius, color) {
    const group = new Group();
    const texture = this.createGlowTexture();
    const layers = [
      { scale: 2.8, opacity: 0.52 },
      { scale: 4.6, opacity: 0.2 },
    ];

    for (const layer of layers) {
      const material = this.tracker.track(
        new SpriteMaterial({
          map: texture,
          color,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          blending: AdditiveBlending,
          toneMapped: false,
        }),
      );
      const sprite = new Sprite(material);
      sprite.scale.set(radius * layer.scale, radius * layer.scale, 1);
      group.add(sprite);
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
    this.elapsedTime += deltaSeconds;

    for (const view of this.views.values()) {
      const { body, mesh, glowGroup, corona, prominences, light, cloudMesh } = view;

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

      const distanceToCamera = this.camera
        ? this.camera.position.distanceTo(mesh.position)
        : Number.POSITIVE_INFINITY;

      if (corona) {
        corona.position.copy(mesh.position);
        corona.visible = distanceToCamera > body.render.radiusWorld * 1.2;
        if (corona.material.uniforms?.time) {
          corona.material.uniforms.time.value = this.elapsedTime;
        }
      }

      if (mesh.material.uniforms?.time) {
        mesh.material.uniforms.time.value = this.elapsedTime + body.render.seed * 0.001;
      }

      if (prominences) {
        prominences.position.copy(mesh.position);
        const radius = prominences.userData.radius ?? body.render.radiusWorld;
        const fadeNear = radius * 2.2;
        const fadeFar = radius * 5.8;
        const visibility = Math.max(
          0,
          Math.min(1, (distanceToCamera - fadeNear) / (fadeFar - fadeNear)),
        );
        prominences.visible = visibility > 0.02;
        prominences.children.forEach((sprite, index) => {
          sprite.material.rotation =
            sprite.material.userData.baseRotation +
            this.elapsedTime * (index === 0 ? 0.008 : -0.005);
          sprite.material.opacity =
            sprite.material.userData.baseOpacity *
            visibility *
            (0.86 + Math.sin(this.elapsedTime * 0.32 + index * 1.7) * 0.14);
        });
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
    this.glowTexture = null;
    this.views.clear();
    this.model = null;
  }
}
