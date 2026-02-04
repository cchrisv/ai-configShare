const fs = require('fs');
const path = require('path');
const { loadRunState, saveRunState } = require('./run-state');
const { logEvent } = require('./logging');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadWorkflowConfig() {
  const workflowPath = path.join(process.cwd(), '.ai-config', 'config', 'templatized-workflow.json');
  return fs.existsSync(workflowPath) ? loadJSON(workflowPath) : null;
}

function loadStepManifests() {
  const manifestsPath = path.join(process.cwd(), '.ai-config', 'config', 'step-manifests.json');
  return fs.existsSync(manifestsPath) ? loadJSON(manifestsPath) : null;
}

function loadResearchOrchestrationConfig() {
  const configPath = path.join(process.cwd(), '.ai-config', 'config', 'research-orchestration.json');
  return fs.existsSync(configPath) ? loadJSON(configPath) : null;
}

function loadIterationState(workItemId) {
  const iterationStatePath = path.join(process.cwd(), '.ai-artifacts', String(workItemId), 'research', 'research-iteration-state.json');
  if (!fs.existsSync(iterationStatePath)) {
    return {
      current_pass: 0,
      global_clue_register: {
        keywords: [],
        entities: [],
        contradictions: [],
        gaps: [],
        questions: []
      },
      sub_phase_status: {},
      feedback_loops_executed: [],
      total_loop_count: 0
    };
  }
  return loadJSON(iterationStatePath);
}

function saveIterationState(workItemId, iterationState) {
  const researchDir = path.join(process.cwd(), '.ai-artifacts', String(workItemId), 'research');
  if (!fs.existsSync(researchDir)) {
    fs.mkdirSync(researchDir, { recursive: true });
  }
  const iterationStatePath = path.join(researchDir, 'research-iteration-state.json');
  fs.writeFileSync(iterationStatePath, JSON.stringify(iterationState, null, 2));
}

function evaluateFeedbackLoops(workItemId, subPhase) {
  // This function would evaluate the artifact from the sub-phase
  // to determine if revisits are needed
  // In practice, this would read the artifact and check feedback_loop_decisions
  const artifactPath = path.join(process.cwd(), '.ai-artifacts', String(workItemId), 'research');
  const artifactFiles = {
    'organization_dictionary': '00-organization-dictionary.json',
    'ado': '01-ado-workitem.json',
    'wiki': '02-wiki-search.json',
    'business_context': '03-business-context.json',
    'salesforce': '04-salesforce-metadata.json',
    'code': '05-code-search.json',
    'web': '06-web-research.json',
    'context7': '07-context7-libraries.json',
    'similar_workitems': '08-similar-workitems.json'
  };
  
  const artifactFile = path.join(artifactPath, artifactFiles[subPhase] || '');
  if (!fs.existsSync(artifactFile)) {
    return { revisitsNeeded: [], researchComplete: false };
  }
  
  try {
    const artifact = loadJSON(artifactFile);
    const revisitsNeeded = artifact.feedback_loop_decisions || [];
    const researchComplete = artifact.research_complete === true;
    return { revisitsNeeded, researchComplete };
  } catch (e) {
    logEvent(workItemId, { phase: 'research', subPhase, error: `Failed to evaluate feedback loops: ${e.message}` });
    return { revisitsNeeded: [], researchComplete: false };
  }
}

function executeRevisits(workItemId, revisitsNeeded, iterationState, orchestrationConfig) {
  const maxLoopsPerSubphase = orchestrationConfig?.iteration_limits?.max_loops_per_subphase || 3;
  const maxTotalLoops = orchestrationConfig?.iteration_limits?.max_total_loops || 10;
  
  if (iterationState.total_loop_count >= maxTotalLoops) {
    logEvent(workItemId, { 
      phase: 'research', 
      warning: `Max total loops (${maxTotalLoops}) reached. Skipping revisits.` 
    });
    return iterationState;
  }
  
  for (const revisit of revisitsNeeded) {
    if (iterationState.total_loop_count >= maxTotalLoops) break;
    
    const targetSubPhase = revisit.target_step?.replace('research.', '') || '';
    if (!targetSubPhase) continue;
    
    // Check revisit count for this target
    const revisitCount = (iterationState.feedback_loops_executed || [])
      .filter(loop => loop.to === targetSubPhase).length;
    
    if (revisitCount >= (orchestrationConfig?.iteration_limits?.max_revisits_per_target || 2)) {
      logEvent(workItemId, { 
        phase: 'research', 
        warning: `Max revisits to ${targetSubPhase} reached. Skipping.` 
      });
      continue;
    }
    
    logEvent(workItemId, { 
      phase: 'research', 
      action: 'executing_revisit',
      from: revisit.from || 'unknown',
      to: targetSubPhase,
      reason: revisit.reason || revisit.trigger
    });
    
    // Execute the revisit by running the target sub-phase
    // Note: In practice, this would need to run specific steps from the sub-phase
    // with focused investigation questions
    runPhase(workItemId, `research.${targetSubPhase}`, {});
    
    iterationState.total_loop_count++;
    iterationState.feedback_loops_executed.push({
      from: revisit.from || 'unknown',
      to: targetSubPhase,
      reason: revisit.reason || revisit.trigger,
      timestamp: new Date().toISOString()
    });
  }
  
  return iterationState;
}

function runResearchPhaseIteratively(workItemId, options = {}) {
  const orchestrationConfig = loadResearchOrchestrationConfig();
  let iterationState = loadIterationState(workItemId);
  
  const researchSubPhases = [
    'organization_dictionary',
    'ado',
    'wiki',
    'business_context',
    'salesforce',
    'code',
    'web',
    'context7',
    'similar_workitems'
  ];
  
  logEvent(workItemId, { phase: 'research', status: 'start_iterative' });
  
  for (const subPhase of researchSubPhases) {
    let subPhaseComplete = false;
    let loopCount = 0;
    const maxLoopsPerSubphase = orchestrationConfig?.iteration_limits?.max_loops_per_subphase || 3;
    
    // Initialize sub-phase status if not exists
    if (!iterationState.sub_phase_status[subPhase]) {
      iterationState.sub_phase_status[subPhase] = {
        passes: 0,
        complete: false,
        revisited_by: []
      };
    }
    
    while (!subPhaseComplete && loopCount < maxLoopsPerSubphase) {
      iterationState.sub_phase_status[subPhase].passes++;
      iterationState.current_pass = iterationState.sub_phase_status[subPhase].passes;
      
      logEvent(workItemId, { 
        phase: 'research', 
        subPhase, 
        pass: iterationState.sub_phase_status[subPhase].passes,
        status: 'executing' 
      });
      
      // Run the sub-phase
      runPhase(workItemId, `research.${subPhase}`, options);
      
      // Evaluate feedback loops
      const decision = evaluateFeedbackLoops(workItemId, subPhase);
      
      if (decision.revisitsNeeded.length > 0 && loopCount < maxLoopsPerSubphase) {
        logEvent(workItemId, { 
          phase: 'research', 
          subPhase, 
          revisitsNeeded: decision.revisitsNeeded.length,
          status: 'executing_revisits' 
        });
        
        iterationState = executeRevisits(workItemId, decision.revisitsNeeded, iterationState, orchestrationConfig);
        loopCount++;
        
        // Mark which sub-phases revisited this one
        decision.revisitsNeeded.forEach(revisit => {
          const revisitingSubPhase = revisit.from?.replace('research.', '') || 'unknown';
          if (!iterationState.sub_phase_status[subPhase].revisited_by.includes(revisitingSubPhase)) {
            iterationState.sub_phase_status[subPhase].revisited_by.push(revisitingSubPhase);
          }
        });
      } else {
        subPhaseComplete = decision.researchComplete || loopCount >= maxLoopsPerSubphase;
        if (subPhaseComplete) {
          iterationState.sub_phase_status[subPhase].complete = true;
        }
      }
      
      // Save iteration state after each pass
      saveIterationState(workItemId, iterationState);
    }
    
    if (!subPhaseComplete && loopCount >= maxLoopsPerSubphase) {
      logEvent(workItemId, { 
        phase: 'research', 
        subPhase, 
        warning: `Max loops (${maxLoopsPerSubphase}) reached for sub-phase. Proceeding with documented gaps.` 
      });
      iterationState.sub_phase_status[subPhase].complete = true;
    }
  }
  
  logEvent(workItemId, { phase: 'research', status: 'end_iterative', total_loops: iterationState.total_loop_count });
  saveIterationState(workItemId, iterationState);
  
  return iterationState;
}

function resolvePhaseOrder(workflow) {
  if (!workflow) return [];
  if (Array.isArray(workflow.execution_order)) return workflow.execution_order;
  if (Array.isArray(workflow.phases)) return workflow.phases.map(p => p.id || p);
  return [];
}

function getPhaseSteps(manifests, phase) {
  if (!manifests) return [];
  const phaseDef = manifests.phases && manifests.phases[phase];
  if (!phaseDef) return [];
  if (Array.isArray(phaseDef.steps)) return phaseDef.steps;
  const allSteps = [];
  Object.values(phaseDef).forEach(group => {
    if (group && Array.isArray(group.steps)) {
      allSteps.push(...group.steps);
    }
  });
  return allSteps;
}

function isDeterministic(step) {
  return step.type === 'execution';
}

function runStep(workItemId, state, phase, step) {
  const start = Date.now();
  const skipped = isDeterministic(step) && state.completedSteps.includes(step.id);
  if (skipped) {
    logEvent(workItemId, { phase, step: step.id, status: 'skipped' });
    return { skipped: true };
  }
  logEvent(workItemId, { phase, step: step.id, status: 'running' });
  if (isDeterministic(step)) {
    state.completedSteps.push(step.id);
  } else {
    if (!state.generationHistory[step.id]) state.generationHistory[step.id] = [];
    state.generationHistory[step.id].push({ timestamp: new Date().toISOString(), hash: Math.random().toString(36).slice(2), durationMs: Date.now() - start });
  }
  logEvent(workItemId, { phase, step: step.id, status: 'completed', durationMs: Date.now() - start });
  return { skipped: false };
}

function runPhase(workItemId, phase, options = {}) {
  const workflow = loadWorkflowConfig();
  const manifests = loadStepManifests();
  const state = loadRunState(workItemId);
  if (!Array.isArray(state.completedSteps)) state.completedSteps = [];
  if (!state.generationHistory || typeof state.generationHistory !== 'object') state.generationHistory = {};
  const phaseOrder = resolvePhaseOrder(workflow);
  state.phaseOrder = phaseOrder;

  if (!phaseOrder.includes(phase)) throw new Error(`Unknown phase: ${phase}`);

  state.currentPhase = phase;
  logEvent(workItemId, { phase, status: 'start' });
  const steps = getPhaseSteps(manifests, phase);
  for (const step of steps) {
    if (!isDeterministic(step) && options.noRegenerate) {
      logEvent(workItemId, { phase, step: step.id, status: 'generation-suppressed' });
      continue;
    }
    runStep(workItemId, state, phase, step);
  }
  logEvent(workItemId, { phase, status: 'end' });
  saveRunState(state);
  return state;
}

function runWorkflow(workItemId, options = {}) {
  const workflow = loadWorkflowConfig();
  if (!workflow) throw new Error('Workflow config missing');
  const phases = resolvePhaseOrder(workflow);
  let state;
  for (const phase of phases) {
    state = runPhase(workItemId, phase, options);
  }
  return state;
}

function resumeWorkflow(workItemId, options = {}) {
  const state = loadRunState(workItemId);
  const workflow = loadWorkflowConfig();
  const phases = resolvePhaseOrder(workflow);
  const currentIndex = state.currentPhase ? phases.indexOf(state.currentPhase) : -1;
  const startIndex = currentIndex === -1 ? 0 : currentIndex;
  let finalState = state;
  for (let i = startIndex; i < phases.length; i++) {
    finalState = runPhase(workItemId, phases[i], options);
  }
  return finalState;
}

function getStatus(workItemId) {
  const state = loadRunState(workItemId);
  return {
    workItemId: state.workItemId,
    currentPhase: state.currentPhase,
    completedStepsCount: state.completedSteps.length,
    phases: state.phaseOrder,
    errors: state.errors,
    generationStepsRun: Object.keys(state.generationHistory).length,
    lastUpdated: state.lastUpdated
  };
}

module.exports = { 
  runWorkflow, 
  runPhase, 
  resumeWorkflow, 
  getStatus,
  runResearchPhaseIteratively,
  evaluateFeedbackLoops,
  executeRevisits,
  loadIterationState,
  saveIterationState
};
