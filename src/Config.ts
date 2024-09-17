import { z } from "zod";
import { Locale } from "./Locale";

export enum ConfigType {
  InMemory,
  FileSystem,
}

export const InMemoryConfigSchema = z.object({
  type: z.literal(ConfigType.InMemory),
  target_locales: z.array(z.nativeEnum(Locale)),
  source_locale: z.nativeEnum(Locale),
  source: z.string(),
  previous_output: z.string(),
});

export const FileSystemConfigSchema = z.object({
  type: z.literal(ConfigType.FileSystem),
  target_locales: z.array(z.nativeEnum(Locale)),
  excluded_files: z.optional(z.array(z.string())),
  locales_path: z.string(),
  source_path: z.string(),
  source_locale: z.nativeEnum(Locale),
});

const ConfigUnion = z.discriminatedUnion("type", [
  FileSystemConfigSchema,
  InMemoryConfigSchema,
]);

export type Config = z.infer<typeof ConfigUnion>;
