import {fail} from './validation.mjs';
const enc=new TextEncoder();
export function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export const unb64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
export const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export async function sha256(value){return hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));}
async function key(env,id){let value;try{value=JSON.parse(env.DATA_KEYS)[id];}catch{fail('encryption_not_configured',503);}if(!value)fail('encryption_key_unavailable',503);let bytes;try{bytes=unb64(value);}catch{fail('encryption_not_configured',503);}if(bytes.length!==32)fail('encryption_not_configured',503);return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(env,value,context){const id=env.ACTIVE_DATA_KEY;if(!id)fail('encryption_not_configured',503);const iv=crypto.getRandomValues(new Uint8Array(12));const data=enc.encode(JSON.stringify(value));return JSON.stringify({v:1,key:id,iv:b64(iv),data:b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(context)},await key(env,id),data)))});}
export async function open(env,value,context){const payload=JSON.parse(value);if(payload.v!==1)fail('invalid_envelope',500);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(payload.iv),additionalData:enc.encode(context)},await key(env,payload.key),unb64(payload.data))));}
