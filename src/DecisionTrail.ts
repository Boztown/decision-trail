import { DecisionNode, DecisionTrace, DecisionTrailConfig } from "./types";
/**
 * DecisionTrail - Track and audit decision trees in your applications
 *
 * @example
 * ```typescript
 * const trail = new DecisionTrail('order-123', {
 *   version: '1.0.0',
 *   environment: 'production'
 * });
 *
 * const isValid = trail.evaluateCondition(
 *   'Validate order',
 *   () => order.amount > 0,
 *   { amount: order.amount }
 * );
 *
 * const result = await trail.trackApiCall(
 *   'Process payment',
 *   () => paymentService.charge(order.amount),
 *   '/api/payments/charge'
 * );
 *
 * const trace = trail.finalize('completed');
 * ```
 */
export class DecisionTrail {
  private trace: DecisionTrace;
  private currentNode: DecisionNode;
  private nodeStack: DecisionNode[] = [];
  private nodeCounter = 0;

  constructor(processId: string, config: DecisionTrailConfig) {
    const rootNode: DecisionNode = {
      id: "root",
      type: "condition",
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

  addDecision(
    type: DecisionNode["type"],
    description: string,
    inputs: Record<string, any> = {},
    metadata?: DecisionNode["metadata"]
  ): DecisionTrail {
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
    const branchTrail = Object.create(DecisionTrail.prototype);
    branchTrail.trace = this.trace;
    branchTrail.currentNode = node;
    branchTrail.nodeStack = [...this.nodeStack, this.currentNode];
    branchTrail.nodeCounter = this.nodeCounter;
    return branchTrail;
  }

  setResult(result: any, metadata?: Partial<DecisionNode["metadata"]>): void {
    this.currentNode.result = result;
    if (metadata) {
      this.currentNode.metadata = { ...this.currentNode.metadata, ...metadata };
    }
  }

  goToParent(): DecisionTrail | null {
    if (this.nodeStack.length === 0) return null;
    const branchTrail = Object.create(DecisionTrail.prototype);
    branchTrail.trace = this.trace;
    branchTrail.currentNode = this.nodeStack[this.nodeStack.length - 1];
    branchTrail.nodeStack = this.nodeStack.slice(0, -1);
    branchTrail.nodeCounter = this.nodeCounter;
    return branchTrail;
  }

  async trackAsync<T>(
    type: DecisionNode["type"],
    description: string,
    operation: () => Promise<T>,
    inputs: Record<string, any> = {},
    metadata: DecisionNode["metadata"] = {}
  ): Promise<T> {
    const startTime = Date.now();
    const trail = this.addDecision(type, description, inputs, metadata);
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      trail.setResult(result, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      trail.setResult(null, {
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  trackSync<T>(
    type: DecisionNode["type"],
    description: string,
    operation: () => T,
    inputs: Record<string, any> = {},
    metadata: DecisionNode["metadata"] = {}
  ): T {
    const startTime = Date.now();
    const trail = this.addDecision(type, description, inputs, metadata);
    try {
      const result = operation();
      const duration = Date.now() - startTime;
      trail.setResult(result, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      trail.setResult(null, {
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async trackApiCall<T>(
    description: string,
    apiCall: () => Promise<T>,
    endpoint?: string
  ): Promise<T> {
    return this.trackAsync(
      "api_call",
      description,
      apiCall,
      {},
      { api_endpoint: endpoint }
    );
  }

  evaluateCondition(
    description: string,
    condition: () => boolean,
    inputs: Record<string, any> = {}
  ): boolean {
    return this.trackSync("condition", description, condition, inputs);
  }

  async trackDbQuery<T>(
    description: string,
    query: () => Promise<T>,
    queryInfo?: { table?: string; operation?: string }
  ): Promise<T> {
    return this.trackAsync(
      "data_lookup",
      description,
      query,
      {},
      {
        ...queryInfo,
        api_endpoint: queryInfo?.table ? `db://${queryInfo.table}` : undefined,
      }
    );
  }

  async trackFileOperation<T>(
    description: string,
    operation: () => Promise<T>,
    filePath?: string
  ): Promise<T> {
    return this.trackAsync(
      "action",
      description,
      operation,
      {},
      {
        api_endpoint: filePath ? `file://${filePath}` : undefined,
      }
    );
  }

  async trackServiceCall<T>(
    serviceName: string,
    description: string,
    serviceCall: () => Promise<T>,
    endpoint?: string
  ): Promise<T> {
    return this.trackAsync(
      "api_call",
      `${serviceName}: ${description}`,
      serviceCall,
      {},
      {
        api_endpoint: endpoint,
        service: serviceName,
      }
    );
  }


  finalize(finalState: string): DecisionTrace {
    this.trace.endTime = new Date();
    this.trace.finalState = finalState;
    return { ...this.trace };
  }

  getTrace(): DecisionTrace {
    return { ...this.trace };
  }

  toJSON(): string {
    return JSON.stringify(this.trace, null, 2);
  }

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
