// File: package.json
{
  "name": "decision-trail",
  "version": "1.0.0",
  "description": "Track and audit decision trees in your applications with structured logging and visualization support",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --watchAll=false --passWithNoTests",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "prepublishOnly": "npm run build && npm run test:ci",
    "prepack": "npm run build",
    "dev": "tsc --watch"
  },
  "keywords": [
    "decision-tree",
    "audit-trail",
    "logging",
    "tracing",
    "business-logic",
    "decision-tracking",
    "provenance",
    "workflow"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/decision-trail.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/decision-trail/issues"
  },
  "homepage": "https://github.com/yourusername/decision-trail#readme",
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^18.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}

// File: tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}

// File: src/types.ts
/**
 * Represents a single decision node in the decision tree
 */
export interface DecisionNode {
  /** Unique identifier for this decision node */
  id: string;
  /** Type of decision being made */
  type: 'condition' | 'action' | 'api_call' | 'data_lookup' | 'rule_evaluation' | 'custom';
  /** Human-readable description of the decision */
  description: string;
  /** Timestamp when this decision was made */
  timestamp: Date;
  /** Input parameters that influenced this decision */
  inputs: Record<string, any>;
  /** Result of the decision (optional) */
  result?: any;
  /** Child decisions that followed from this one */
  children: DecisionNode[];
  /** Additional metadata about the decision */
  metadata?: {
    /** Duration in milliseconds (automatically tracked) */
    duration_ms?: number;
    /** API endpoint called (for api_call type) */
    api_endpoint?: string;
    /** Error message if the decision failed */
    error?: string;
    /** Name of the business rule applied */
    rule_name?: string;
    /** Confidence score for the decision (0-1) */
    confidence?: number;
    /** Service name for external calls */
    service?: string;
    /** Custom metadata fields */
    [key: string]: any;
  };
}

/**
 * Complete decision trace for a single process
 */
export interface DecisionTrace {
  /** Unique identifier for the process being traced */
  processId: string;
  /** When the process started */
  startTime: Date;
  /** When the process ended (set when finalized) */
  endTime?: Date;
  /** Final state/outcome of the process */
  finalState?: string;
  /** Root decision node containing the entire tree */
  rootDecision: DecisionNode;
  /** Metadata about the trace itself */
  metadata: {
    /** Version of the decision logic */
    version: string;
    /** Environment where this ran */
    environment: string;
    /** User or system that initiated the process */
    user?: string;
    /** Custom trace-level metadata */
    [key: string]: any;
  };
}

/**
 * Configuration options for DecisionTracker
 */
export interface DecisionTrackerConfig {
  /** Version of the decision logic */
  version: string;
  /** Environment where this is running */
  environment: string;
  /** User or system initiating the process */
  user?: string;
  /** Custom metadata to include in the trace */
  metadata?: Record<string, any>;
}

// File: src/DecisionTracker.ts
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

// File: src/utils.ts
import { DecisionNode } from './types';

/**
 * Print a decision tree to console for debugging
 * @param node - Root node to print
 * @param indent - Current indentation level
 */
export function printDecisionTree(node: DecisionNode, indent: string = ''): void {
  console.log(`${indent}${node.type}: ${node.description}`);
  
  if (node.result !== undefined) {
    console.log(`${indent}  → Result: ${JSON.stringify(node.result)}`);
  }
  
  if (node.metadata?.error) {
    console.log(`${indent}  ❌ Error: ${node.metadata.error}`);
  }
  
  if (node.metadata?.duration_ms !== undefined) {
    console.log(`${indent}  ⏱️ Duration: ${node.metadata.duration_ms}ms`);
  }
  
  if (node.metadata?.rule_name) {
    console.log(`${indent}  📋 Rule: ${node.metadata.rule_name}`);
  }
  
  if (node.metadata?.confidence !== undefined) {
    console.log(`${indent}  🎯 Confidence: ${(node.metadata.confidence * 100).toFixed(1)}%`);
  }
  
  node.children.forEach(child => {
    printDecisionTree(child, indent + '  ');
  });
}

/**
 * Convert a decision trace to Mermaid flowchart format
 * @param trace - Decision trace to convert
 * @returns Mermaid flowchart string
 */
export function toMermaidFlowchart(trace: DecisionTrace): string {
  const lines: string[] = ['flowchart TD'];
  
  const processNode = (node: DecisionNode, parentId?: string) => {
    const nodeLabel = `${node.description}`;
    const nodeShape = getNodeShape(node.type);
    
    lines.push(`    ${node.id}${nodeShape[0]}"${nodeLabel}"${nodeShape[1]}`);
    
    if (parentId) {
      lines.push(`    ${parentId} --> ${node.id}`);
    }
    
    if (node.metadata?.error) {
      lines.push(`    ${node.id} -.-> ${node.id}_error["❌ ${node.metadata.error}"]`);
      lines.push(`    ${node.id}_error:::error`);
    }
    
    node.children.forEach(child => processNode(child, node.id));
  };
  
  processNode(trace.rootDecision);
  
  lines.push('    classDef error fill:#ffebee,stroke:#f44336');
  lines.push('    classDef condition fill:#e3f2fd,stroke:#2196f3');
  lines.push('    classDef action fill:#e8f5e8,stroke:#4caf50');
  lines.push('    classDef api_call fill:#fff3e0,stroke:#ff9800');
  
  return lines.join('\n');
}

function getNodeShape(type: DecisionNode['type']): [string, string] {
  switch (type) {
    case 'condition': return ['{"', '"}'];
    case 'action': return ['["', '"]'];
    case 'api_call': return ['(("', '"))'];
    case 'data_lookup': return ['[("', '")]'];
    case 'rule_evaluation': return ['[/"', '"/]'];
    default: return ['["', '"]'];
  }
}

// File: src/index.ts
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

// File: jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// File: src/__tests__/DecisionTracker.test.ts
import { DecisionTracker } from '../DecisionTracker';
import { DecisionNode, DecisionTrace } from '../types';

describe('DecisionTracker', () => {
  let tracker: DecisionTracker;
  const mockConfig = {
    version: '1.0.0',
    environment: 'test',
    user: 'test-user'
  };

  beforeEach(() => {
    tracker = new DecisionTracker('test-process-123', mockConfig);
  });

  describe('constructor', () => {
    it('should create a tracker with correct initial state', () => {
      const trace = tracker.getTrace();
      
      expect(trace.processId).toBe('test-process-123');
      expect(trace.startTime).toBeInstanceOf(Date);
      expect(trace.endTime).toBeUndefined();
      expect(trace.finalState).toBeUndefined();
      expect(trace.metadata.version).toBe('1.0.0');
      expect(trace.metadata.environment).toBe('test');
      expect(trace.metadata.user).toBe('test-user');
      expect(trace.rootDecision.id).toBe('root');
      expect(trace.rootDecision.children).toHaveLength(0);
    });

    it('should include custom metadata', () => {
      const customTracker = new DecisionTracker('test', {
        ...mockConfig,
        metadata: { customField: 'customValue' }
      });
      
      const trace = customTracker.getTrace();
      expect(trace.metadata.customField).toBe('customValue');
    });
  });

  describe('addDecision', () => {
    it('should add a decision to the current node', () => {
      const branch = tracker.addDecision(
        'condition',
        'Test condition',
        { input: 'value' },
        { rule_name: 'test_rule' }
      );

      const trace = tracker.getTrace();
      expect(trace.rootDecision.children).toHaveLength(1);
      
      const decision = trace.rootDecision.children[0];
      expect(decision.type).toBe('condition');
      expect(decision.description).toBe('Test condition');
      expect(decision.inputs.input).toBe('value');
      expect(decision.metadata?.rule_name).toBe('test_rule');
      expect(decision.timestamp).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for decisions', () => {
      const branch1 = tracker.addDecision('condition', 'First');
      const branch2 = tracker.addDecision('action', 'Second');

      const trace = tracker.getTrace();
      const decisions = trace.rootDecision.children;
      expect(decisions[0].id).not.toBe(decisions[1].id);
      expect(decisions[0].id).toMatch(/node_\d+/);
      expect(decisions[1].id).toMatch(/node_\d+/);
    });
  });

  describe('setResult', () => {
    it('should set result and metadata on current node', () => {
      const branch = tracker.addDecision('condition', 'Test');
      branch.setResult(true, { confidence: 0.9 });

      const trace = tracker.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBe(true);
      expect(decision.metadata?.confidence).toBe(0.9);
    });
  });

  describe('goToParent', () => {
    it('should return null when at root', () => {
      const parent = tracker.goToParent();
      expect(parent).toBeNull();
    });

    it('should navigate back to parent decision', () => {
      const branch1 = tracker.addDecision('condition', 'Branch 1');
      const branch2 = branch1.addDecision('action', 'Branch 2');
      
      const backToParent = branch2.goToParent();
      expect(backToParent).not.toBeNull();
      
      // Add decision to verify we're back at branch1 level
      backToParent!.addDecision('condition', 'Back at branch 1');
      
      const trace = tracker.getTrace();
      const branch1Node = trace.rootDecision.children[0];
      expect(branch1Node.children).toHaveLength(2); // branch2 + new decision
    });
  });

  describe('trackSync', () => {
    it('should execute function and track timing', () => {
      const mockFn = jest.fn().mockReturnValue('result');
      
      const result = tracker.trackSync(
        'action',
        'Test sync operation',
        mockFn,
        { input: 'test' }
      );

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);

      const trace = tracker.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBe('result');
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should handle sync errors properly', () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => {
        tracker.trackSync('action', 'Failing operation', mockFn);
      }).toThrow('Test error');

      const trace = tracker.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBeNull();
      expect(decision.metadata?.error).toBe('Test error');
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('trackAsync', () => {
    it('should execute async function and track timing', async () => {
      const mockFn = jest.fn().mockResolvedValue('async result');
      
      const result = await tracker.trackAsync(
        'api_call',
        'Test async operation',
        mockFn,
        { input: 'test' }
      );

      expect(result).toBe('async result');
      expect(mockFn).toHaveBeenCalledTimes(1);

      const trace = tracker.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBe('async result');
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should handle async errors properly', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(
        tracker.trackAsync('api_call', 'Failing async operation', mockFn)
      ).rejects.toThrow('Async error');

      const trace = tracker.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBeNull();
      expect(decision.metadata?.error).toBe('Async error');
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-Error objects thrown', async () => {
      const mockFn = jest.fn().mockRejectedValue('string error');

      await expect(
        tracker.trackAsync('api_call', 'Failing with string', mockFn)
      ).rejects.toBe('string error');

      const trace = tracker.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.metadata?.error).toBe('string error');
    });
  });

  describe('convenience methods', () => {
    describe('trackApiCall', () => {
      it('should track API call with endpoint metadata', async () => {
        const mockApiCall = jest.fn().mockResolvedValue({ data: 'api response' });
        
        const result = await tracker.trackApiCall(
          'Fetch user data',
          mockApiCall,
          '/api/users/123'
        );

        expect(result).toEqual({ data: 'api response' });

        const trace = tracker.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe('api_call');
        expect(decision.metadata?.api_endpoint).toBe('/api/users/123');
      });
    });

    describe('evaluateCondition', () => {
      it('should evaluate boolean condition', () => {
        const result = tracker.evaluateCondition(
          'Check if valid',
          () => true,
          { value: 'test' }
        );

        expect(result).toBe(true);

        const trace = tracker.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe('condition');
        expect(decision.result).toBe(true);
      });
    });

    describe('trackDbQuery', () => {
      it('should track database query with table metadata', async () => {
        const mockQuery = jest.fn().mockResolvedValue([{ id: 1, name: 'test' }]);
        
        const result = await tracker.trackDbQuery(
          'Find users',
          mockQuery,
          { table: 'users', operation: 'SELECT' }
        );

        expect(result).toEqual([{ id: 1, name: 'test' }]);

        const trace = tracker.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe('data_lookup');
        expect(decision.metadata?.table).toBe('users');
        expect(decision.metadata?.operation).toBe('SELECT');
        expect(decision.metadata?.api_endpoint).toBe('db://users');
      });
    });

    describe('trackFileOperation', () => {
      it('should track file operation with file path', async () => {
        const mockFileOp = jest.fn().mockResolvedValue('file content');
        
        const result = await tracker.trackFileOperation(
          'Read config file',
          mockFileOp,
          '/etc/config.json'
        );

        expect(result).toBe('file content');

        const trace = tracker.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe('action');
        expect(decision.metadata?.api_endpoint).toBe('file:///etc/config.json');
      });
    });

    describe('trackServiceCall', () => {
      it('should track external service call', async () => {
        const mockServiceCall = jest.fn().mockResolvedValue({ status: 'ok' });
        
        const result = await tracker.trackServiceCall(
          'PaymentService',
          'Process payment',
          mockServiceCall,
          '/payments/charge'
        );

        expect(result).toEqual({ status: 'ok' });

        const trace = tracker.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe('api_call');
        expect(decision.description).toBe('PaymentService: Process payment');
        expect(decision.metadata?.service).toBe('PaymentService');
        expect(decision.metadata?.api_endpoint).toBe('/payments/charge');
      });
    });

    describe('trackBusinessRule', () => {
      it('should track business rule with confidence', () => {
        const mockRule = jest.fn().mockReturnValue(0.85);
        
        const result = tracker.trackBusinessRule(
          'fraud_detection_v2',
          'Calculate fraud score',
          mockRule,
          { amount: 1000 },
          0.9
        );

        expect(result).toBe(0.85);

        const trace = tracker.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe('rule_evaluation');
        expect(decision.metadata?.rule_name).toBe('fraud_detection_v2');
        expect(decision.metadata?.confidence).toBe(0.9);
      });
    });
  });

  describe('finalize', () => {
    it('should set endTime and finalState', () => {
      const trace = tracker.finalize('completed');
      
      expect(trace.endTime).toBeInstanceOf(Date);
      expect(trace.finalState).toBe('completed');
      expect(trace.endTime!.getTime()).toBeGreaterThanOrEqual(trace.startTime.getTime());
    });

    it('should return a copy of the trace', () => {
      const trace1 = tracker.finalize('completed');
      const trace2 = tracker.getTrace();
      
      expect(trace1).not.toBe(trace2); // Different objects
      expect(trace1.finalState).toBe(trace2.finalState); // Same content
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON string', () => {
      tracker.evaluateCondition('Test condition', () => true);
      const json = tracker.toJSON();
      
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
      
      const parsed = JSON.parse(json);
      expect(parsed.processId).toBe('test-process-123');
      expect(parsed.rootDecision.children).toHaveLength(1);
    });

    it('should deserialize from JSON with date conversion', () => {
      tracker.evaluateCondition('Test condition', () => true);
      const originalTrace = tracker.finalize('completed');
      const json = tracker.toJSON();
      
      const deserializedTrace = DecisionTracker.fromJSON(json);
      
      expect(deserializedTrace.processId).toBe(originalTrace.processId);
      expect(deserializedTrace.startTime).toBeInstanceOf(Date);
      expect(deserializedTrace.endTime).toBeInstanceOf(Date);
      expect(deserializedTrace.rootDecision.timestamp).toBeInstanceOf(Date);
      expect(deserializedTrace.rootDecision.children[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('complex branching scenarios', () => {
    it('should handle multiple levels of branching', () => {
      const level1 = tracker.addDecision('condition', 'Level 1');
      const level2a = level1.addDecision('action', 'Level 2A');
      const level2b = level1.addDecision('action', 'Level 2B');
      const level3 = level2a.addDecision('api_call', 'Level 3');

      level1.setResult('level1_result');
      level2a.setResult('level2a_result');
      level2b.setResult('level2b_result');
      level3.setResult('level3_result');

      const trace = tracker.getTrace();
      const rootChildren = trace.rootDecision.children;
      
      expect(rootChildren).toHaveLength(1);
      expect(rootChildren[0].children).toHaveLength(2);
      expect(rootChildren[0].children[0].children).toHaveLength(1);
      expect(rootChildren[0].children[1].children).toHaveLength(0);
    });
  });
});

// File: src/__tests__/utils.test.ts
import { printDecisionTree, toMermaidFlowchart } from '../utils';
import { DecisionTracker } from '../DecisionTracker';
import { DecisionNode, DecisionTrace } from '../types';

describe('utils', () => {
  let mockConsoleLog: jest.SpyInstance;
  
  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('printDecisionTree', () => {
    it('should print simple decision tree', () => {
      const node: DecisionNode = {
        id: 'test',
        type: 'condition',
        description: 'Test condition',
        timestamp: new Date(),
        inputs: {},
        result: true,
        children: [],
        metadata: { duration_ms: 100 }
      };

      printDecisionTree(node);

      expect(mockConsoleLog).toHaveBeenCalledWith('condition: Test condition');
      expect(mockConsoleLog).toHaveBeenCalledWith('  → Result: true');
      expect(mockConsoleLog).toHaveBeenCalledWith('  ⏱️ Duration: 100ms');
    });

    it('should print tree with error metadata', () => {
      const node: DecisionNode = {
        id: 'test',
        type: 'api_call',
        description: 'Failed API call',
        timestamp: new Date(),
        inputs: {},
        children: [],
        metadata: { 
          error: 'Connection timeout',
          duration_ms: 5000
        }
      };

      printDecisionTree(node);

      expect(mockConsoleLog).toHaveBeenCalledWith('api_call: Failed API call');
      expect(mockConsoleLog).toHaveBeenCalledWith('  ❌ Error: Connection timeout');
      expect(mockConsoleLog).toHaveBeenCalledWith('  ⏱️ Duration: 5000ms');
    });

    it('should print tree with rule metadata', () => {
      const node: DecisionNode = {
        id: 'test',
        type: 'rule_evaluation',
        description: 'Business rule',
        timestamp: new Date(),
        inputs: {},
        result: 0.85,
        children: [],
        metadata: { 
          rule_name: 'fraud_detection_v2',
          confidence: 0.9
        }
      };

      printDecisionTree(node);

      expect(mockConsoleLog).toHaveBeenCalledWith('rule_evaluation: Business rule');
      expect(mockConsoleLog).toHaveBeenCalledWith('  → Result: 0.85');
      expect(mockConsoleLog).toHaveBeenCalledWith('  📋 Rule: fraud_detection_v2');
      expect(mockConsoleLog).toHaveBeenCalledWith('  🎯 Confidence: 90.0%');
    });

    it('should print nested tree with indentation', () => {
      const parent: DecisionNode = {
        id: 'parent',
        type: 'condition',
        description: 'Parent decision',
        timestamp: new Date(),
        inputs: {},
        result: true,
        children: [
          {
            id: 'child',
            type: 'action',
            description: 'Child action',
            timestamp: new Date(),
            inputs: {},
            result: 'child_result',
            children: []
          }
        ]
      };

      printDecisionTree(parent);

      expect(mockConsoleLog).toHaveBeenCalledWith('condition: Parent decision');
      expect(mockConsoleLog).toHaveBeenCalledWith('  action: Child action');
      expect(mockConsoleLog).toHaveBeenCalledWith('    → Result: "child_result"');
    });
  });

  describe('toMermaidFlowchart', () => {
    let tracker: DecisionTracker;
    let trace: DecisionTrace;

    beforeEach(() => {
      tracker = new DecisionTracker('test-mermaid', {
        version: '1.0.0',
        environment: 'test'
      });
    });

    it('should generate basic Mermaid flowchart', () => {
      tracker.evaluateCondition('Check validity', () => true);
      trace = tracker.finalize('completed');

      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain('flowchart TD');
      expect(mermaid).toContain('root{"Processing test-mermaid"}');
      expect(mermaid).toContain('node_1{"Check validity"}');
      expect(mermaid).toContain('root --> node_1');
    });

    it('should handle different node types with appropriate shapes', () => {
      tracker.trackSync('action', 'Perform action', () => 'result');
      const apiTracker = tracker.addDecision('api_call', 'API call', {});
      apiTracker.setResult('api_result');
      tracker.addDecision('data_lookup', 'Database query', {});
      tracker.addDecision('rule_evaluation', 'Business rule', {});
      
      trace = tracker.finalize('completed');
      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain('["Perform action"]'); // action shape
      expect(mermaid).toContain('(("API call"))'); // api_call shape
      expect(mermaid).toContain('[("Database query")]'); // data_lookup shape
      expect(mermaid).toContain('[/"Business rule"/]'); // rule_evaluation shape
    });

    it('should include error nodes for failed operations', async () => {
      try {
        await tracker.trackAsync('api_call', 'Failed API', async () => {
          throw new Error('Service unavailable');
        });
      } catch (error) {
        // Expected to fail
      }

      trace = tracker.finalize('error');
      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain('node_1_error["❌ Service unavailable"]');
      expect(mermaid).toContain('node_1 -.-> node_1_error');
      expect(mermaid).toContain('node_1_error:::error');
    });

    it('should include CSS classes for styling', () => {
      tracker.evaluateCondition('Test condition', () => true);
      trace = tracker.finalize('completed');

      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain('classDef error fill:#ffebee,stroke:#f44336');
      expect(mermaid).toContain('classDef condition fill:#e3f2fd,stroke:#2196f3');
      expect(mermaid).toContain('classDef action fill:#e8f5e8,stroke:#4caf50');
      expect(mermaid).toContain('classDef api_call fill:#fff3e0,stroke:#ff9800');
    });
  });
});

// File: src/__tests__/types.test.ts
import { DecisionNode, DecisionTrace, DecisionTrackerConfig } from '../types';

describe('Types', () => {
  describe('DecisionNode', () => {
    it('should allow all expected decision types', () => {
      const validTypes: DecisionNode['type'][] = [
        'condition',
        'action', 
        'api_call',
        'data_lookup',
        'rule_evaluation',
        'custom'
      ];

      validTypes.forEach(type => {
        const node: DecisionNode = {
          id: 'test',
          type,
          description: 'Test',
          timestamp: new Date(),
          inputs: {},
          children: []
        };

        expect(node.type).toBe(type);
      });
    });

    it('should support optional fields', () => {
      const minimalNode: DecisionNode = {
        id: 'test',
        type: 'condition',
        description: 'Test',
        timestamp: new Date(),
        inputs: {},
        children: []
      };

      const fullNode: DecisionNode = {
        ...minimalNode,
        result: 'test_result',
        metadata: {
          duration_ms: 100,
          api_endpoint: '/test',
          error: 'test error',
          rule_name: 'test_rule',
          confidence: 0.9,
          service: 'TestService',
          customField: 'customValue'
        }
      };

      expect(minimalNode.result).toBeUndefined();
      expect(fullNode.result).toBe('test_result');
      expect(fullNode.metadata?.customField).toBe('customValue');
    });
  });

  describe('DecisionTrace', () => {
    it('should require mandatory fields', () => {
      const trace: DecisionTrace = {
        processId: 'test-123',
        startTime: new Date(),
        rootDecision: {
          id: 'root',
          type: 'condition',
          description: 'Root',
          timestamp: new Date(),
          inputs: {},
          children: []
        },
        metadata: {
          version: '1.0.0',
          environment: 'test'
        }
      };

      expect(trace.processId).toBe('test-123');
      expect(trace.endTime).toBeUndefined();
      expect(trace.finalState).toBeUndefined();
    });

    it('should support optional fields', () => {
      const trace: DecisionTrace = {
        processId: 'test-123',
        startTime: new Date(),
        endTime: new Date(),
        finalState: 'completed',
        rootDecision: {
          id: 'root',
          type: 'condition',
          description: 'Root',
          timestamp: new Date(),
          inputs: {},
          children: []
        },
        metadata: {
          version: '1.0.0',
          environment: 'test',
          user: 'test-user',
          customField: 'customValue'
        }
      };

      expect(trace.endTime).toBeInstanceOf(Date);
      expect(trace.finalState).toBe('completed');
      expect(trace.metadata.user).toBe('test-user');
      expect(trace.metadata.customField).toBe('customValue');
    });
  });

  describe('DecisionTrackerConfig', () => {
    it('should require version and environment', () => {
      const config: DecisionTrackerConfig = {
        version: '1.0.0',
        environment: 'production'
      };

      expect(config.version).toBe('1.0.0');
      expect(config.environment).toBe('production');
      expect(config.user).toBeUndefined();
      expect(config.metadata).toBeUndefined();
    });

    it('should support optional fields', () => {
      const config: DecisionTrackerConfig = {
        version: '2.0.0',
        environment: 'staging',
        user: 'admin',
        metadata: {
          region: 'us-west-2',
          deployment: 'blue-green'
        }
      };

      expect(config.user).toBe('admin');
      expect(config.metadata?.region).toBe('us-west-2');
    });
  });
});

// File: .gitignore
node_modules/
dist/
coverage/
*.log
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

// File: .npmignore
src/
*.test.ts
*.spec.ts
jest.config.js
tsconfig.json
.gitignore
coverage/
node_modules/