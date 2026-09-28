// Mode: Run Once for All Items
const e = $input.first().json;
const workflowName = e.workflow?.name ?? '-';
const text = [
  ':rotating_light: *Workflow-Fehler*',
  `*Workflow:* ${workflowName}`,
  `*Node:* ${e.execution?.lastNodeExecuted ?? e.trigger?.error?.node?.name ?? '-'}`,
  `*Fehler:* ${e.execution?.error?.message ?? e.trigger?.error?.message ?? 'unbekannt'}`,
  e.execution?.error?.description ? `*Details:* ${e.execution.error.description}` : null,
  e.execution?.url ? `*Execution:* ${e.execution.url}` : null,
  /RFQ/i.test(workflowName) ? 'Die betroffene E-Mail bleibt ungelesen und muss manuell bearbeitet werden.' : null,
].filter(Boolean).join('\n');
return [{ json: { slackText: text } }];
