export interface IStrategy {
  GetLocalesSource: (source?: string) => object;
  GetPreviousLocales: (source?: string) => object | null;
  RemoveLocale: (key: string, locales: object) => void;
  OutputLocales: (locales: object) => Promise<void | string>;
}
