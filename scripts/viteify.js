const { execSync } = require('child_process');
const {
  stat,
  renameSync,
  appendFile,
  readFile,
  unlink,
  writeFile,
} = require('fs');
const { resolve, join } = require('path');
const { readdir } = require('fs').promises;

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

(async () => {
  for await (const f of getFiles('src')) {
    if (f.endsWith('.js')) {
      renameSync(f, f.slice(0, -3).concat('.jsx'));
    }
  }

  let packageManager = 'npm';
  stat('yarn.lock', (err, stats) => {
    if (!err) {
      packageManager = 'yarn';
    }
  });

  stat(join('public', 'index.html'), (err, stats) => {
    if (!err) {
      unlink(join('public', 'index.html'), err => {
        if (err) throw err;
      });
    }
  });

  appendFile(
    'index.html',
    '<script type="module" src="./src/index.jsx"></script>',
    err => {
      if (err) throw err;
    }
  );

  appendFile('vite.config.js', '', err => {
    if (err) throw err;
  });

  if (packageManager == 'npm') {
    execSync('npm i vite @vitejs/plugin-react --save-dev', {
      stdio: [0, 1, 2],
    });
  } else if (packageManager == 'yarn') {
    execSync('yarn add vite @vitejs/plugin-react -D', { stdio: [0, 1, 2] });
  }

  readFile('package.json', (err, data) => {
    if (err) throw err;
    let package = JSON.parse(data);
    package.scripts.start = 'vite';
    package.scripts.build = 'vite build --outDir build';

    writeFile('package.json', JSON.stringify(package, null, 2), err => {
      if (err) throw err;
    });
  });

  console.log(
    'Convert all process.env to import.meta.env as its how vite exposes environment variables. Refer to https://vitejs.dev/guide/env-and-mode.html'
  );

  const readline = require('readline');
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  prompt.question('Perform PWA migration to Vite?[Y/n]', answer => {
    if (answer == 'Y') {
      if (packageManager == 'npm') {
        execSync('npm i vite-plugin-pwa -D', { stdio: [0, 1, 2] });
      } else if (packageManager == 'yarn') {
        execSync('yarn add vite-plugin-pwa -D', { stdio: [0, 1, 2] });
      }

      let pwa = `import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
    plugins: [
        VitePWA({ registerType: 'autoUpdate' })
    ]
})
            `;
      appendFile('vite.config.js', pwa, err => {
        if (err) throw err;
      });
    }
    prompt.close();
  });
})();
