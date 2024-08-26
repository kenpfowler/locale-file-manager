# Locale File Manager

## Manage locale files from a single source locale

_DISCLAIMER: this package is in active development. it may have bugs or may not work as expected. Please feel free to contribute if interested!_

There are two ways to use this package. In your code or from the command line.

### Head over to the demo webpage

[Visit the demo website](https://www.localebliss.com/)

### Use from command line

1. Install the package

```sh
npm i locale-file-manager
```

2. Run the init command to scaffold the necessary configuration files. It will create the following items:

```sh
npx locale-file-manager-init
```

| item        | type   | description                              |
| ----------- | ------ | ---------------------------------------- |
| locales     | folder | holds generated locale files             |
| config.json | file   | configures program                       |
| en.json     | file   | source locale file (can be any language) |
| .env        | file   | openai api key                           |

3. Add your openai api key to your .env file

```sh
OPENAI_API_KEY="your-api-key"
```

4. Configure your source locale file with your desired translations.

```json
{ "greeting": "Hello, World!" }
```

5. Configure your configuration file.

````json
{
  "locales": ["array", "of", "locales", "to", "create", "generations", "for"],
  "locales_path": "path-to-locales-folder",
  "source_path": "path-to-source-locale-file",
  "source_locale": "language-of-source-locale-file"
}


6. Call the program and point to your configuration file to manage locales

```sh
npx locale-file-manager-cli ./config.json
````

### Use in code

1. Install the package

```sh
npm i locale-file-manager
```

2. Import the following packages and configure the file manager

```ts
import { LocaleFileManager } from "locale-file-manager";
import {
  ConfigType,
  InMemoryConfigSchema,
  Locale,
} from "locale-file-manager/dist/lib";

const config: typeof InMemoryConfigSchema = {
  output,
  source,
  source_locale,
  locales,
  type: ConfigType.InMemory,
};

const context = new LocaleFileManager(config);
const result = await context.Manage();
```

3. Use the result for whatever your like.

# TODO:

Prepare for 1.0 release

- Goal: Manage locale files with minimal effort and efficient use of AI output.

- Unit test classes
- Keep README.md document updated
- OpenAI should not be dependency. User should be able to supply their own generations as long as it implements interface that works with program.
- Might consider removing deep-diff dependency since it is no longer maintained
- Add appropriate error handling and logging
- Unexpected behavior when there are duplicate keys. Key gets overridden with last vale.
