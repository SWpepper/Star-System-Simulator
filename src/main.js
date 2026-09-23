import './styles/main.css';
import { SimulatorApp } from './app/SimulatorApp.js';

try {
  const container = document.getElementById('container');
  if (!container) {
    throw new Error('缺少 3D 渲染容器。');
  }

  new SimulatorApp(container);
} catch (error) {
  console.error('恒星系模拟器启动失败:', error);
  const loading = document.getElementById('loading');
  const panel = document.getElementById('fatal-error');
  const message = document.getElementById('fatal-error-message');
  loading?.classList.add('hidden');
  panel?.classList.remove('hidden');
  if (message) {
    message.textContent = error instanceof Error ? error.message : '当前浏览器无法初始化 3D 渲染。';
  }
}
