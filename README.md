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

5. Configure your configuration file.

```json
{
  "target_locales": [
    "array",
    "of",
    "locales",
    "to",
    "create",
    "generations",
    "for"
  ],
  "locales_path": "path-to-locales-folder",
  "source_path": "path-to-source-locale-file",
  "source_locale": "language-of-source-locale-file"
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

3. Use the result for whatever your like.

# TODO:

Prepare for 1.0 release

- Goal: Manage locale files with minimal effort and efficient use of AI output.

1. Add appropriate error handling and logging
2. Create a testing plan (e2e, integration, unit)
3. OpenAI should not be dependency. User should be able to supply their own generations as long as it implements interface that works with program.
4. Add metadata to source locale fields.
   Have some locales been professionally translated or approved? Maybe we want to lock these so they are not overridden when new generations are made.
   ex:

   ```json
   { "greeting": { "value": "Hello, World!", "isLocked": ["es"] } }
   ```

   This would create generations for all configured locales except for spanish

- Keep README.md document updated
- Might consider removing deep-diff dependency since it is no longer maintained
- Unexpected behavior when there are duplicate keys. Key gets overridden with last vale.
- What if the user only changes the name of the key? We don't want to create a new generation.
- Program is slow to generate. Provide feedback that it is working. Make faster?
- Could we add versioning to the package? Maybe it could save an array of minified strings/ object where key is locale - value is minified string

# ERRORS

## ERROR: Program cannot process large generations (is there a token limit?)

### steps to reproduce my error

1. create a large generation task,
2. call the program.
3. after the generation the validator will throw a SyntaxError: Unexpected end of json output

Call stack
SyntaxError: Unexpected end of JSON input
at JSON.parse (<anonymous>)
at LocaleFileValidator.parseJSON (/home/ken/Development/locale_file_generator_web_client/node_modules/locale-file-manager/dist/cli.js:857:25)
at LocaleFileValidator.ValidateLocaleTranslation (/home/ken/Development/locale_file_generator_web_client/node_modules/locale-file-manager/dist/cli.js:867:25)
at LocaleFileManager.<anonymous> (/home/ken/Development/locale_file_generator_web_client/node_modules/locale-file-manager/dist/cli.js:1109:40)

## ERROR: If there is a change to the source locale and a new locale being added at the same time, the change will be applied, but the new locale will ONLY receive the change.

FUTURE: This is a point of failure in the application. The user could try to generate an arbitrarily large file. How can we stress test against this. How can we guarantee they will get an output?

### steps to reproduce my error

1. add a new locale to the config object
2. edit the source locale
3. call program

The edit will be properly applied to my existing locales, but the new locale will ONLY have the edited field. It looks the the rest of the generation was lost.

## ERROR: The source locale generation is unnecessarily changed when creating a new generation.

NOTE: Not sure how to reproduce this.

1. Added a new generation
2. Call the cli

The replica of the source object is changed, but I didn't add any changed. Maybe its a change in the order of the keys - the information is the same but on a different line.

### ERROR: The user inputs code as a field in their translation object to manipulate the web client.

????
