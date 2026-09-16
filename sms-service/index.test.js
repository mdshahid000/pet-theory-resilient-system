const test = require('node:test');
const assert = require('node:assert/strict');
const { app, decodeBase64Json } = require('./index');

function pubsubPayload(report) {
  return { message: { data: Buffer.from(JSON.stringify(report)).toString('base64') } };
}

async function withServer(run) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('decodes Pub/Sub base64 JSON', () => {
  const encoded = Buffer.from(JSON.stringify({ id: 56 })).toString('base64');
  assert.deepEqual(decodeBase64Json(encoded), { id: 56 });
});

test('acknowledges a valid Pub/Sub push request', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pubsubPayload({ id: 56 }))
    });
    assert.equal(response.status, 204);
  });
});

test('returns 500 for an invalid Pub/Sub request so Pub/Sub retries', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: {} })
    });
    assert.equal(response.status, 500);
  });
});
