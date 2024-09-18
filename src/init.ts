#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

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
    console.log(`Created directory: ${dir}`);
  }
};

const createFile = (filePath: string, content: string) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
  }
};

const initProject = () => {
  console.log("Initializing locale file manager setup...");

  dirs.forEach((dir) => createDir(path.join(process.cwd(), dir)));

  for (const [filePath, content] of Object.entries(files)) {
    createFile(path.join(process.cwd(), filePath), content);
  }

  console.log("Setup complete!");
};

initProject();
