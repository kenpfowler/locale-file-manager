import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocaleFileWriter } from "./LocaleFileWriter";
import * as fs from "fs";
import * as path from "path";

// Mocking fs module
vi.mock("fs", () => {
  return {
    writeFileSync: vi.fn(),
  };
});

// Mocking path module (optional, but can help verify path.join calls)
vi.mock("path", () => {
  return {
    join: vi.fn((...args) => args.join("/")),
  };
});

describe("LocaleFileWriter", () => {
  let localeFileWriter: LocaleFileWriter;

  beforeEach(() => {
    localeFileWriter = new LocaleFileWriter();
  });

  it("should not write files for keys that do not exist", () => {
    const locales_path = "/locales";
    const locale_objects = {}; // Empty locale objects

    localeFileWriter.WriteLocaleFiles(locale_objects, locales_path);

    // Verify that fs.writeFileSync was never called
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should write locale files to the filesystem", () => {
    const locales_path = "/locales";
    const locale_objects = {
      en: { key1: "value1" },
      fr: { key1: "valeur1" },
    };

    localeFileWriter.WriteLocaleFiles(locale_objects, locales_path);

    // Verify that fs.writeFileSync was called with correct arguments
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/locales/en.json",
      JSON.stringify({ key1: "value1" }, null, 2),
      "utf-8"
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/locales/fr.json",
      JSON.stringify({ key1: "valeur1" }, null, 2),
      "utf-8"
    );

    // Ensure that path.join was called correctly (optional)
    expect(path.join).toHaveBeenCalledWith("/locales", "en.json");
    expect(path.join).toHaveBeenCalledWith("/locales", "fr.json");
  });
});
