import { Locale } from "./Locale";

export interface IGenerator {
  GetLocaleTranslationsAsJSON: (
    source: object,
    default_locale: Locale,
    locales: Locale[]
  ) => Promise<string | null>;
}
