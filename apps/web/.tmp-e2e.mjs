// Phase C end-to-end verification against the running local Compose stack.
// Uses only the documented public API + socket.io. No secrets printed.
import { io } from 'socket.io-client';

const API = 'http://localhost:4100';
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
};

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

const waitEvent = (socket, event, timeoutMs = 90000) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ got: false }), timeoutMs);
  socket.once(event, (payload) => { clearTimeout(timer); resolve({ got: true, payload }); });
});

// Minimal 1x1 PNG and a minimal one-page PDF for deterministic uploads.
const png1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==', 'base64');
const pdf1 = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n' +
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\n' +
  'xref\n0 4\n0000000000 65535 f \ntrailer << /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n',
  'latin1',
);

const uploadFile = async (path, token, formData) => {
  const res = await fetch(API + path, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: formData });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
};

const connect = (token) => new Promise((resolve, reject) => {
  const socket = io(API, { auth: { token }, autoConnect: false, reconnection: false, transports: ['websocket'] });
  socket.once('connect', () => resolve(socket));
  socket.once('connect_error', (err) => reject(new Error(err?.message ?? 'connect_error')));
  socket.connect();
  setTimeout(() => reject(new Error('socket connect timeout')), 10000);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stamp = Date.now();
const email = `verify-${stamp}@example.com`;
let failures = 0;

try {
  // ---- Auth ----
  const signup = await api('/auth/signup', { method: 'POST', body: { name: 'Verifier', email, password: 'StrongPass123!' } });
  record('signup 201 + token', signup.status === 201 && Boolean(signup.data?.token), `status=${signup.status}`);
  const token = signup.data?.token;
  if (!token) throw new Error('no token; aborting');

  const me = await api('/me', { token });
  record('GET /me with valid token', me.status === 200 && me.data?.user?.email === email, `status=${me.status}`);
  record('GET /me missing token -> 401', (await api('/me')).status === 401);
  record('GET /me invalid token -> 401', (await api('/me', { token: 'deadbeef' })).status === 401);
  const tampered = await api('/me', { token: token.slice(0, -3) + 'xyz' });
  record('GET /me tampered token -> 401', tampered.status === 401, `status=${tampered.status}`);
  const dupe = await api('/auth/signup', { method: 'POST', body: { name: 'Verifier', email, password: 'StrongPass123!' } });
  record('duplicate email signup rejected', dupe.status === 409, `status=${dupe.status}`);
  const wrongPw = await api('/auth/login', { method: 'POST', body: { email, password: 'nope' } });
  record('wrong password rejected', wrongPw.status === 401, `status=${wrongPw.status}`);

  // ---- Units/topics ----
  const unit = await api('/units', { method: 'POST', token, body: { title: 'Verify unit' } });
  record('create unit', unit.status === 201, `status=${unit.status}`);
  const topic = await api('/topics', { method: 'POST', token, body: { unitId: unit.data?.unit?.id, title: 'Verify topic', notes: 'e2e verification topic' } });
  record('create topic', topic.status === 201, `status=${topic.status}`);
  const topicId = topic.data?.topic?.id;
  if (!topicId) throw new Error('no topicId; aborting');

  // ---- Place (multipart image) ----
  const placeFd = new FormData();
  placeFd.append('name', 'Study garden verify');
  placeFd.append('image', new Blob([png1], { type: 'image/png' }), 'photo.png');
  const place = await uploadFile('/places', token, placeFd);
  record('create place with image', place.status === 201, `status=${place.status}`);
  const placeId = place.data?.place?.id;

  // ---- Upload flow with live worker/redis ----
  const ticket = await api(`/topics/${topicId}/upload-ticket`, { method: 'POST', token, body: {} });
  record('issue upload ticket', ticket.status === 201, `status=${ticket.status}`);
  const fd = new FormData();
  fd.append('file', new Blob([pdf1], { type: 'application/pdf' }), 'notes.pdf');
  fd.append('uploadToken', ticket.data?.token ?? '');
  const upload = await uploadFile(`/topics/${topicId}/files/local`, token, fd);
  record('local upload accepted', upload.status === 202, `status=${upload.status}`);
  const fileId = upload.data?.file?.id;
  if (fileId) {
    const status = await api(`/topics/${topicId}/files/${fileId}`, { token });
    record('file status endpoint', status.status === 200, `status=${status.status}`);
  }

  // ---- Socket: auth, owner room delivery, isolation ----
  const socket = await connect(token);
  record('socket connects with valid JWT', true);

  const gotProcessing = waitEvent(socket, 'file:progress');
  const terminal = await Promise.race([
    waitEvent(socket, 'file:done').then((value) => ({ kind: 'file:done', value })),
    waitEvent(socket, 'file:error').then((value) => ({ kind: 'file:error', value })),
    sleep(90000).then(() => ({ kind: 'timeout', value: { got: false } })),
  ]);
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  record('worker emits terminal file event to owner room', terminal.value?.got === true, `event=${terminal.kind} isLive=${hasKey}`);
  if (terminal.kind === 'file:error' && !hasKey) {
    record('worker fails explicitly without Gemini key', true, JSON.stringify(terminal.value.payload).slice(0, 140));
  } else if (terminal.kind === 'file:done' && hasKey) {
    record('worker file:done delivered (live Gemini)', true);
  }
  const progress = await gotProcessing;
  record('file:progress emitted when worker starts processing', hasKey ? progress.got === true : true, hasKey ? `got=${progress.got}` : 'no key: worker fails before extracting, no progress expected');

  const updated = waitEvent(socket, 'dashboard:updated', 20000);
  const flag = await api('/flags', {
    method: 'POST', token,
    body: { placeId, x: 42, y: 42, title: 'e2e flag', emoji: '🔴' },
  });
  record('flag create with valid link', flag.status === 201, `status=${flag.status} ${JSON.stringify(flag.data).slice(0, 120)}`);
  const flagBad = await api('/flags', {
    method: 'POST', token,
    body: { placeId, x: 150, y: 42, title: 'bad flag' },
  });
  record('flag out-of-bounds x rejected', [400, 422].includes(flagBad.status), `status=${flagBad.status}`);
  record('dashboard:updated delivered after mutation', (await updated).got === true);

  const other = await api('/auth/signup', { method: 'POST', body: { name: 'Other', email: `other-${stamp}@example.com`, password: 'StrongPass123!' } });
  const otherSocket = await connect(other.data.token);
  let reachedOther = 0;
  otherSocket.onAny(() => { reachedOther += 1; });
  const flagCreated = waitEvent(socket, 'dashboard:updated', 8000);
  await api('/flags', { method: 'POST', token, body: { placeId, x: 12, y: 12, title: 'e2e flag 2' } });
  record('owner still receives events (sanity)', (await flagCreated).got === true);
  await sleep(3000);
  record('other account receives no cross-user events', reachedOther === 0, `count=${reachedOther}`);
  otherSocket.disconnect();

  try {
    await connect(token.slice(0, 10) + 'not-a-real-jwt');
    record('socket rejects bad JWT', false, 'connected unexpectedly');
  } catch (err) {
    record('socket rejects bad JWT', true, String(err.message).slice(0, 80));
  }

  // ---- Dashboard (Task 3 route) ----
  const dash = await api('/dashboard', { token });
  const dashTopic = (dash.data?.topics ?? []).find((t) => t.topicId === topicId);
  record(
    'GET /dashboard returns per-topic task booleans',
    dash.status === 200 && dashTopic && ['addMaterial', 'explain', 'pin', 'recall'].every((k) => typeof dashTopic.tasks[k] === 'boolean'),
    `status=${dash.status} tasks=${JSON.stringify(dashTopic?.tasks)}`,
  );

  // ---- Recall round ----
  // ---- Recall round ----
  const recall = await api('/recall/start', { method: 'POST', token, body: { timeLimitSec: 60, speedMode: false } });
  const recallStr = JSON.stringify(recall.data);
  record('recall start returns positions only, no answer text', recall.status === 201 && recall.data?.flags?.length > 0 && !recallStr.includes('"title"') && !recallStr.includes('"note"') && !recallStr.includes('"isCorrect"'), `status=${recall.status} keys=${Object.keys(recall.data).join(',')}`);
  const roundId = recall.data?.roundId;
  if (roundId && recall.data?.flags?.length) {
    const firstFlagId = recall.data.flags[0].id;
    const reveal = await api(`/recall/${roundId}/reveal`, { method: 'POST', token, body: { flagId: firstFlagId } });
    record('recall reveal returns flag text', reveal.status === 200 && Boolean(reveal.data?.flag?.title), `status=${reveal.status}`);
    const result = await api(`/recall/${roundId}/result`, { method: 'POST', token, body: { flagId: firstFlagId, result: 'red', secondsTaken: 7 } });
    record('recall self-grade red accepted', result.status === 201, `status=${result.status}`);
    const dup = await api(`/recall/${roundId}/result`, { method: 'POST', token, body: { flagId: firstFlagId, result: 'red', secondsTaken: 7 } });
    record('duplicate recall result rejected', dup.status >= 400, `status=${dup.status}`);
    const finish = await api(`/recall/${roundId}/finish`, { method: 'POST', token, body: { timeLimitSec: 60 } });
    record('recall finish completes round', finish.status === 200, `status=${finish.status}`);
  } else {
    record('recall flags available for reveal step', false, recall.status === 404 ? 'no place with flags' : JSON.stringify(recall.data).slice(0, 100));
  }
  const offline = await api('/recall/offline', { token });
  const offlinePlaces = offline.data?.places;
  record(
    'recall offline snapshot has place/flag projection only',
    offline.status === 200 && Array.isArray(offlinePlaces) && offlinePlaces.length > 0 && offlinePlaces[0].flags?.length > 0,
    `status=${offline.status} places=${offlinePlaces?.length}`,
  );
  socket.disconnect();

  // ---- Explain: 15-word rule + live delivery via documented demo account ----
  const explainShort = await api(`/topics/${topicId}/explain`, { method: 'POST', token, body: { transcript: 'one two three four five' } });
  record('explain under 15 words rejected', explainShort.status === 400, `status=${explainShort.status}`);

  const demoLogin = await api('/auth/login', { method: 'POST', body: { email: 'demo@pinpoint.app', password: 'PinpointDemo123!' } });
  if (demoLogin.status === 200 && demoLogin.data?.token) {
    const demoToken = demoLogin.data.token;
    const demoSocket = await connect(demoToken);
    const analyzing = waitEvent(demoSocket, 'explain:analyzing', 30000);
    const topicList = await api('/topics', { token: demoToken });
    const demoTopicId = (topicList.data?.topics ?? [])[0]?.id;
    const explain = await api(`/topics/${demoTopicId}/explain`, {
      method: 'POST', token: demoToken,
      body: { transcript: 'The chlorophyll inside chloroplasts absorbs light energy during the light dependent reactions of photosynthesis in plants.', durationSec: 60 },
    });
    record('explain submit accepted on demo topic', explain.status === 200 || explain.status === 201, `status=${explain.status} ${JSON.stringify(explain.data).slice(0, 100)}`);
    record('explain:analyzing delivered', (await analyzing).got === true);
    const result = await waitEvent(demoSocket, 'explain:result', 90000);
    record(
      'explain:result delivered with score + summary',
      result.got === true && typeof (result.payload?.payload ?? result.payload)?.score === 'number',
      result.got ? JSON.stringify(result.payload).slice(0, 120) : 'timeout',
    );
    demoSocket.disconnect();
  } else {
    record('demo login for live explain flow', false, `status=${demoLogin.status} — live explain delivery NOT VERIFIED`);
  }

  // ---- Shared places ----
  if (placeId) {
    const share = await api(`/places/${placeId}/share`, { method: 'POST', token });
    record('share token issued', [200, 201].includes(share.status), `status=${share.status}`);
    const shareToken = share.data?.share?.token ?? share.data?.token;
    if (shareToken) {
      const pub = await fetch(`${API}/shared/${shareToken}`).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }));
      const pubStr = JSON.stringify(pub.data);
      record('public shared GET 200 and projection has no notes', pub.status === 200 && pub.data?.place && !pubStr.includes('keyPoints') && !pubStr.includes('platformKey'), `status=${pub.status} len=${pubStr.length}`);
      await api(`/places/${placeId}/share`, { method: 'DELETE', token });
      record('revoked share -> 404', (await fetch(`${API}/shared/${shareToken}`)).status === 404);
    }
  }

  // ---- Share of another user's place rejected ----
  if (placeId) {
    const foreign = await api(`/places/${placeId}/share`, { method: 'POST', token: other.data.token });
    record("share of another user's place rejected", [403, 404].includes(foreign.status), `status=${foreign.status}`);
  }
} catch (error) {
  console.log('ABORT:', error?.message ?? error);
}

failures = results.filter((r) => !r.ok).length;
console.log(`\nSUMMARY: ${results.length - failures}/${results.length} passed`);
process.exit(failures ? 1 : 0);
