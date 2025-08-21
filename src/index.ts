/**
 * decision-trail - Track and audit decision trees in your applications
 *
 * @example
 * ```typescript
 * import { DecisionTrail } from 'decision-trail';
 *
 * const trail = new DecisionTrail('process-123', {
 *   version: '1.0.0',
 *   environment: 'production'
 * });
 *
 * const result = await trail.trackApiCall(
 *   'Fetch user data',
 *   () => api.getUser(userId),
 *   '/api/users/:id'
 * );
 *
 * const trace = trail.finalize('completed');
 * console.log(trail.toJSON());
 * ```
 */

export { DecisionTrail } from "./DecisionTrail";
export type { DecisionNode, DecisionTrace, DecisionTrailConfig } from "./types";
export { printDecisionTree, toMermaidFlowchart } from "./utils";
