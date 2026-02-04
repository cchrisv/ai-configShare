const fs = require('fs');
const path = require('path');

function getLogPath(workItemId) {
  const dir = path.join(process.cwd(), '.ai-artifacts', String(workItemId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'run-log.ndjson');
}

function logEvent(workItemId, event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
  fs.appendFileSync(getLogPath(workItemId), line + '\n');
}

module.exports = { logEvent };
