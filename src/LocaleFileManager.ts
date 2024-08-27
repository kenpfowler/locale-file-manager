import { ConfigType, Config } from "./Config";
import { IStrategy } from "./IStrategy";
import { IGenerator } from "./IGenerator";
import { Difference } from "./Difference";
import { RecordWithUnknownValue } from "./Types";

import { LocaleFileValidator } from "./LocaleFileValidator";
import { LocaleFileGenerator } from "./LocaleFileGenerator";

import { InMemoryStrategy } from "./InMemoryStrategy";
import { FileSystemStrategy } from "./FileSystemStrategy";

import { Locale } from "./Locale";

import { diff, DiffDeleted, applyChange } from "deep-diff";
import z, { ZodTypeAny } from "zod";

/**
 * manages changes to a locales object given a source, list of locales, and previously generated locales
 */
export class LocaleFileManager {
  // config
  private readonly type: ConfigType;

  //  dependencies
  private readonly strategy: IStrategy;
  private readonly generator: IGenerator = new LocaleFileGenerator();
  private readonly validator: LocaleFileValidator = new LocaleFileValidator();

  // locales state
  private readonly locales: Locale[];
  private readonly source: object;
  private readonly source_locale: Locale;
  private readonly previous_output: object | null = null;
  private output: object = {};

  constructor(args: Config) {
    switch (args.type) {
      case ConfigType.FileSystem:
        this.type = args.type;
        this.strategy = new FileSystemStrategy({
          source_path: args.source_path,
          locales_path: args.locales_path,
          excluded_files: args.excluded_files,
        });
        this.locales = args.locales;
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
        this.locales = args.locales;
        this.source_locale = args.source_locale;
        this.type = args.type;
        break;
      default:
        throw Error("Invalid Configuration");
    }
  }

  public async GenerateAllLocaleFiles(
    locales: Locale[],
    source_locale: Locale,
    source: RecordWithUnknownValue
  ) {
    const masterSchema = this.getMasterSchema(locales, source);

    const result = await this.generator.GetLocaleTranslationsAsJSON(
      source,
      source_locale,
      locales
    );

    const validated = this.validator.ValidateLocaleTranslation<
      z.infer<typeof masterSchema>
    >(result, masterSchema);

    return {
      [source_locale]: source,
      ...validated,
    };
  }

  public LocalesArrayDifference(locales: Locale[], previous_locales: Locale[]) {
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

  public GetLocalesToAddRemoveFromDiff(diffs: Locale[], locales: Locale[]) {
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

  public IsLocalesChanged(diffs: Locale[]) {
    return !!diffs.length;
  }

  public async RemoveLocales(locales_to_remove: string[]) {
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
  public CreateKeyValue(path: string[], value: string | object) {
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
  public createSchemaFromObject(object: RecordWithUnknownValue) {
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
          throw Error(
            `value accessed by key: ${key} is type ${typeof object[
              key
            ]}, but has no keys. objects must not be empty`
          );
        } // Recursively create schema for nested objects
      } else {
        throw Error(
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
  public getMasterSchema(
    locales: Array<Locale>,
    source: RecordWithUnknownValue
  ) {
    const schemaShape: Partial<Record<Locale, ZodTypeAny>> = {};

    if (!Object.keys(source).length) {
      throw Error("Cannot create schema from empty object");
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

  public async Manage() {
    // 1. there is a source file and no previous generation has been made.
    // action: manager should generate all locale files and all of their key - values
    if (!this.HasPreviousOutput()) {
      this.output = await this.GenerateAllLocaleFiles(
        this.locales,
        this.source_locale,
        this.GetSourceLocaleObject()
      );

      console.log("Generated locale objects");
      return this.strategy.OutputLocales(this.output);
    }

    // 2. a locale is added and/or removed.
    // action: manager should generate the added locale and/or remove a deleted locale
    // lets add a getter method that ensures this value we're passing is valid
    if (!this.previous_output) {
      throw Error("Previous output does not exist!");
    }

    const diff = this.LocalesArrayDifference(
      this.locales,
      Object.keys(this.previous_output) as Locale[]
    );

    const batch = this.GetLocalesToAddRemoveFromDiff(diff, this.locales);

    if (this.IsLocalesChanged(diff)) {
      if (batch.add.length) {
        this.output = await this.GenerateAllLocaleFiles(
          batch.add,
          this.source_locale,
          this.GetSourceLocaleObject()
        );

        console.log(`Added the following locale(s): ${batch.add.join(", ")}`);
      }

      if (batch.remove.length) {
        this.RemoveLocales(batch.remove);
        console.log(
          `Removed the following locale(s): ${batch.remove.join(", ")}`
        );
      }
    }

    // 3. it's possible that locales was not changed, but that the source file was changed.
    // OR locales was changed and the source file was changed
    // what changes could the user make...
    // (add a property to the source, remove a property from the source, change the value for one of the sources keys. change the name of one of the source keys)
    const changes = this.GetSourceAndLocaleDiff();

    // NOTE: for the locales that were just generated we have the latest changes so we don't need to compare the objects
    // currently we just look in the locales folder for all the files
    // if something was removed from the locales folder this wont be compared so thats fine
    // if something was just added it would be compared though it does not need to be.
    // lets provide the locales less any just generated locales as an arg

    if (!changes) {
      // FIXME: this log does not not make sense.  EX: we add/remove a locale and generate.
      // this makes is seem like we have not made any changes nor have we generated anything, but we have.
      // we're ready to conclude the program AND we have potentially made a generation.
      console.log(
        "Source file is identical to locales. Make changes before generating new files."
      );
      return this.strategy.OutputLocales(this.output);
    }

    const deletions: DiffDeleted<object>[] = [];

    const value = changes.reduce((accumulator, currentValue) => {
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
        // FIXME:
        // can we add deleted keys too an array while we reduce?

        if (currentValue.kind === Difference.Deleted)
          deletions.push(currentValue);
      }

      return accumulator;
    }, {});

    const result = await this.GenerateAllLocaleFiles(
      this.locales,
      this.source_locale,
      value
    );

    for (const key in this.output) {
      if (Object.prototype.hasOwnProperty.call(this.output, key)) {
        //@ts-ignore
        this.output[key] = { ...this.output[key], ...result[key] };
        for (let index = 0; index < deletions.length; index++) {
          const element = deletions[index];
          if (element) {
            //@ts-ignore
            applyChange(this.output[key], undefined, element);
          }
        }
      }
    }

    console.log("Finished generating!");
    return this.strategy.OutputLocales(this.output);
  }
}
