import type { ActionRisk } from "../types.js";

export function requiresApproval(risk: ActionRisk): boolean {
  return risk !== "read";
}
