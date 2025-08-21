import { DecisionTrail } from "../DecisionTrail";

describe("DecisionTrail", () => {
  let trail: DecisionTrail;
  const mockConfig = {
    version: "1.0.0",
    environment: "test",
    user: "test-user",
  };

  beforeEach(() => {
    trail = new DecisionTrail("test-process-123", mockConfig);
  });

  describe("constructor", () => {
    it("should create a trail with correct initial state", () => {
      const trace = trail.getTrace();

      expect(trace.processId).toBe("test-process-123");
      expect(trace.startTime).toBeInstanceOf(Date);
      expect(trace.endTime).toBeUndefined();
      expect(trace.finalState).toBeUndefined();
      expect(trace.metadata.version).toBe("1.0.0");
      expect(trace.metadata.environment).toBe("test");
      expect(trace.metadata.user).toBe("test-user");
      expect(trace.rootDecision.id).toBe("root");
      expect(trace.rootDecision.children).toHaveLength(0);
    });

    it("should include custom metadata", () => {
      const customTrail = new DecisionTrail("test", {
        ...mockConfig,
        metadata: { customField: "customValue" },
      });

      const trace = customTrail.getTrace();
      expect(trace.metadata.customField).toBe("customValue");
    });
  });

  describe("addDecision", () => {
    it("should add a decision to the current node", () => {
      const branch = trail.addDecision(
        "condition",
        "Test condition",
        { input: "value" },
        { rule_name: "test_rule" }
      );

      const trace = trail.getTrace();
      expect(trace.rootDecision.children).toHaveLength(1);

      const decision = trace.rootDecision.children[0];
      expect(decision.type).toBe("condition");
      expect(decision.description).toBe("Test condition");
      expect(decision.inputs.input).toBe("value");
      expect(decision.metadata?.rule_name).toBe("test_rule");
      expect(decision.timestamp).toBeInstanceOf(Date);
    });

    it("should generate unique IDs for decisions", () => {
      const branch1 = trail.addDecision("condition", "First");
      const branch2 = trail.addDecision("action", "Second");

      const trace = trail.getTrace();
      const decisions = trace.rootDecision.children;
      expect(decisions[0].id).not.toBe(decisions[1].id);
      expect(decisions[0].id).toMatch(/node_\d+/);
      expect(decisions[1].id).toMatch(/node_\d+/);
    });
  });

  describe("setResult", () => {
    it("should set result and metadata on current node", () => {
      const branch = trail.addDecision("condition", "Test");
      branch.setResult(true, { confidence: 0.9 });

      const trace = trail.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBe(true);
      expect(decision.metadata?.confidence).toBe(0.9);
    });
  });

  describe("goToParent", () => {
    it("should return null when at root", () => {
      const parent = trail.goToParent();
      expect(parent).toBeNull();
    });

    it("should navigate back to parent decision", () => {
      const branch1 = trail.addDecision("condition", "Branch 1");
      const branch2 = branch1.addDecision("action", "Branch 2");

      const backToParent = branch2.goToParent();
      expect(backToParent).not.toBeNull();

      // Add decision to verify we're back at branch1 level
      backToParent!.addDecision("condition", "Back at branch 1");

      const trace = trail.getTrace();
      const branch1Node = trace.rootDecision.children[0];
      expect(branch1Node.children).toHaveLength(2); // branch2 + new decision
    });
  });

  describe("trackSync", () => {
    it("should execute function and track timing", () => {
      const mockFn = jest.fn().mockReturnValue("result");

      const result = trail.trackSync("action", "Test sync operation", mockFn, {
        input: "test",
      });

      expect(result).toBe("result");
      expect(mockFn).toHaveBeenCalledTimes(1);

      const trace = trail.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBe("result");
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle sync errors properly", () => {
      const error = new Error("Test error");
      const mockFn = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => {
        trail.trackSync("action", "Failing operation", mockFn);
      }).toThrow("Test error");

      const trace = trail.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBeNull();
      expect(decision.metadata?.error).toBe("Test error");
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("trackAsync", () => {
    it("should execute async function and track timing", async () => {
      const mockFn = jest.fn().mockResolvedValue("async result");

      const result = await trail.trackAsync(
        "api_call",
        "Test async operation",
        mockFn,
        { input: "test" }
      );

      expect(result).toBe("async result");
      expect(mockFn).toHaveBeenCalledTimes(1);

      const trace = trail.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBe("async result");
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle async errors properly", async () => {
      const error = new Error("Async error");
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(
        trail.trackAsync("api_call", "Failing async operation", mockFn)
      ).rejects.toThrow("Async error");

      const trace = trail.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.result).toBeNull();
      expect(decision.metadata?.error).toBe("Async error");
      expect(decision.metadata?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle non-Error objects thrown", async () => {
      const mockFn = jest.fn().mockRejectedValue("string error");

      await expect(
        trail.trackAsync("api_call", "Failing with string", mockFn)
      ).rejects.toBe("string error");

      const trace = trail.getTrace();
      const decision = trace.rootDecision.children[0];
      expect(decision.metadata?.error).toBe("string error");
    });
  });

  describe("convenience methods", () => {
    describe("trackApiCall", () => {
      it("should track API call with endpoint metadata", async () => {
        const mockApiCall = jest
          .fn()
          .mockResolvedValue({ data: "api response" });

        const result = await trail.trackApiCall(
          "Fetch user data",
          mockApiCall,
          "/api/users/123"
        );

        expect(result).toEqual({ data: "api response" });

        const trace = trail.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe("api_call");
        expect(decision.metadata?.api_endpoint).toBe("/api/users/123");
      });
    });

    describe("evaluateCondition", () => {
      it("should evaluate boolean condition", () => {
        const result = trail.evaluateCondition("Check if valid", () => true, {
          value: "test",
        });

        expect(result).toBe(true);

        const trace = trail.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe("condition");
        expect(decision.result).toBe(true);
      });
    });

    describe("trackDbQuery", () => {
      it("should track database query with table metadata", async () => {
        const mockQuery = jest
          .fn()
          .mockResolvedValue([{ id: 1, name: "test" }]);

        const result = await trail.trackDbQuery("Find users", mockQuery, {
          table: "users",
          operation: "SELECT",
        });

        expect(result).toEqual([{ id: 1, name: "test" }]);

        const trace = trail.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe("data_lookup");
        expect(decision.metadata?.table).toBe("users");
        expect(decision.metadata?.operation).toBe("SELECT");
        expect(decision.metadata?.api_endpoint).toBe("db://users");
      });
    });

    describe("trackFileOperation", () => {
      it("should track file operation with file path", async () => {
        const mockFileOp = jest.fn().mockResolvedValue("file content");

        const result = await trail.trackFileOperation(
          "Read config file",
          mockFileOp,
          "/etc/config.json"
        );

        expect(result).toBe("file content");

        const trace = trail.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe("action");
        expect(decision.metadata?.api_endpoint).toBe("file:///etc/config.json");
      });
    });

    describe("trackServiceCall", () => {
      it("should track external service call", async () => {
        const mockServiceCall = jest.fn().mockResolvedValue({ status: "ok" });

        const result = await trail.trackServiceCall(
          "PaymentService",
          "Process payment",
          mockServiceCall,
          "/payments/charge"
        );

        expect(result).toEqual({ status: "ok" });

        const trace = trail.getTrace();
        const decision = trace.rootDecision.children[0];
        expect(decision.type).toBe("api_call");
        expect(decision.description).toBe("PaymentService: Process payment");
        expect(decision.metadata?.service).toBe("PaymentService");
        expect(decision.metadata?.api_endpoint).toBe("/payments/charge");
      });
    });

  });

  describe("finalize", () => {
    it("should set endTime and finalState", () => {
      const trace = trail.finalize("completed");

      expect(trace.endTime).toBeInstanceOf(Date);
      expect(trace.finalState).toBe("completed");
      expect(trace.endTime!.getTime()).toBeGreaterThanOrEqual(
        trace.startTime.getTime()
      );
    });

    it("should return a copy of the trace", () => {
      const trace1 = trail.finalize("completed");
      const trace2 = trail.getTrace();

      expect(trace1).not.toBe(trace2); // Different objects
      expect(trace1.finalState).toBe(trace2.finalState); // Same content
    });
  });

  describe("JSON serialization", () => {
    it("should serialize to JSON string", () => {
      trail.evaluateCondition("Test condition", () => true);
      const json = trail.toJSON();

      expect(typeof json).toBe("string");
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.processId).toBe("test-process-123");
      expect(parsed.rootDecision.children).toHaveLength(1);
    });

    it("should deserialize from JSON with date conversion", () => {
      trail.evaluateCondition("Test condition", () => true);
      const originalTrace = trail.finalize("completed");
      const json = trail.toJSON();

      const deserializedTrace = DecisionTrail.fromJSON(json);

      expect(deserializedTrace.processId).toBe(originalTrace.processId);
      expect(deserializedTrace.startTime).toBeInstanceOf(Date);
      expect(deserializedTrace.endTime).toBeInstanceOf(Date);
      expect(deserializedTrace.rootDecision.timestamp).toBeInstanceOf(Date);
      expect(
        deserializedTrace.rootDecision.children[0].timestamp
      ).toBeInstanceOf(Date);
    });
  });

  describe("complex branching scenarios", () => {
    it("should handle multiple levels of branching", () => {
      const level1 = trail.addDecision("condition", "Level 1");
      const level2a = level1.addDecision("action", "Level 2A");
      const level2b = level1.addDecision("action", "Level 2B");
      const level3 = level2a.addDecision("api_call", "Level 3");

      level1.setResult("level1_result");
      level2a.setResult("level2a_result");
      level2b.setResult("level2b_result");
      level3.setResult("level3_result");

      const trace = trail.getTrace();
      const rootChildren = trace.rootDecision.children;

      expect(rootChildren).toHaveLength(1);
      expect(rootChildren[0].children).toHaveLength(2);
      expect(rootChildren[0].children[0].children).toHaveLength(1);
      expect(rootChildren[0].children[1].children).toHaveLength(0);
    });
  });
});
