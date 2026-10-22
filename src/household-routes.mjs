import {household, changeSummary} from './household.mjs';
import {monthlyBudget, projection, diagnosis, goalCheck, recommendations} from './budget-engine.mjs';
import {seal, open} from './crypto.mjs';
import {jsonBody, fail} from './validation.mjs';
import {track, amountBucket} from './telemetry.mjs';
import {realizedSavings} from './budget-engine.mjs';

const json = (v, status = 200) => new Response(JSON.stringify(v), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}});
const today = env => (env.TODAY_OVERRIDE && /^\d{4}-\d{2}-\d{2}$/.test(env.TODAY_OVERRIDE) ? env.TODAY_OVERRIDE : new Date().toISOString().slice(0, 10));

export async function getHousehold(env, userId) {
  const row = await env.DB.prepare('SELECT payload FROM households WHERE user_id=?').bind(userId).first();
  return row ? open(env, row.payload, `household:${userId}`) : null;
}
export async function getHouseholdEvents(env, userId) {
  const rows = await env.DB.prepare('SELECT id,created_at,kind,payload FROM household_events WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 200').bind(userId).all();
  return Promise.all(rows.results.map(async r => ({id: r.id, at: r.created_at, kind: r.kind, ...await open(env, r.payload, `household_event:${userId}:${r.id}`)})));
}
function overview(h, day) {
  return {
    budget: monthlyBudget(h, day.slice(0, 7)),
    projection: (({events, daily, ...rest}) => ({...rest, daily}))(projection(h, day, 30)),
    diagnosis: (({budget, projection, ...rest}) => rest)(diagnosis(h, day)),
    goal: goalCheck(h, day.slice(0, 7)),
    recommendations: recommendations(h, day),
    today: day
  };
}

/** Grava o agregado e um evento de histórico (só contagens), numa transação. */
export async function writeHousehold(env, userId, next, kind, summary) {
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO households(user_id,payload) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP').bind(userId, await seal(env, next, `household:${userId}`)),
    env.DB.prepare('INSERT INTO household_events(id,user_id,kind,payload) VALUES(?,?,?,?)').bind(id, userId, kind, await seal(env, summary, `household_event:${userId}:${id}`))
  ]);
  return next;
}
export {overview, today};

export async function householdRoute(req, env, user) {
  const path = new URL(req.url).pathname, method = req.method;
  if (path === '/api/household' && method === 'GET') {
    const h = await getHousehold(env, user.id);
    return json({household: h, overview: h ? overview(h, today(env)) : null});
  }
  if (path === '/api/household' && method === 'PUT') {
    const next = household(await jsonBody(req, 200000));
    const prev = await getHousehold(env, user.id);
    await writeHousehold(env, user.id, next, prev ? 'updated' : 'created', changeSummary(prev, next));
    const day = today(env).slice(0, 7);
    if (next.onboarding.completed && !prev?.onboarding?.completed) await track(env, user.id, 'onboarding_completed');
    if (!prev && next.expenses.length) await track(env, user.id, 'budget_created');
    const gain = realizedSavings(next, day).monthly - (prev ? realizedSavings(prev, day).monthly : 0);
    if (gain > 0) await track(env, user.id, 'saving_confirmed', {amountBucket: amountBucket(gain)});
    return json({household: next, overview: overview(next, today(env))});
  }
  if (path === '/api/household/history' && method === 'GET') return json({events: await getHouseholdEvents(env, user.id)});
  if (path === '/api/household/recommendation' && method === 'POST') {
    const input = await jsonBody(req);
    const h = await getHousehold(env, user.id);
    if (!h) fail('household_required', 409);
    const next = household({...h, recommendationStates: {...h.recommendationStates, [input.id]: input.state}});
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('UPDATE households SET payload=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(await seal(env, next, `household:${user.id}`), user.id),
      env.DB.prepare('INSERT INTO household_events(id,user_id,kind,payload) VALUES(?,?,?,?)').bind(id, user.id, 'recommendation', await seal(env, {recommendation: input.id, state: input.state}, `household_event:${user.id}:${id}`))
    ]);
    return json({household: next, overview: overview(next, today(env))});
  }
  return null;
}
