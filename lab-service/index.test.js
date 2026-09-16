const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, publishPubSubMessage } = require('./index');

async function withServer(app, run) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('publishes a JSON lab report', async () => {
  let received;
  const publisher = { topic: () => ({ publishMessage: async ({ data }) => {
    received = JSON.parse(data.toString());
    return 'message-1';
  }})};
  const id = await publishPubSubMessage({ id: 12 }, publisher);
  assert.equal(id, 'message-1');
  assert.deepEqual(received, { id: 12 });
});

test('accepts a lab report and returns 204', async () => {
  const publisher = { topic: () => ({ publishMessage: async () => 'message-2' }) };
  await withServer(createApp(publisher), async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 12 })
    });
    assert.equal(response.status, 204);
  });
});

test('rejects non-JSON requests', async () => {
  const publisher = { topic: () => ({ publishMessage: async () => 'message-3' }) };
  await withServer(createApp(publisher), async (baseUrl) => {
    const response = await fetch(baseUrl, { method: 'POST', body: 'not-json' });
    assert.equal(response.status, 415);
  });
});
