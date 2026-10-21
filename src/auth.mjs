import {fail} from './validation.mjs';
import {sha256,unb64,seal} from './crypto.mjs';
const decode=s=>unb64(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='));
let keyCache;
export async function verifyAccess(token,env,fetcher=fetch,now=Date.now()){
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!token)fail('authentication_required',401);
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN))fail('auth_not_configured',503);
 try{const parts=token.split('.');if(parts.length!==3)throw Error();const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));const payload=JSON.parse(new TextDecoder().decode(decode(parts[1])));const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;
 if(header.alg!=='RS256'||payload.iss!==issuer||!Number.isFinite(payload.exp)||payload.exp*1000<=now||!payload.sub||!payload.email||(payload.nbf&&payload.nbf*1000>now)||!(Array.isArray(payload.aud)?payload.aud:[payload.aud]).includes(env.ACCESS_AUD))throw Error();
 if(!keyCache||keyCache.issuer!==issuer||keyCache.expires<now){const res=await fetcher(`${issuer}/cdn-cgi/access/certs`,{signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error();keyCache={issuer,expires:now+300000,keys:(await res.json()).keys};}
 const jwk=keyCache.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)throw Error();const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error();return {sub:payload.sub,email:payload.email};
 }catch{fail('invalid_identity',401);}
}
export async function authenticate(req,env){const host=new URL(req.url).hostname;const platformId=req.headers.get('oai-authenticated-user-id'),platformEmail=req.headers.get('oai-authenticated-user-email');if(env.AUTH_MODE==='sites'&&(!platformId||!platformEmail))fail('authentication_required',401);const identity=env.AUTH_MODE==='sites'?{sub:'sites:'+platformId,email:platformEmail}:env.ALLOW_LOCAL_DEV==='true'&&['localhost','127.0.0.1','[::1]'].includes(host)?{sub:'local-test-user',email:'demo@example.invalid'}:await verifyAccess(req.headers.get('Cf-Access-Jwt-Assertion'),env);
 const id=await sha256(identity.sub);const cipher=await seal(env,{email:identity.email},`user:${id}`);await env.DB.prepare('INSERT OR IGNORE INTO users(id,identity_cipher) VALUES(?,?)').bind(id,cipher).run();const row=await env.DB.prepare('SELECT deleting FROM users WHERE id=?').bind(id).first();if(row?.deleting)fail('account_deleting',409);return {id,email:identity.email};}
