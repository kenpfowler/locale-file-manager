import { ConfigType, Config } from "./Config";
import { IStrategy } from "./IStrategy";
import { IGenerator } from "./IGenerator";
import { Difference } from "./Difference";
import { RecordWithUnknownValue } from "./types";

import { LocaleFileValidator } from "./LocaleFileValidator";
import { LocaleFileGenerator } from "./LocaleFileGenerator";

import { InMemoryStrategy } from "./InMemoryStrategy";
import { FileSystemStrategy } from "./FileSystemStrategy";

import { Locale } from "./Locale";

import { diff, DiffDeleted, applyChange, Diff } from "deep-diff";
import z, { ZodTypeAny } from "zod";
import { Action, Logger } from "./Logger";

/**
 * manages changes to a locales object given a source, list of locales, and previously generated locales
 */
export class LocaleFileManager {
  // config
  private readonly type: ConfigType;

  //  dependencies
  private generator: IGenerator = new LocaleFileGenerator();
  private readonly strategy: IStrategy;
  private readonly validator: LocaleFileValidator = new LocaleFileValidator();

  // locales state
  private readonly target_locales: Locale[];
  private readonly source: RecordWithUnknownValue;
  private readonly source_locale: Locale;
  private readonly previous_output: RecordWithUnknownValue | null = null;
  private output: RecordWithUnknownValue = {};

  constructor(args: Config) {
    switch (args.type) {
      case ConfigType.FileSystem:
        this.type = args.type;
        this.strategy = new FileSystemStrategy({
          source_path: args.source_path,
          locales_path: args.locales_path,
          excluded_files: args.excluded_files,
        });
        this.target_locales = args.target_locales;
        this.source_locale = args.source_locale;
        this.source = this.strategy.GetLocalesSource();
        this.previous_output = this.strategy.GetPreviousLocales();
        break;
      case ConfigType.InMemory:
        this.strategy = new InMemoryStrategy();
        this.previous_output = this.strategy.GetPreviousLocales(
          args.previous_output
        );
        this.source = this.strategy.GetLocalesSource(args.source);
        this.target_locales = args.target_locales;
        this.source_locale = args.source_locale;
        this.type = args.type;
        break;
      default:
        throw new Error("Invalid Configuration");
    }
  }

  public useCustomGenerator(generator: IGenerator) {
    this.generator = generator;
  }

  private async GenerateAllLocaleFiles(
    target_locales: Locale[],
    source_locale: Locale,
    source: RecordWithUnknownValue
  ) {
    const masterSchema = this.getMasterSchema(target_locales, source);

    const result = await this.generator.handleChatCompletion(
      source_locale,
      target_locales,
      source
    );

    const validated = this.validator.ValidateLocaleTranslation<
      z.infer<typeof masterSchema>
    >(result, masterSchema);

    return {
      [source_locale]: source,
      ...validated,
    };
  }

  private LocalesArrayDifference(
    locales: Locale[],
    previous_locales: Locale[]
  ) {
    const locales_set = new Set(locales);
    const previous_locales_set = new Set(previous_locales);

    const diff1 = Array.from(locales_set).filter(
      (locale) => !previous_locales_set.has(locale)
    );

    const diff2 = Array.from(previous_locales_set).filter(
      (locale) => !locales_set.has(locale)
    );

    return diff1.concat(diff2);
  }

  private GetLocalesToAddRemoveFromDiff(diffs: Locale[], locales: Locale[]) {
    const user_locales = new Set(locales);
    const batch: { add: Locale[]; remove: string[] } = { add: [], remove: [] };

    diffs.forEach((diff) => {
      if (user_locales.has(diff)) {
        batch.add.push(diff);
      } else {
        batch.remove.push(diff);
      }
    });

    return batch;
  }

  private IsLocalesChanged(diffs: Locale[]) {
    return !!diffs.length;
  }

  private async RemoveLocales(locales_to_remove: string[]) {
    if (!locales_to_remove.length) return;

    for (let index = 0; index < locales_to_remove.length; index++) {
      const key = locales_to_remove[index];
      this.strategy.RemoveLocale(key, this.output);
    }
  }

  /**
   *
   * @param path an array of keys to follow where the value will be stored. the last key in the path array is the most deeply nested
   * @param value
   * @returns an object where the value provided is nested given an path of keys
   */
  private CreateKeyValue(path: string[], value: string | object) {
    let obj = {};

    for (let index = path.length - 1; index >= 0; index--) {
      const key = path[index];

      if (index === path.length - 1) {
        // @ts-ignore
        obj[key] = value;
      } else {
        // @ts-ignore
        obj = { [key]: { ...obj } };
      }
    }

    return obj;
  }

  /**
   * @param object object used as the source of your translation file
   * @returns a zod schema that can be used to validate the object used as the param
   */
  private createSchemaFromObject(object: RecordWithUnknownValue) {
    const schemaShape: Record<string, ZodTypeAny> = {};

    // this loop will take an object that is arbitrarily deep and create a schema used to validate that object
    for (const key in object) {
      if (typeof object[key] === "string") {
        schemaShape[key] = z.string();
      } else if (typeof object[key] === "object" && object[key] !== null) {
        if (Object.keys(object[key]).length) {
          schemaShape[key] = this.createSchemaFromObject(
            object[key] as RecordWithUnknownValue
          );
        } else {
          throw new Error(
            `value accessed by key: ${key} is type ${typeof object[
              key
            ]}, but has no keys. objects must not be empty`
          );
        } // Recursively create schema for nested objects
      } else {
        throw new Error(
          `value accessed by key: ${key} is type ${typeof object[
            key
          ]}.  all values should be string or object`
        );
      }
    }

    return z.object(schemaShape);
  }

  /**
   *
   * @param locales locale keys to provide validation for
   * @param source source locale file used to create validation schema
   * @returns a zod object where they keys are locales and the value is a schema mapped to the users source locale file
   */
  private getMasterSchema(
    locales: Array<Locale>,
    source: RecordWithUnknownValue
  ) {
    const schemaShape: Partial<Record<Locale, ZodTypeAny>> = {};

    if (!Object.keys(source).length) {
      throw new Error("Cannot create schema from empty object");
    }

    const localeSchema = this.createSchemaFromObject(source);

    locales.forEach((locale) => {
      schemaShape[locale] = localeSchema;
    });

    return z.object(schemaShape);
  }

  // FIXME: this does not do anything to narrow our type.
  // we should narrow the data type in the constructor maybe to be
  // RecordWithUnknownValue
  private GetSourceLocaleObject() {
    return this.source as RecordWithUnknownValue;
  }

  private GetSourceAndLocaleDiff() {
    const changes = diff(
      // FIXME: this is very confusing.  Does it read the last representation of the source from the locales directory?
      // @ts-ignore
      this.previous_output[this.source_locale],
      this.GetSourceLocaleObject()
    );

    return changes;
  }

  private HasPreviousOutput() {
    return !!this.previous_output;
  }

  private GetDifferencesAndDeletions(
    diffs: Diff<any, RecordWithUnknownValue>[]
  ) {
    const deletions: DiffDeleted<object>[] = [];

    const diff_object = diffs.reduce((accumulator, currentValue) => {
      if (
        currentValue.kind === Difference.New ||
        currentValue.kind === Difference.Edited
      ) {
        return {
          ...accumulator,
          ...this.CreateKeyValue(
            currentValue.path as string[],
            currentValue.rhs
          ),
        };
      } else {
        if (currentValue.kind === Difference.Deleted)
          deletions.push(currentValue);
      }

      return accumulator;
    }, {});

    return { diff_object, deletions };
  }

  private deepMerge<T extends object, U extends object>(
    target: T,
    source: U
  ): T & U {
    const output = { ...target } as T & U;

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === "object" &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof output[key] === "object" &&
          output[key] !== null &&
          !Array.isArray(output[key])
        ) {
          output[key] = this.deepMerge(output[key], source[key]);
        } else {
          output[key] = source[key] as any;
        }
      }
    }

    return output;
  }

  private ApplyDifferences(
    diff_object_generations: RecordWithUnknownValue,
    deletions: DiffDeleted<object>[]
  ) {
    for (const key in diff_object_generations) {
      if (Object.prototype.hasOwnProperty.call(diff_object_generations, key)) {
        this.output[key] = this.deepMerge(
          //@ts-ignore
          this.previous_output[key],
          //@ts-ignore
          diff_object_generations[key]
        );

        for (let index = 0; index < deletions.length; index++) {
          const element = deletions[index];

          if (element) {
            //@ts-ignore
            applyChange(this.output[key], undefined, element);
          }
        }
      }
    }
  }

  public async Manage() {
    // 1. there is a source file and no previous generation has been made.
    // action: manager should generate all locale files and all of their key - values
    if (!this.HasPreviousOutput()) {
      this.output = await this.GenerateAllLocaleFiles(
        this.target_locales,
        this.source_locale,
        this.GetSourceLocaleObject()
      );

      Logger.message(Action.Managing, "output is ready");
      return this.strategy.OutputLocales(this.output);
    }

    // 2. a locale is added and/or removed.
    // action: manager should generate the added locale and/or remove a deleted locale
    if (!this.previous_output) {
      throw new Error("Previous output does not exist!");
    }

    const diff = this.LocalesArrayDifference(
      this.target_locales,
      Object.keys(this.previous_output) as Locale[]
    );

    const batch = this.GetLocalesToAddRemoveFromDiff(diff, this.target_locales);

    if (this.IsLocalesChanged(diff)) {
      if (batch.add.length) {
        this.output = await this.GenerateAllLocaleFiles(
          batch.add,
          this.source_locale,
          this.GetSourceLocaleObject()
        );

        Logger.message(
          Action.Managing,
          `added the following locale(s): ${batch.add.join(", ")}`
        );
      }

      if (batch.remove.length) {
        this.RemoveLocales(batch.remove);
        Logger.message(
          Action.Managing,
          `removed the following locale(s): ${batch.remove.join(", ")}`
        );
      }
    }

    // 3. it's possible that locales was not changed, but that the source file was changed.
    // OR locales was changed AND the source file was changed

    // what changes could the user make...
    // (add a property to the source, remove a property from the source, change the value for one of the sources keys. change the name of one of the source keys)
    const source_locale_diffs = this.GetSourceAndLocaleDiff();

    if (!source_locale_diffs) {
      Logger.message(Action.Managing, "output is ready");
      return this.strategy.OutputLocales(this.output);
    }

    const { diff_object, deletions } =
      this.GetDifferencesAndDeletions(source_locale_diffs);

    const diff_object_generations = await this.GenerateAllLocaleFiles(
      this.target_locales,
      this.source_locale,
      diff_object
    );

    this.ApplyDifferences(diff_object_generations, deletions);

    Logger.message(Action.Managing, "output is ready");
    return this.strategy.OutputLocales(this.output);
  }
}
