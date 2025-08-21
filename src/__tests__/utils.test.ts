import { DecisionTrail } from "../DecisionTrail.ts";
import { DecisionNode, DecisionTrace } from "../types";
import { printDecisionTree, toMermaidFlowchart } from "../utils";

describe("utils", () => {
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("printDecisionTree", () => {
    it("should print simple decision tree", () => {
      const node: DecisionNode = {
        id: "test",
        type: "condition",
        description: "Test condition",
        timestamp: new Date(),
        inputs: {},
        result: true,
        children: [],
        metadata: { duration_ms: 100 },
      };

      printDecisionTree(node);

      expect(mockConsoleLog).toHaveBeenCalledWith("condition: Test condition");
      expect(mockConsoleLog).toHaveBeenCalledWith("  → Result: true");
      expect(mockConsoleLog).toHaveBeenCalledWith("  ⏱️ Duration: 100ms");
    });

    it("should print tree with error metadata", () => {
      const node: DecisionNode = {
        id: "test",
        type: "api_call",
        description: "Failed API call",
        timestamp: new Date(),
        inputs: {},
        children: [],
        metadata: {
          error: "Connection timeout",
          duration_ms: 5000,
        },
      };

      printDecisionTree(node);

      expect(mockConsoleLog).toHaveBeenCalledWith("api_call: Failed API call");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "  ❌ Error: Connection timeout"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("  ⏱️ Duration: 5000ms");
    });

    it("should print tree with rule metadata", () => {
      const node: DecisionNode = {
        id: "test",
        type: "rule_evaluation",
        description: "Business rule",
        timestamp: new Date(),
        inputs: {},
        result: 0.85,
        children: [],
        metadata: {
          rule_name: "fraud_detection_v2",
          confidence: 0.9,
        },
      };

      printDecisionTree(node);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "rule_evaluation: Business rule"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("  → Result: 0.85");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "  📋 Rule: fraud_detection_v2"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("  🎯 Confidence: 90.0%");
    });

    it("should print nested tree with indentation", () => {
      const parent: DecisionNode = {
        id: "parent",
        type: "condition",
        description: "Parent decision",
        timestamp: new Date(),
        inputs: {},
        result: true,
        children: [
          {
            id: "child",
            type: "action",
            description: "Child action",
            timestamp: new Date(),
            inputs: {},
            result: "child_result",
            children: [],
          },
        ],
      };

      printDecisionTree(parent);

      expect(mockConsoleLog).toHaveBeenCalledWith("condition: Parent decision");
      expect(mockConsoleLog).toHaveBeenCalledWith("  action: Child action");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '    → Result: "child_result"'
      );
    });
  });

  describe("toMermaidFlowchart", () => {
    let trail: DecisionTrail;
    let trace: DecisionTrace;

    beforeEach(() => {
      trail = new DecisionTrail("test-mermaid", {
        version: "1.0.0",
        environment: "test",
      });
    });

    it("should generate basic Mermaid flowchart", () => {
      trail.evaluateCondition("Check validity", () => true);
      trace = trail.finalize("completed");

      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain("flowchart TD");
      expect(mermaid).toContain('root{"Processing test-mermaid"}');
      expect(mermaid).toContain('node_1{"Check validity"}');
      expect(mermaid).toContain("root --> node_1");
    });

    it("should handle different node types with appropriate shapes", () => {
      trail.trackSync("action", "Perform action", () => "result");
      const apiTrail = trail.addDecision("api_call", "API call", {});
      apiTrail.setResult("api_result");
      trail.addDecision("data_lookup", "Database query", {});
      trail.addDecision("rule_evaluation", "Business rule", {});

      trace = trail.finalize("completed");
      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain('["Perform action"]'); // action shape
      expect(mermaid).toContain('(("API call"))'); // api_call shape
      expect(mermaid).toContain('[("Database query")]'); // data_lookup shape
      expect(mermaid).toContain('[/"Business rule"/]'); // rule_evaluation shape
    });

    it("should include error nodes for failed operations", async () => {
      try {
        await trail.trackAsync("api_call", "Failed API", async () => {
          throw new Error("Service unavailable");
        });
      } catch (error) {
        // Expected to fail
      }

      trace = trail.finalize("error");
      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain('node_1_error["❌ Service unavailable"]');
      expect(mermaid).toContain("node_1 -.-> node_1_error");
      expect(mermaid).toContain("node_1_error:::error");
    });

    it("should include CSS classes for styling", () => {
      trail.evaluateCondition("Test condition", () => true);
      trace = trail.finalize("completed");

      const mermaid = toMermaidFlowchart(trace);

      expect(mermaid).toContain("classDef error fill:#ffebee,stroke:#f44336");
      expect(mermaid).toContain(
        "classDef condition fill:#e3f2fd,stroke:#2196f3"
      );
      expect(mermaid).toContain("classDef action fill:#e8f5e8,stroke:#4caf50");
      expect(mermaid).toContain(
        "classDef api_call fill:#fff3e0,stroke:#ff9800"
      );
    });
  });
});
