import { LocaleFileValidator } from "./LocaleFileValidator";
import { z, ZodSchema } from "zod";
import { describe, it, expect, beforeEach } from "vitest";

describe("LocaleFileValidator", () => {
  let validator: LocaleFileValidator;

  beforeEach(() => {
    validator = new LocaleFileValidator();
  });

  it("should validate that the source is a string", () => {
    const source = '{"key": "value"}';
    expect(validator.isString(source)).toBe(true);
  });

  it("should validate that the parsed JSON is an object", () => {
    const source = '{"key": "value"}';
    const parsed = validator.parseJSON(source);
    expect(validator.isObject(parsed)).toBe(true);
  });

  it("should throw an error if JSON.parse does not return an object", () => {
    const invalidSource = '"string"';
    expect(() => validator.parseJSON(invalidSource)).toThrow(
      "JSON.parse did not return a javascript object"
    );
  });

  it("should validate locale translation based on the schema", () => {
    const source = '{"key": "value"}';
    const schema: ZodSchema = z.object({
      key: z.string(),
    });

    const result = validator.ValidateLocaleTranslation(source, schema);
    expect(result).toEqual({ key: "value" });
  });

  it("should throw an error if the source is not a string", () => {
    const source: any = null;
    const schema: ZodSchema = z.object({
      key: z.string(),
    });

    expect(() => validator.ValidateLocaleTranslation(source, schema)).toThrow(
      "argument for property source should be type string"
    );
  });

  it("should throw an error if the JSON does not match the schema", () => {
    const source = '{"key": 123}'; // Invalid based on schema
    const schema: ZodSchema = z.object({
      key: z.string(),
    });

    expect(() => validator.ValidateLocaleTranslation(source, schema)).toThrow();
  });
});
