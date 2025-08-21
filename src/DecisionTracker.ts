import { DecisionNode, DecisionTrace, DecisionTrackerConfig } from './types';

/**
 * DecisionTracker - Track and audit decision trees in your applications
 * 
 * @example
 * ```typescript
 * const tracker = new DecisionTracker('order-123', {
 *   version: '1.0.0',
 *   environment: 'production'
 * });
 * 
 * const isValid = tracker.evaluateCondition(
 *   'Validate order',
 *   () => order.amount > 0,
 *   { amount: order.amount }
 * );
 * 
 * const result = await tracker.trackApiCall(
 *   'Process payment',
 *   () => paymentService.charge(order.amount),
 *   '/api/payments/charge'
 * );
 * 
 * const trace = tracker.finalize('completed');
 * ```
 */
export class DecisionTracker {
  private trace: DecisionTrace;
  private currentNode: DecisionNode;
  private nodeStack: DecisionNode[] = [];
  private nodeCounter = 0;

  /**
   * Create a new DecisionTracker
   * @param processId - Unique identifier for the process being tracked
   * @param config - Configuration options
   */
  constructor(processId: string, config: DecisionTrackerConfig) {
    const rootNode: DecisionNode = {
      id: 'root',
      type: 'condition',
      description: `Processing ${processId}`,
      timestamp: new Date(),
      inputs: { processId },
      children: [],
    };

    this.trace = {
      processId,
      startTime: new Date(),
      rootDecision: rootNode,
      metadata: {
        version: config.version,
        environment: config.environment,
        user: config.user,
        ...config.metadata,
      },
    };

    this.currentNode = rootNode;
  }

  /**
   * Add a decision and return a new tracker for that branch
   * @param type - Type of decision
   * @param description - Human-readable description
   * @param inputs - Input parameters
   * @param metadata - Additional metadata
   * @returns New DecisionTracker for this branch
   */
  addDecision(
    type: DecisionNode['type'],
    description: string,
    inputs: Record<string, any> = {},
    metadata?: DecisionNode['metadata']
  ): DecisionTracker {
    const node: DecisionNode = {
      id: `node_${++this.nodeCounter}`,
      type,
      description,
      timestamp: new Date(),
      inputs,
      children: [],
      metadata,
    };

    this.currentNode.children.push(node);
    
    const branchTracker = Object.create(DecisionTracker.prototype);
    branchTracker.trace = this.trace;
    branchTracker.currentNode = node;
    branchTracker.nodeStack = [...this.nodeStack, this.currentNode];
    branchTracker.nodeCounter = this.nodeCounter;

    return branchTracker;
  }

  /**
   * Set the result of the current decision
   * @param result - Result value
   * @param metadata - Additional metadata to merge
   */
  setResult(result: any, metadata?: Partial<DecisionNode['metadata']>): void {
    this.currentNode.result = result;
    if (metadata) {
      this.currentNode.metadata = { ...this.currentNode.metadata, ...metadata };
    }
  }

  /**
   * Go back to parent decision (useful for complex branching)
   * @returns Parent DecisionTracker or null if at root
   */
  goToParent(): DecisionTracker | null {
    if (this.nodeStack.length === 0) return null;

    const branchTracker = Object.create(DecisionTracker.prototype);
    branchTracker.trace = this.trace;
    branchTracker.currentNode = this.nodeStack[this.nodeStack.length - 1];
    branchTracker.nodeStack = this.nodeStack.slice(0, -1);
    branchTracker.nodeCounter = this.nodeCounter;

    return branchTracker;
  }

  /**
   * Track any asynchronous operation with automatic timing and error handling
   * @param type - Type of decision
   * @param description - Description of the operation
   * @param operation - Async function to execute
   * @param inputs - Input parameters
   * @param metadata - Additional metadata
   * @returns Promise resolving to the operation result
   */
  async trackAsync<T>(
    type: DecisionNode['type'],
    description: string,
    operation: () => Promise<T>,
    inputs: Record<string, any> = {},
    metadata: DecisionNode['metadata'] = {}
  ): Promise<T> {
    const startTime = Date.now();
    const tracker = this.addDecision(type, description, inputs, metadata);
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      tracker.setResult(result, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      tracker.setResult(null, { 
        duration_ms: duration, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Track any synchronous operation with automatic timing and error handling
   * @param type - Type of decision
   * @param description - Description of the operation
   * @param operation - Sync function to execute
   * @param inputs - Input parameters
   * @param metadata - Additional metadata
   * @returns The operation result
   */
  trackSync<T>(
    type: DecisionNode['type'],
    description: string,
    operation: () => T,
    inputs: Record<string, any> = {},
    metadata: DecisionNode['metadata'] = {}
  ): T {
    const startTime = Date.now();
    const tracker = this.addDecision(type, description, inputs, metadata);
    
    try {
      const result = operation();
      const duration = Date.now() - startTime;
      tracker.setResult(result, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      tracker.setResult(null, { 
        duration_ms: duration, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Track an API call
   * @param description - Description of the API call
   * @param apiCall - Function making the API call
   * @param endpoint - API endpoint being called
   * @returns Promise resolving to the API response
   */
  async trackApiCall<T>(
    description: string,
    apiCall: () => Promise<T>,
    endpoint?: string
  ): Promise<T> {
    return this.trackAsync('api_call', description, apiCall, {}, { api_endpoint: endpoint });
  }

  /**
   * Evaluate a boolean condition
   * @param description - Description of the condition
   * @param condition - Function returning boolean
   * @param inputs - Input parameters
   * @returns Boolean result
   */
  evaluateCondition(
    description: string,
    condition: () => boolean,
    inputs: Record<string, any> = {}
  ): boolean {
    return this.trackSync('condition', description, condition, inputs);
  }

  /**
   * Track a database query
   * @param description - Description of the query
   * @param query - Function executing the query
   * @param queryInfo - Additional query metadata
   * @returns Promise resolving to query result
   */
  async trackDbQuery<T>(
    description: string,
    query: () => Promise<T>,
    queryInfo?: { table?: string; operation?: string }
  ): Promise<T> {
    return this.trackAsync('data_lookup', description, query, {}, { 
      ...queryInfo,
      api_endpoint: queryInfo?.table ? `db://${queryInfo.table}` : undefined
    });
  }

  /**
   * Track a file operation
   * @param description - Description of the file operation
   * @param operation - Function performing the file operation
   * @param filePath - Path to the file being operated on
   * @returns Promise resolving to operation result
   */
  async trackFileOperation<T>(
    description: string,
    operation: () => Promise<T>,
    filePath?: string
  ): Promise<T> {
    return this.trackAsync('action', description, operation, {}, { 
      api_endpoint: filePath ? `file://${filePath}` : undefined
    });
  }

  /**
   * Track an external service call
   * @param serviceName - Name of the external service
   * @param description - Description of the operation
   * @param serviceCall - Function making the service call
   * @param endpoint - Service endpoint
   * @returns Promise resolving to service response
   */
  async trackServiceCall<T>(
    serviceName: string,
    description: string,
    serviceCall: () => Promise<T>,
    endpoint?: string
  ): Promise<T> {
    return this.trackAsync('api_call', `${serviceName}: ${description}`, serviceCall, {}, { 
      api_endpoint: endpoint,
      service: serviceName
    });
  }

  /**
   * Track a business rule evaluation
   * @param ruleName - Name of the business rule
   * @param description - Description of the rule
   * @param rule - Function implementing the rule
   * @param inputs - Rule input parameters
   * @param confidence - Confidence score (0-1)
   * @returns Rule result
   */
  trackBusinessRule<T>(
    ruleName: string,
    description: string,
    rule: () => T,
    inputs: Record<string, any> = {},
    confidence?: number
  ): T {
    return this.trackSync('rule_evaluation', description, rule, inputs, { 
      rule_name: ruleName,
      confidence
    });
  }

  /**
   * Finalize the trace with a final state
   * @param finalState - Final state/outcome
   * @returns Complete decision trace
   */
  finalize(finalState: string): DecisionTrace {
    this.trace.endTime = new Date();
    this.trace.finalState = finalState;
    return { ...this.trace };
  }

  /**
   * Get current trace (for debugging)
   * @returns Current decision trace
   */
  getTrace(): DecisionTrace {
    return { ...this.trace };
  }

  /**
   * Export trace to JSON string
   * @returns JSON representation of the trace
   */
  toJSON(): string {
    return JSON.stringify(this.trace, null, 2);
  }

  /**
   * Create DecisionTrace from JSON string
   * @param json - JSON string containing trace data
   * @returns Parsed DecisionTrace with restored Date objects
   */
  static fromJSON(json: string): DecisionTrace {
    const trace = JSON.parse(json);
    trace.startTime = new Date(trace.startTime);
    if (trace.endTime) trace.endTime = new Date(trace.endTime);
    
    const convertNodeDates = (node: DecisionNode) => {
      node.timestamp = new Date(node.timestamp);
      node.children.forEach(convertNodeDates);
    };
    convertNodeDates(trace.rootDecision);
    
    return trace;
  }
}