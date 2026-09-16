const { PubSub } = require('@google-cloud/pubsub');
const express = require('express');
const bodyParser = require('body-parser');

const port = Number(process.env.PORT) || 8080;
const topicName = process.env.PUBSUB_TOPIC || 'new-lab-report';
const pubsub = new PubSub();

function createApp(publisher = pubsub) {
  const app = express();
  app.use(bodyParser.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.post('/', async (req, res) => {
    try {
      if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Request body must be a JSON object' });
      }
      const messageId = await publishPubSubMessage(req.body, publisher);
      console.log(`Published lab report to ${topicName}: ${messageId}`);
      return res.status(204).send();
    } catch (error) {
      console.error('Failed to publish lab report:', error);
      return res.status(500).json({ error: 'Unable to publish lab report' });
    }
  });
  return app;
}

async function publishPubSubMessage(labReport, publisher = pubsub) {
  const buffer = Buffer.from(JSON.stringify(labReport));
  return publisher.topic(topicName).publishMessage({ data: buffer });
}

if (require.main === module) {
  createApp().listen(port, () => console.log(`Lab Report Service listening on port ${port}`));
}

module.exports = { app: createApp(), createApp, publishPubSubMessage };
