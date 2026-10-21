import {readdir,readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
for(const dir of ['src','public','tests','scripts'])for(const file of await readdir(dir)){if(/\.(mjs|js)$/.test(file)){const r=spawnSync(process.execPath,['--check',`${dir}/${file}`],{encoding:'utf8'});if(r.status){process.stderr.write(r.stderr);process.exit(1);}}}
const html=await readFile('public/index.html','utf8');const {fr}=await import('../public/i18n.mjs');for(const key of [...html.matchAll(/data-i18n="([^"]+)"/g)].map(x=>x[1]))if(!fr[key])throw new Error('Missing FR translation: '+key);
const {spawnSync:run}=await import('node:child_process');const result=run(process.execPath,['scripts/seed-rules.mjs'],{encoding:'utf8'});if(result.status)throw Error(result.stderr);
console.log('JavaScript syntax, French translations and deterministic rule seed: OK');
