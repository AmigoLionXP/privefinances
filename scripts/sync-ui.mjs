import {readFile,writeFile} from 'node:fs/promises';const html=await readFile('public/index.html','utf8');await writeFile('app/ui-html.ts','export default '+JSON.stringify(html)+';\n');
