import { Locale } from "./Locale";

export interface IGenerator {
  handleChatCompletion: (
    source_locale: Locale,
    target_locales: Locale[],
    source: object
  ) => Promise<string>;
}
