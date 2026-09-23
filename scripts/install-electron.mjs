import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const electronDirectory = path.dirname(require.resolve('electron/package.json'));
const installScript = path.join(electronDirectory, 'install.js');
const environment = { ...process.env };

if (!environment.ELECTRON_MIRROR) {
  environment.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
}

const result = spawnSync(process.execPath, [installScript], {
  env: environment,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
