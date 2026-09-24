import {
  ACESFilmicToneMapping,
  Timer,
  Color,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { detectCapabilities } from '../core/capabilities.js';
import { SimulationClock } from '../core/clock.js';
import { ResourceTracker } from '../core/resources.js';
import { generateSystem } from '../domain/systemGenerator.js';
import { createStarfield } from '../rendering/starfield.js';
import { SystemScene } from '../rendering/systemScene.js';
import { TextureFactory } from '../rendering/textureFactory.js';
import { TextureWorkerPool } from '../rendering/textureWorkerPool.js';
import { AudioController } from '../ui/audioController.js';
import { UIController } from '../ui/uiController.js';

function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0];
  }

  return Date.now();
}

export class SimulatorApp {
  constructor(container) {
    this.container = container;
    this.capabilities = detectCapabilities();
    this.sharedTracker = new ResourceTracker();
    this.systemTracker = new ResourceTracker();
    this.simulationClock = new SimulationClock();
    this.renderClock = new Timer();
    this.renderClock.connect(document);
    this.renderClock.update();
    this.running = true;
    this.visible = !document.hidden;
    this.firstFrameRendered = false;
    this.selectedBodyId = null;
    this.targetPosition = new Vector3();
    this.mouse = new Vector2();
    this.raycaster = new Raycaster();

    this.scene = new Scene();
    this.scene.background = new Color(0x000005);
    this.camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.set(0, 100, 200);

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.26;
    this.renderer.setPixelRatio(this.resolvePixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2.5;
    this.controls.zoomSpeed = 1.35;
    this.controls.zoomToCursor = true;
    this.controls.maxDistance = 2000;
    this.controls.target.set(0, 0, 0);

    this.starfield = createStarfield({
      count: this.capabilities.starCount,
      tracker: this.sharedTracker,
    });
    this.scene.add(this.starfield);

    this.workerPool = new TextureWorkerPool(this.capabilities.workerCount);
    this.textureFactory = new TextureFactory({
      capabilities: this.capabilities,
      tracker: this.systemTracker,
      workerPool: this.workerPool,
    });
    this.systemScene = new SystemScene({
      scene: this.scene,
      textureFactory: this.textureFactory,
      tracker: this.systemTracker,
      capabilities: this.capabilities,
    });

    this.ui = new UIController({
      onPause: () => this.togglePause(),
      onSpeedUp: () => this.setSpeed(this.simulationClock.speedUp()),
      onSlowDown: () => this.setSpeed(this.simulationClock.slowDown()),
      onDestroy: () => this.replaceSystem({ mode: 'random' }),
      onSolarSystem: () => this.replaceSystem({ mode: 'solar' }),
      onSelectBody: (bodyId) => this.selectBody(bodyId),
      onMusicToggle: () => this.audio.toggle(),
      onVolumeChange: (value) => this.audio.setVolume(value),
    });
    this.ui.setPaused(false);
    this.ui.setSpeed(this.simulationClock.speed);
    this.ui.hideBody();

    this.audio = new AudioController({
      onStateChange: (playing) => this.ui.setMusicPlaying(playing),
    });

    this.onResize = () => this.resize();
    this.onClick = (event) => this.handleClick(event);
    this.onVisibilityChange = () => {
      this.visible = !document.hidden;
      if (this.visible) {
        this.renderClock.getDelta();
      }
    };
    this.onBeforeUnload = () => this.dispose();

    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('click', this.onClick);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('beforeunload', this.onBeforeUnload, { once: true });

    this.loadSystem(generateSystem({ mode: 'random', seed: randomSeed() }));
    this.animate = this.animate.bind(this);
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  loadSystem(model) {
    this.selectedBodyId = null;
    this.controls.minDistance = 2.5;
    this.targetPosition.set(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 100, 200);
    this.simulationClock.reset();
    this.systemScene.load(model);
    this.systemScene.update(0, 0);
    this.ui.setGalaxy(model.galaxyNumber);
    this.ui.setYear(this.simulationClock.displayYear);
    this.ui.setPaused(false);
    this.ui.setSpeed(this.simulationClock.speed);
    this.ui.hideBody();
  }

  replaceSystem(options) {
    this.loadSystem(generateSystem({ mode: options.mode, seed: randomSeed() }));
  }

  togglePause() {
    this.ui.setPaused(this.simulationClock.togglePause());
  }

  setSpeed(speed) {
    this.ui.setSpeed(speed);
  }

  selectBody(bodyId) {
    const body = this.systemScene.getBody(bodyId);
    if (!body) {
      return;
    }

    this.selectedBodyId = bodyId;
    this.controls.minDistance = Math.max(1.2, body.render.radiusWorld * 1.15);
    this.ui.showInfo(body, this.systemScene.model);
  }

  handleClick(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const body = this.systemScene.pick(this.raycaster);

    if (body) {
      this.selectBody(body.id);
    }
  }

  update(deltaSeconds) {
    const elapsedYears = this.simulationClock.update(deltaSeconds);
    void elapsedYears;

    if (this.selectedBodyId) {
      const position = this.systemScene.getWorldPosition(this.selectedBodyId);
      this.targetPosition.set(position.x, position.y, position.z);
      this.controls.target.lerp(this.targetPosition, 0.05);
    }

    this.systemScene.update(this.simulationClock.elapsedYears, deltaSeconds);
    this.ui.setYear(this.simulationClock.displayYear);
    this.controls.update();
  }

  animate(timestamp) {
    if (!this.running) {
      return;
    }

    this.animationFrame = requestAnimationFrame(this.animate);
    this.renderClock.update(timestamp);
    const deltaSeconds = this.renderClock.getDelta();

    if (!this.visible) {
      return;
    }

    this.update(deltaSeconds);
    this.renderer.render(this.scene, this.camera);

    if (!this.firstFrameRendered) {
      this.firstFrameRendered = true;
      this.ui.hideLoading();
      document.documentElement.dataset.appReady = 'true';
    }
  }

  resolvePixelRatio() {
    return Math.min(
      Math.max(window.devicePixelRatio, this.capabilities.minPixelRatio),
      this.capabilities.maxPixelRatio,
    );
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.resolvePixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.systemScene.dispose();
    this.textureFactory.dispose();
    this.workerPool.dispose();
    this.sharedTracker.disposeAll();
    this.audio.dispose();
    this.renderClock.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
