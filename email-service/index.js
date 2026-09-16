const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(bodyParser.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.post('/', async (req, res) => {
  let labReport;
  try {
    labReport = decodeBase64Json(req.body?.message?.data);
    console.log(`Email Service: Report ${labReport.id} trying...`);
    await sendEmail(labReport);
    console.log(`Email Service: Report ${labReport.id} success :-)`);
    return res.status(204).send();
  } catch (error) {
    const reportId = labReport?.id ?? 'unknown';
    console.error(`Email Service: Report ${reportId} failure:`, error);
    return res.status(500).send();
  }
});

function decodeBase64Json(data) {
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Pub/Sub message.data is required');
  }
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
}

async function sendEmail(labReport) {
  console.log(`Sending email for report ${labReport.id}`);
}

if (require.main === module) {
  app.listen(port, () => console.log(`Email Service listening on port ${port}`));
}

module.exports = { app, decodeBase64Json, sendEmail };
