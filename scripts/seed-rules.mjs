import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const statements=[];
for(const file of ['vaud-2025.v1.json','vaud-2026.v1.json']){const r=JSON.parse(await readFile(new URL('../rules/'+file,import.meta.url),'utf8'));const raw=JSON.stringify(r);const hash=createHash('sha256').update(raw).digest('hex');statements.push(`INSERT INTO rulesets(id,tax_year,canton,version,status,payload,sha256) VALUES (${[r.id,r.taxYear,r.canton,r.version,r.status,raw,hash].map(quote).join(',')});`);}
await writeFile(new URL('../migrations/0002_rules.sql',import.meta.url),statements.join('\n')+'\n');
