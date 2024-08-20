import { z } from "zod";
import { Locale } from "./Locale";
import fs from "fs";

const ConfigSchema = z.object({
  locales: z.array(z.nativeEnum(Locale)),
  locales_path: z.string(),
  source_path: z.string(),
  source_locale: z.nativeEnum(Locale),
});

export function readConfig(filePath: string) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const config = JSON.parse(fileContent);

  const result = ConfigSchema.safeParse(config);

  if (!result.success) {
    console.error("Invalid configuration:", result.error.errors);
    throw new Error("Invalid configuration file");
  }

  return result.data;
}
