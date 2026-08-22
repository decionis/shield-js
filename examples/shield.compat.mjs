export async function attempt({ request, shield, execute }) {
  let decision = await shield.authorize(request);
  if (decision.verdict === "ASK") {
    decision = await shield.requestApproval(decision.decisionId);
  }
  if (decision.verdict === "ALLOW") {
    await execute({ request, decisionId: decision.decisionId });
  }
}
