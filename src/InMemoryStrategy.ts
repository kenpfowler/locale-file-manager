import { IStrategy } from "./IStrategy";
import { LocaleFileValidator } from "./LocaleFileValidator";
import { RecordWithUnknownValue } from "./types";

export class InMemoryStrategy implements IStrategy {
  private readonly validator = new LocaleFileValidator();

  public GetLocalesSource(source?: string) {
    if (!source) {
      throw new Error("Must supply value for source");
    }

    return this.validator.parseJSON(source);
  }

  public GetPreviousLocales(previous_output?: string) {
    if (!previous_output) return null;

    return this.validator.parseJSON(previous_output);
  }

  public RemoveLocale(key: string, output: RecordWithUnknownValue) {
    delete output[key];
  }

  public async OutputLocales(locales: RecordWithUnknownValue) {
    return JSON.stringify(locales);
  }
}
