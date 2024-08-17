import { describe, expect, it } from "vitest";

describe("Does the test runner run?", () => {
  it("should pass CI", () => {
    expect(1).toBe(1);
  });
});
