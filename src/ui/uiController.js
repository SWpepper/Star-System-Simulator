import { formatMass } from '../core/constants.js';

function element(id) {
  return document.getElementById(id);
}

function formatSpeed(speed) {
  return speed < 1 ? `${speed.toFixed(1)}x` : `${speed}x`;
}

export class UIController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.uiVisible = true;
    this.currentYear = null;
    this.previousFocus = null;
    this.bind();
  }

  bind() {
    element('btn-pause').addEventListener('click', () => this.callbacks.onPause());
    element('btn-faster').addEventListener('click', () => this.callbacks.onSpeedUp());
    element('btn-slower').addEventListener('click', () => this.callbacks.onSlowDown());
    element('btn-close').addEventListener('click', () => this.hideBody());
    element('btn-destroy').addEventListener('click', () => {
      if (confirm('确定要毁灭这个星系吗？这将清除所有天体并生成新的星系。')) {
        this.callbacks.onDestroy();
      }
    });
    element('btn-solar-system').addEventListener('click', () => {
      if (confirm('生成太阳系？当前星系将被替换。')) {
        this.callbacks.onSolarSystem();
      }
    });
    element('btn-toggle-ui').addEventListener('click', () => this.toggleVisibility());
    element('btn-music').addEventListener('click', () => this.callbacks.onMusicToggle());
    element('volume-slider').addEventListener('input', (event) => {
      this.callbacks.onVolumeChange(Number(event.target.value));
    });

    const helpModal = element('help-modal');
    element('btn-help').addEventListener('click', () => this.showHelp());
    element('btn-close-help').addEventListener('click', () => this.hideHelp());
    helpModal.addEventListener('click', (event) => {
      if (event.target === helpModal) {
        this.hideHelp();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideHelp();
      }
    });
  }

  setGalaxy(label) {
    element('galaxy-label').textContent =
      label.endsWith('星系') || label === '太阳系' ? label : `${label}星系`;
  }

  setYear(year) {
    if (year === this.currentYear) {
      return;
    }

    this.currentYear = year;
    element('year-value').textContent = String(year);
  }

  setPaused(paused) {
    const button = element('btn-pause');
    button.textContent = paused ? '▶' : '▶▶';
    button.setAttribute('aria-label', paused ? '继续模拟' : '暂停模拟');
  }

  setSpeed(speed) {
    element('speed-display').textContent = formatSpeed(speed);
  }

  setMusicPlaying(playing) {
    const button = element('btn-music');
    button.classList.toggle('playing', playing);
    button.textContent = playing ? '🔊' : '♪';
    button.setAttribute('aria-label', playing ? '暂停音乐' : '播放音乐');
  }

  showInfo(body, model) {
    element('info-panel').classList.remove('hidden');
    element('body-name').textContent = body.name;
    element('body-type').textContent = body.type;
    element('body-mass').textContent = formatMass(body.massKg);

    const planetTypeRow = element('planet-type-row');
    const lifeRow = element('life-row');
    const destroySection = element('destroy-section');
    const radiusLabel = element('radius-label');

    if (body.kind === 'star') {
      planetTypeRow.classList.add('hidden');
      lifeRow.classList.add('hidden');
      destroySection.classList.remove('hidden');
      radiusLabel.textContent = '表面温度';
      element('body-radius').textContent = body.meta.temperatureK
        ? `${body.meta.temperatureK.toLocaleString()} K`
        : '-';
      element('body-orbital-radius').textContent = '-';
      element('body-orbital-period').textContent = '-';
    } else if (body.kind === 'moon') {
      planetTypeRow.classList.add('hidden');
      lifeRow.classList.add('hidden');
      destroySection.classList.add('hidden');
      radiusLabel.textContent = '半径';
      element('body-radius').textContent = `${body.render.radiusWorld.toFixed(1)} 单位`;
      element('body-orbital-radius').textContent = `${body.orbit.radiusWorld.toFixed(1)} 单位`;
      element('body-orbital-period').textContent =
        `${(body.orbit.periodYears * 365.25).toFixed(1)} 天`;
    } else {
      destroySection.classList.add('hidden');
      planetTypeRow.classList.remove('hidden');
      lifeRow.classList.remove('hidden');
      radiusLabel.textContent = '半径';
      element('body-radius').textContent = `${body.render.radiusWorld.toFixed(1)} 单位`;
      element('body-planet-type').textContent = body.meta.planetType.type;
      element('body-orbital-radius').textContent = `${body.orbit.radiusAu.toFixed(2)} AU`;
      element('body-orbital-period').textContent = `${body.orbit.periodYears.toFixed(3)} 年`;

      const lifeElement = element('body-life');
      lifeElement.textContent = body.meta.lifeStatus;
      lifeElement.className = `info-value ${
        body.meta.lifeStatus === '无生命迹象' ? 'life-no' : 'life-possible'
      }`;
    }

    const satelliteSection = element('satellites-section');
    const satelliteList = element('satellites-list');
    satelliteList.replaceChildren();

    const planet = model.planets.find((candidate) => candidate.id === body.id);
    const satellites = planet?.satellites ?? [];
    if (satellites.length > 0) {
      satelliteSection.classList.remove('hidden');
      for (const moon of satellites) {
        const item = document.createElement('li');
        item.textContent = moon.name;
        item.tabIndex = 0;
        item.addEventListener('click', () => this.callbacks.onSelectBody(moon.id));
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.callbacks.onSelectBody(moon.id);
          }
        });
        satelliteList.appendChild(item);
      }
    } else {
      satelliteSection.classList.add('hidden');
    }
  }

  hideBody() {
    element('info-panel').classList.add('hidden');
  }

  showHelp() {
    this.previousFocus = document.activeElement;
    element('help-modal').classList.remove('hidden');
    element('btn-close-help').focus();
  }

  hideHelp() {
    element('help-modal').classList.add('hidden');
    if (this.previousFocus instanceof HTMLElement) {
      this.previousFocus.focus();
    }
  }

  toggleVisibility() {
    this.uiVisible = !this.uiVisible;
    const ids = ['time-panel', 'solar-system-panel', 'help-panel', 'hint'];
    for (const id of ids) {
      element(id).classList.toggle('hidden', !this.uiVisible);
    }

    const button = element('btn-toggle-ui');
    button.textContent = this.uiVisible ? 'UI' : '👁';
    button.classList.toggle('active', !this.uiVisible);
    button.setAttribute('aria-label', this.uiVisible ? '隐藏界面' : '显示界面');
  }

  hideLoading() {
    element('loading').classList.add('hidden');
  }

  showFatal(message) {
    element('loading').classList.add('hidden');
    const panel = element('fatal-error');
    element('fatal-error-message').textContent = message;
    panel.classList.remove('hidden');
  }
}
