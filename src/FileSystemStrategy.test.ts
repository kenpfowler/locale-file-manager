import { describe, it, expect, beforeEach, vi } from "vitest";
import { FileSystemStrategy } from "./FileSystemStrategy";
import * as fs from "fs";
import * as path from "path";

// Mock fs methods
vi.mock("fs");

describe("FileSystemStrategy", () => {
  const source_path = "source.json";
  const locales_path = "locales";

  let strategy: FileSystemStrategy;

  beforeEach(() => {
    strategy = new FileSystemStrategy({
      source_path,
      locales_path,
    });
  });

  describe("EnsureLocalesFolderExists", () => {
    it("should create locales folder if it does not exist", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, "mkdirSync");

      strategy["EnsureLocalesFolderExists"]();

      expect(mkdirSpy).toHaveBeenCalledWith(
        path.join(process.cwd(), locales_path),
        { recursive: true }
      );
    });

    it("should not create folder if it already exists", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      const mkdirSpy = vi.spyOn(fs, "mkdirSync");

      strategy["EnsureLocalesFolderExists"]();

      expect(mkdirSpy).not.toHaveBeenCalled();
    });
  });

  describe("GetSourceLocaleObject", () => {
    it("should return source locale object if valid", () => {
      const sourceData = { key: "value" };
      vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(sourceData));

      const result = strategy.GetSourceLocaleObject();

      expect(result).toEqual(sourceData);
    });

    it("should throw error if file is not valid JSON", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("");

      expect(() => strategy.GetSourceLocaleObject()).toThrow(
        "File should be in JSON format"
      );
    });
  });

  describe("GetPreviousLocales", () => {
    it("should return null if no locales to update", () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue([]);

      const result = strategy.GetPreviousLocales();

      expect(result).toBeNull();
    });
  });
});
