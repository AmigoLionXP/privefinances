import { env } from 'cloudflare:workers';
import worker from '../../../src/worker.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){return worker.fetch(request,{...env,AUTH_MODE:'sites'});}
export const GET=handle,POST=handle,PUT=handle,DELETE=handle;
