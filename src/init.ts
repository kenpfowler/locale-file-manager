#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { Action, Logger } from "./Logger";

// Define the paths and default contents
const dirs = ["locales"];
const files: { [key: string]: string } = {
  "config.json": `{
  "target_locales": ["en", "fr-CA"],
  "locales_path": "locales",
  "source_path": "en.json",
  "source_locale": "en"
}`,
  "en.json": `{
  "greeting": "Hello, World!"
}`,
  ".env": `OPENAI_API_KEY="your-api-key"`,
};

const createDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    Logger.message(Action.Initializing, `created directory: ${dir}`);
  }
};

const createFile = (filePath: string, content: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    Logger.message(Action.Initializing, `created file: ${filePath}`);
  }
};

const initProject = () => {
  Logger.message(
    Action.Initializing,
    "initializing locale file manager setup..."
  );

  dirs.forEach((dir) => createDir(path.join(process.cwd(), dir)));

  for (const [filePath, content] of Object.entries(files)) {
    createFile(path.join(process.cwd(), filePath), content);
  }

  Logger.message(Action.Initializing, "setup complete");
};

initProject();
