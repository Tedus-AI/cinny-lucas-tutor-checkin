const origin = 'https://tedus-ai.github.io';
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const headers = {'Cache-Control':'no-store','Vary':'Origin'};
    if (request.headers.get('Origin') === origin) headers['Access-Control-Allow-Origin'] = origin;
    const json = (value, status = 200) => Response.json(value, {status, headers});
    if (new URL(request.url).pathname !== '/api/sync') return json({error:'not_found'},404);
    if (request.method === 'OPTIONS') {
      return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
    }
    const supplied = request.headers.get('Authorization') || '';
    if (!env.TUTOR_KEY_HASH) return json({error:'unconfigured'},503);
    const a = await crypto.subtle.digest('SHA-256',encoder.encode(supplied));
    const b = Uint8Array.from(env.TUTOR_KEY_HASH.match(/../g), byte => parseInt(byte,16));
    if (!crypto.subtle.timingSafeEqual(a,b)) return json({error:'unauthorized'},401);
    try {
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT payload, revision FROM family_state WHERE id=1').first();
        return json({state:JSON.parse(row.payload),revision:row.revision});
      }
      if (request.method !== 'PUT') return json({error:'method'},405);
      const reader = request.body?.getReader();
      if (!reader) return json({error:'body'},400);
      const decoder = new TextDecoder();
      let size = 0, body = '';
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 524288) {await reader.cancel();return json({error:'too_large'},413);}
        body += decoder.decode(value,{stream:true});
      }
      let data;
      try {data = JSON.parse(body + decoder.decode());} catch {return json({error:'invalid_json'},400);}
      if (!Number.isSafeInteger(data?.revision) || data.revision < 0 || !data.state?.kids?.Cinny || !data.state?.kids?.Lucas) return json({error:'invalid_state'},400);
      const result = await env.DB.prepare('UPDATE family_state SET payload=?, revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(data.state),data.revision).run();
      return result.meta.changes ? json({revision:data.revision+1}) : json({error:'conflict'},409);
    } catch {
      console.error('Tutor sync failed');
      return json({error:'sync_failed'},503);
    }
  }
};

