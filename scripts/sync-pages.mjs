import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const buildDirectory = path.join(rootDirectory, 'dist', 'web');
const generatedPaths = ['index.html', 'favicon.svg', 'assets'].map((entry) =>
  path.join(rootDirectory, entry),
);

await rimraf(generatedPaths);
mkdirSync(path.join(rootDirectory, 'assets'), { recursive: true });

copyFileSync(path.join(buildDirectory, 'index.html'), path.join(rootDirectory, 'index.html'));
copyFileSync(path.join(buildDirectory, 'favicon.svg'), path.join(rootDirectory, 'favicon.svg'));

for (const entry of readdirSync(path.join(buildDirectory, 'assets'))) {
  copyFileSync(
    path.join(buildDirectory, 'assets', entry),
    path.join(rootDirectory, 'assets', entry),
  );
}

process.stdout.write('pages-sync: root deployment files updated\n');
