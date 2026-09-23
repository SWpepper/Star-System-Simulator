import {
  AdditiveBlending,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

const TWO_PI = Math.PI * 2;

function orbitalAngle(body, elapsedYears) {
  if (!body.orbit || !body.orbit.periodYears) {
    return body.orbit?.phase ?? 0;
  }

  return body.orbit.phase + (elapsedYears / body.orbit.periodYears) * TWO_PI;
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
    const texture = this.textureFactory.create({
      kind: body.kind === 'star' ? 'star' : body.kind === 'moon' ? 'moon' : 'planet',
      appearance: body.render.appearance,
      color: body.render.baseColor,
      seed: body.render.seed,
      width: body.kind === 'moon' ? 256 : 512,
      height: body.kind === 'moon' ? 128 : 256,
    });
    const material = this.tracker.track(new MeshBasicMaterial({ map: texture }));
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
    this.root.add(glowGroup);
    this.views.set(star.id, { body: star, mesh, glowGroup, parentId: null });
  }

  createGlow(radius, color) {
    const group = new Group();
    const layers = [
      { scale: 1.18, opacity: 0.24 },
      { scale: 1.42, opacity: 0.13 },
      { scale: 1.78, opacity: 0.06 },
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

  createPlanet(planet) {
    const segments = this.capabilities.isLowPower ? 32 : 64;
    const mesh = this.createSphere(planet.render.radiusWorld, planet, segments);

    if (planet.render.hasRings) {
      const ringGeometry = this.tracker.track(
        new RingGeometry(planet.render.radiusWorld * 1.4, planet.render.radiusWorld * 2.8, 96),
      );
      const ringTexture = this.textureFactory.create({
        kind: 'ring',
        appearance: 'ring',
        color: planet.render.baseColor,
        seed: planet.render.seed + 31,
        width: 512,
        height: 64,
      });
      const ringMaterial = this.tracker.track(
        new MeshBasicMaterial({
          map: ringTexture,
          transparent: true,
          side: DoubleSide,
          opacity: 0.9,
          depthWrite: false,
        }),
      );
      const rings = new Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2;
      mesh.add(rings);
    }

    this.views.set(planet.id, { body: planet, mesh, glowGroup: null, parentId: planet.parentId });
    this.createOrbit(planet.orbit);

    for (const moon of planet.satellites) {
      const moonMesh = this.createSphere(
        moon.render.radiusWorld,
        moon,
        this.capabilities.isLowPower ? 20 : 32,
      );
      mesh.add(moonMesh);
      this.views.set(moon.id, { body: moon, mesh: moonMesh, glowGroup: null, parentId: planet.id });
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
      const { body, mesh, glowGroup } = view;

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
