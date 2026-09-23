const MUSIC_URL = new URL('../assets/background.mp3', import.meta.url).href;

export class AudioController {
  constructor({ onStateChange } = {}) {
    this.audio = new Audio(MUSIC_URL);
    this.audio.loop = true;
    this.audio.preload = 'none';
    this.audio.volume = 0.3;
    this.playing = false;
    this.onStateChange = onStateChange ?? (() => {});
  }

  async play() {
    try {
      await this.audio.play();
      this.playing = true;
      this.onStateChange(true);
    } catch (error) {
      this.playing = false;
      this.onStateChange(false);
      console.warn('音频播放失败:', error);
    }
  }

  pause() {
    this.audio.pause();
    this.playing = false;
    this.onStateChange(false);
  }

  toggle() {
    if (this.playing) {
      this.pause();
      return;
    }

    void this.play();
  }

  setVolume(value) {
    this.audio.volume = Math.max(0, Math.min(1, value / 100));
  }

  dispose() {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
