import { DecisionNode, DecisionTrace, DecisionTrailConfig } from "../types";

describe("Types", () => {
  describe("DecisionNode", () => {
    it("should allow all expected decision types", () => {
      const validTypes: DecisionNode["type"][] = [
        "condition",
        "action",
        "api_call",
        "data_lookup",
        "rule_evaluation",
        "custom",
      ];

      validTypes.forEach((type) => {
        const node: DecisionNode = {
          id: "test",
          type,
          description: "Test",
          timestamp: new Date(),
          inputs: {},
          children: [],
        };

        expect(node.type).toBe(type);
      });
    });

    it("should support optional fields", () => {
      const minimalNode: DecisionNode = {
        id: "test",
        type: "condition",
        description: "Test",
        timestamp: new Date(),
        inputs: {},
        children: [],
      };

      const fullNode: DecisionNode = {
        ...minimalNode,
        result: "test_result",
        metadata: {
          duration_ms: 100,
          api_endpoint: "/test",
          error: "test error",
          rule_name: "test_rule",
          confidence: 0.9,
          service: "TestService",
          customField: "customValue",
        },
      };

      expect(minimalNode.result).toBeUndefined();
      expect(fullNode.result).toBe("test_result");
      expect(fullNode.metadata?.customField).toBe("customValue");
    });
  });

  describe("DecisionTrace", () => {
    it("should require mandatory fields", () => {
      const trace: DecisionTrace = {
        processId: "test-123",
        startTime: new Date(),
        rootDecision: {
          id: "root",
          type: "condition",
          description: "Root",
          timestamp: new Date(),
          inputs: {},
          children: [],
        },
        metadata: {
          version: "1.0.0",
          environment: "test",
        },
      };

      expect(trace.processId).toBe("test-123");
      expect(trace.endTime).toBeUndefined();
      expect(trace.finalState).toBeUndefined();
    });

    it("should support optional fields", () => {
      const trace: DecisionTrace = {
        processId: "test-123",
        startTime: new Date(),
        endTime: new Date(),
        finalState: "completed",
        rootDecision: {
          id: "root",
          type: "condition",
          description: "Root",
          timestamp: new Date(),
          inputs: {},
          children: [],
        },
        metadata: {
          version: "1.0.0",
          environment: "test",
          user: "test-user",
          customField: "customValue",
        },
      };

      expect(trace.endTime).toBeInstanceOf(Date);
      expect(trace.finalState).toBe("completed");
      expect(trace.metadata.user).toBe("test-user");
      expect(trace.metadata.customField).toBe("customValue");
    });
  });

  describe("DecisionTrailConfig", () => {
    it("should require version and environment", () => {
      const config: DecisionTrailConfig = {
        version: "1.0.0",
        environment: "production",
      };

      expect(config.version).toBe("1.0.0");
      expect(config.environment).toBe("production");
      expect(config.user).toBeUndefined();
      expect(config.metadata).toBeUndefined();
    });

    it("should support optional fields", () => {
      const config: DecisionTrailConfig = {
        version: "2.0.0",
        environment: "staging",
        user: "admin",
        metadata: {
          region: "us-west-2",
          deployment: "blue-green",
        },
      };

      expect(config.user).toBe("admin");
      expect(config.metadata?.region).toBe("us-west-2");
    });
  });
});
