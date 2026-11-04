import test from 'node:test';
import assert from 'node:assert/strict';
import { mockApi } from '../src/lib/mockApi.js';
import { endpoints } from '../src/lib/endpoints.js';

test('mock mode supports study, palace and recall mutations through shared endpoint paths', async () => {
  const placesBefore = await mockApi.request('GET', endpoints.places.list());
  assert.equal(placesBefore.length, 2);

  const image = new Blob(['mock image'], { type: 'image/png' });
  const form = new FormData();
  form.append('name', 'Test corner');
  form.append('image', image, 'corner.png');
  const createdPlace = await mockApi.request('POST', endpoints.places.create(), form);
  assert.equal(createdPlace.name, 'Test corner');
  assert.match(createdPlace.imageUrl, /^data:image\/svg\+xml,/);

  const topic = await mockApi.request('POST', endpoints.topics.create(), { title: 'Test science', keyPoints: [] });
  const place = await mockApi.request('GET', endpoints.places.one(createdPlace.id));
  const flag = await mockApi.request('POST', endpoints.flags.create(), {
    placeId: place.id, x: 25, y: 60, title: 'Test idea', note: 'A mock flag',
  });
  assert.equal(flag.title, 'Test idea');
  const updated = await mockApi.request('PATCH', endpoints.flags.update(flag.id), { title: 'Updated idea' });
  assert.equal(updated.title, 'Updated idea');
  assert.equal((await mockApi.request('GET', endpoints.places.list())).find((item) => item.id === place.id)._count.flags, 1);

  const round = await mockApi.request('POST', endpoints.recall.start(), { time_limit_sec: 20 });
  const hidden = round.flags[0];
  assert.deepEqual(Object.keys(hidden).sort(), ['id', 'x', 'y']);
  const revealed = await mockApi.request('POST', endpoints.recall.reveal(round.roundId), { flag_id: hidden.id });
  assert.ok(revealed.title);
  await mockApi.request('POST', endpoints.recall.result(round.roundId), { flag_id: hidden.id, result: 'green', seconds_taken: 5 });
  const completed = await mockApi.request('POST', endpoints.recall.finish(round.roundId), {});
  assert.ok(completed.flags.some((item) => item.id === hidden.id));

  await mockApi.request('DELETE', endpoints.flags.remove(flag.id));
  await mockApi.request('DELETE', endpoints.places.remove(createdPlace.id));
  await mockApi.request('DELETE', endpoints.topics.one(topic.id));
});
