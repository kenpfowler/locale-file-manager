import { ZodSchema } from "zod";
import { RecordWithUnknownValue } from "./types";

/**
 * validates that locale file data was created successfully
 */
export class LocaleFileValidator {
  public isString(value: unknown): value is string {
    return typeof value === "string";
  }

  public isObject(obj: unknown): obj is object {
    return typeof obj === "object" && obj !== null;
  }

  public isRecordWithUnknownValue<T = unknown>(
    obj: unknown
  ): obj is RecordWithUnknownValue<T> {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
  }

  public parseJSON(source: string) {
    const object = JSON.parse(source);

    if (!this.isRecordWithUnknownValue(object)) {
      throw Error("JSON.parse did not return a javascript object");
    }

    return object;
  }

  public ValidateLocaleTranslation<T>(
    source: string | null | undefined,
    schema: ZodSchema<T>
  ) {
    if (!this.isString(source)) {
      throw Error("argument for property source should be type string");
    }
    const parsed = this.parseJSON(source);
    const validated = schema.parse(parsed);
    return validated;
  }
}
