#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { readConfig } from "./helpers";
import { ConfigType } from "./Config";
import { LocaleFileManager } from "./LocaleFileManager";

const main = async () => {
  try {
    // Get the config file path from command-line arguments
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.error("Please provide a path to the config file.");
      process.exit(1);
    }

    const configFilePath = path.resolve(args[0]);

    // Check if the config file exists
    if (!fs.existsSync(configFilePath)) {
      console.error(`Config file not found: ${configFilePath}`);
      process.exit(1);
    }

    // Load and process the config file
    const config = readConfig(configFilePath);

    // Your package logic goes here
    console.log("Config loaded successfully:", config);

    const context = new LocaleFileManager({
      type: ConfigType.FileSystem,
      ...config,
    });

    await context.Manage();
  } catch (error) {
    console.error(error);
  }
};

main();
