import { RecordWithUnknownValue } from "./types";

export interface IStrategy {
  GetLocalesSource: (source?: string) => RecordWithUnknownValue;
  GetPreviousLocales: (source?: string) => RecordWithUnknownValue | null;
  RemoveLocale: (key: string, locales: RecordWithUnknownValue) => void;
  OutputLocales: (locales: RecordWithUnknownValue) => Promise<void | string>;
}
