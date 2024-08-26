# Locale File Manager

## Manage locale files from a single source locale

_DISCLAIMER: this package is in active development. it may have bugs or may not work as expected. Please feel free to contribute if interested!_

There are two ways to use this package. In your code or from the command line.

### Head over to the demo webpage

[Visit the demo website](https://www.localebliss.com/)

### Use from command line

1. Configure your project by adding the following files/folder to the root of your project:

| item        | type   | description                              |
| ----------- | ------ | ---------------------------------------- |
| locales     | folder | holds locale files                       |
| config.json | file   | configuration                            |
| en.json     | file   | source locale file (can be any language) |
| .env        | file   | openai api key                           |

2. Configure your project in config.json

```json
{
  "locales": ["en", "fr-CA"],
  "locales_path": "locales",
  "source_path": "en.json",
  "source_locale": "en"
}
```

3. Add your locale file to en.json

```json
{ "greeting": "Hello, World!" }
```

4. Add your openai api key to your .env file

```sh
OPENAI_API_KEY="your-api-key"
```

5. Call the program and point to your configuration file

```sh
npx locale-file-manager ./config.json
```

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
