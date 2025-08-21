/**
 * decision-trail - Track and audit decision trees in your applications
 * 
 * @example
 * ```typescript
 * import { DecisionTracker } from 'decision-trail';
 * 
 * const tracker = new DecisionTracker('process-123', {
 *   version: '1.0.0',
 *   environment: 'production'
 * });
 * 
 * const result = await tracker.trackApiCall(
 *   'Fetch user data',
 *   () => api.getUser(userId),
 *   '/api/users/:id'
 * );
 * 
 * const trace = tracker.finalize('completed');
 * console.log(tracker.toJSON());
 * ```
 */

export { DecisionTracker } from './DecisionTracker';
export { printDecisionTree, toMermaidFlowchart } from './utils';
export type { 
  DecisionNode, 
  DecisionTrace, 
  DecisionTrackerConfig 
} from './types';