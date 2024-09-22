# Locale File Manager

## Manage locale files from a single source locale

_DISCLAIMER: this package is in active development. it may have bugs or may not work as expected. Please feel free to contribute if interested!_

[Head over to the demo webpage to try it out.](https://www.localebliss.com/)

There are two ways to use this package. In your code or from the command line.

### Use from command line

1. Install the package

```sh
npm i -D locale-file-manager
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

5. Provide values to your configuration file.

_Locales must follow syntax outlined in the article [Tags for Identifying Languages](https://datatracker.ietf.org/doc/html/rfc5646)_

```json
{
  "target_locales": ["en", "fr", "pt", "es"],
  "locales_path": "path-to-locales-folder",
  "source_path": "path-to-source-locale-file",
  "source_locale": "en"
}
```

6. Call the program and point to your configuration file to manage locales

```sh
npx locale-file-manager-cli ./config.json
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

const config: z.infer<typeof InMemoryConfigSchema> = {
  previous_output,
  source,
  source_locale
  target_locales,
  type: ConfigType.InMemory,
};

const context = new LocaleFileManager(config);
const result = await context.Manage();
```
