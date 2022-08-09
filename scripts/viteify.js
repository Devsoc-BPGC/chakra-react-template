const { exec } = require('child_process');
const { stat, renameSync, appendFile, unlink, writeFile } = require('fs');
const { resolve } = require('path');
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

;(async () => {
    for await (const f of getFiles('./src')) {
        if(f.endsWith(".js")){
            renameSync(f,f.slice(0,-3).concat(".jsx"))
        }
    }

    await stat('./public/index.html', (err,stats) => {
        if(!err){
            unlink('./public/index.html',(err) => {
                if(err) throw err
            })
        }
    })

    await appendFile('index.html', '<script type="module" src="./src/index.jsx"></script>', (err) => {
        if (err) throw err
    })

    await appendFile('vite.config.js', '', (err) => {
        if (err) throw err
    })

    await exec('npm install vite @vitejs/plugin-react --save-dev', (err) => {
        if (err) throw err
    })

    let package = JSON.parse(await readFile('./package.json'))
    package.scripts.start = 'vite'
    package.scripts.build = 'vite build --outDir build'

    await writeFile('./package.json', JSON.stringify(file, null, 2),err => {if (err) throw err})

      
  })()