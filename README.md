# Locale File Manager

## Manage locale files from a single source locale

DISCLAIMER: this package is in active development. it may have bugs or may not work as expected. Please feel free to contribute if interested!

There are two ways to use this package. In your code or from the command line.

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
npx locale_file_generator ./config.json
```

### Use in code

1. Install the package

```sh
npm i locale_file_generator
```

2. Import the following packages and configure the file manager

```ts
import { LocaleFileManager } from "locale_file_generator";
import {
  ConfigType,
  InMemoryConfigSchema,
  Locale,
} from "locale_file_generator/dist/lib";

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
