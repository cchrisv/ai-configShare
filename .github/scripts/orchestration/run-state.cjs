const fs = require('fs');
const path = require('path');

function getRunStatePath(workItemId) {
  return path.join(process.cwd(), '.ai-artifacts', String(workItemId), 'run-state.json');
}

function ensureDirForWorkItem(workItemId) {
  const dir = path.join(process.cwd(), '.ai-artifacts', String(workItemId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadRunState(workItemId) {
  const file = getRunStatePath(workItemId);
  if (!fs.existsSync(file)) {
    return {
      workItemId,
      version: 1,
      currentPhase: null,
      phaseOrder: [],
      completedSteps: [],
      generationHistory: {},
      errors: [],
      metrics: { phases: {} },
      lastUpdated: new Date().toISOString()
    };
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data;
  } catch (e) {
    return {
      workItemId,
      version: 1,
      loadError: e.message,
      completedSteps: [],
      errors: [],
      generationHistory: {},
      metrics: { phases: {} },
      lastUpdated: new Date().toISOString()
    };
  }
}

function saveRunState(state) {
  state.lastUpdated = new Date().toISOString();
  const file = getRunStatePath(state.workItemId);
  ensureDirForWorkItem(state.workItemId);
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

module.exports = { loadRunState, saveRunState };
