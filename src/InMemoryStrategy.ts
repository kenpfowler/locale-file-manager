import { IStrategy } from "./LocaleFileManager";
import { LocaleFileValidator } from "./LocaleFileValidator";

export class InMemoryStrategy implements IStrategy {
  private readonly validator = new LocaleFileValidator();

  public GetLocalesSource(source?: string) {
    if (!source) {
      throw Error("Must supply value for source");
    }

    return this.validator.parseJSON(source);
  }

  public GetPreviousLocales(previous_output?: string) {
    if (!previous_output) return null;

    return this.validator.parseJSON(previous_output);
  }

  public RemoveLocale(key: string, output: object) {
    // @ts-ignore
    delete output[key];
  }

  public async OutputLocales(locales: object) {
    return JSON.stringify(locales);
  }
}
