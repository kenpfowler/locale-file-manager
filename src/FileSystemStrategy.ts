import * as fs from "fs";
import * as path from "path";
import z from "zod";

import { IStrategy } from "./IStrategy";
import { LocaleFileWriter } from "./LocaleFileWriter";
import { LocaleFileValidator } from "./LocaleFileValidator";
import { RecordWithUnknownValue } from "./Types";
import { FileSystemConfigSchema } from "./Config";

export type FileSystemStrategyArgs = Pick<
  z.infer<typeof FileSystemConfigSchema>,
  "excluded_files" | "locales_path" | "source_path"
>;

export class FileSystemStrategy implements IStrategy {
  // dependencies
  private readonly writer = new LocaleFileWriter();
  private readonly validator = new LocaleFileValidator();

  // locales state
  private readonly locales_path: string;
  private readonly excluded_files: string[];
  private readonly generated_locale_file_names: string[];

  // sources state
  private readonly source_path: string;
  private readonly source: RecordWithUnknownValue | null = null;

  constructor({
    source_path,
    locales_path,
    excluded_files,
  }: FileSystemStrategyArgs) {
    this.locales_path = locales_path;
    this.source_path = source_path;
    this.excluded_files = excluded_files ?? [];

    this.EnsureLocalesFolderExists();
    this.generated_locale_file_names = this.GetLocaleFileNames();
  }

  private EnsureLocalesFolderExists(): void {
    if (!fs.existsSync(this.GetFullLocalesPath())) {
      fs.mkdirSync(this.GetFullLocalesPath(), { recursive: true });
    }
  }

  public GetSourceLocaleObject() {
    if (this.validator.isObject(this.source)) {
      return this.source as RecordWithUnknownValue;
    }

    return this.readJSONFile(
      path.join(process.cwd(), this.source_path)
    ) as RecordWithUnknownValue;
  }

  private readJSONFile(filePath: string) {
    const maybeJSON = fs.readFileSync(filePath, "utf8");

    if (maybeJSON.length === 0) {
      throw Error(`File should be in JSON format at: ${filePath}`);
    }

    const file = this.validator.parseJSON(fs.readFileSync(filePath, "utf8"));
    return file;
  }

  private GetLocaleFileNames() {
    if (this.generated_locale_file_names) {
      return this.generated_locale_file_names;
    }

    const locales = fs.readdirSync(this.locales_path);
    return locales.filter((locale) => this.excluded_files.includes(locale));
  }

  private GetFullLocalesPath() {
    return path.join(process.cwd(), this.locales_path);
  }

  private GetLocaleObjectFromLocales(fileName: string) {
    return this.readJSONFile(path.join(this.locales_path, fileName));
  }

  public GetPreviousLocales() {
    const locales_to_update = this.GetLocaleFileNames();

    if (locales_to_update.length === 0) {
      return null;
    }
    const locales = {};

    locales_to_update.forEach((locale) => {
      const object = this.GetLocaleObjectFromLocales(locale);
      // @ts-ignore
      locales[locale.split(".")[0] as string] = object;
    });

    return locales;
  }

  public GetLocalesSource() {
    const source = this.readJSONFile(
      path.join(process.cwd(), this.source_path)
    );

    return source;
  }

  public RemoveLocale(key: string, output: object) {
    // @ts-ignore
    delete output[key];
    fs.unlinkSync(
      path.join(path.join(process.cwd(), this.locales_path), `${key}.json`)
    );
  }

  public async OutputLocales(locales: object) {
    return this.writer.WriteLocaleFiles(locales, this.locales_path);
  }
}
