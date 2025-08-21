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