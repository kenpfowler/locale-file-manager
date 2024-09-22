import * as dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
import { getEncoding, getEncodingNameForModel } from "js-tiktoken";

import { OpenAI } from "openai";
import { Locale } from "./Locale";
import { IGenerator } from "./IGenerator";
import { locale_token_multiplier } from "./TokenMultiplier";

/**
 * wrapper for the open ai client that can be configured to generate locale files from a single source file
 */
export class LocaleFileGenerator implements IGenerator {
  /**
   * open ai client
   */
  private readonly client: OpenAI;
  private readonly system_prompt_text =
    "You are a language translation assistant designed to help users translate locale files from one language to another. Given a JSON object representing a locale in the source language, the locale code for that language, and locale code of the target languages, your task is to translate the content into the target language(s) while preserving the JSON structure.\n- Retain the structure and keys of the source JSON.\n- Translate the values accurately according to the provided source and target languages.\n- Do not translate technical terms or placeholders like `{name}`, `{count}`, or HTML tags.";
  private readonly model = "gpt-4o-mini";
  private readonly output_token_limit = 16384;
  private readonly context_window_token_limit = 128000;
  private readonly default_translation_token_multiplier = 2;
  private readonly prompt_token_threshold =
    this.context_window_token_limit - this.output_token_limit;

  constructor() {
    this.client = new OpenAI({ apiKey: this.GetApiKey() });
  }

  /**
   * Returns the total number of tokens for the given prompts.
   * This method encodes each prompt using the appropriate encoding for the model
   * and calculates the total number of tokens across all prompts.
   *
   * @param {...string[]} prompts - The prompts to be encoded and tokenized.
   * @returns {number} - The total number of tokens for the given prompts.
   */
  private getTokenCount(...prompts: string[]): number {
    // Early return if no prompts are provided
    if (prompts.length === 0) return 0;

    const encoding_name = getEncodingNameForModel(this.model);
    const enc = getEncoding(encoding_name);

    const tokens = prompts.flatMap((prompt) => enc.encode(prompt));
    const token_count = tokens.length;

    return token_count;
  }

  private GetApiKey() {
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error(
        ".env file should contain OPENAI_API_KEY property with value"
      );
    }

    return key;
  }

  private createSystemMessage(): OpenAI.Chat.ChatCompletionMessageParam {
    return { role: "system", content: this.system_prompt_text };
  }

  private createUserMessage(
    source_locale: Locale,
    target_locales: Locale[],
    source: object
  ): OpenAI.Chat.ChatCompletionMessageParam {
    return {
      role: "user",
      content: `Translate the following JSON object from ${source_locale} into the following target locales: ${target_locales.join(
        ", "
      )}. Please return a JSON object where each target locale is a key. The value each key should hold is the translation in that language. Preserve the structure:\n\nSource JSON:\n${JSON.stringify(
        source
      )}`,
    };
  }

  /**
   * Checks if the prompt exceeds the context window token limit.
   *
   * @private
   * @param {number} prompt_token_count - The number of tokens used by the prompt.
   * @returns {boolean} - Returns `true` if the prompt token count exceeds the context window token limit; otherwise, `false`.
   */
  private isPromptWithinContextWindowLimit(
    prompt_token_count: number
  ): boolean {
    return prompt_token_count < this.context_window_token_limit;
  }

  private isInvalidBatchSize(batch_size: number) {
    return batch_size < 1;
  }

  private isString(arg: unknown) {
    return typeof arg === "string";
  }

  private isChatCompletionEmpty(content: string | null | undefined) {
    return typeof content !== "string";
  }

  // Utility function to extract the base language code
  private getBaseLanguageCode(locale: Locale) {
    // Locale could be in format like 'en-US', 'fr-CA', etc.
    // We only need the part before the hyphen
    return locale.split("-")[0].toLowerCase() as Locale;
  }

  // Function to estimate tokens for a given locale
  private estimateTokensForLanguages(
    english_token_count: number,
    locale: Locale
  ) {
    // Extract the base language code from the locale
    const baseLanguageCode = this.getBaseLanguageCode(locale);

    // Use a default multiplier if the language isn't found in the map
    const multiplier =
      locale_token_multiplier[baseLanguageCode] ||
      this.default_translation_token_multiplier;

    // Calculate estimated token count based on the multiplier
    return english_token_count * multiplier;
  }

  /**
   * calculates how many output tokens a model can output after being prompted
   * @param prompt_token_count
   * @returns number of remaining number of output tokens after prompting the model
   */
  private getRemainingOutputTokens(prompt_token_count: number) {
    if (prompt_token_count <= this.prompt_token_threshold) {
      return this.output_token_limit;
    }

    const consumed_output_token_count =
      prompt_token_count - this.prompt_token_threshold;

    return this.output_token_limit - consumed_output_token_count;
  }

  private isAllOutputWithinTokenLimit(
    prompt_token_count: number,
    source_token_count: number,
    target_locales: Locale[]
  ): boolean {
    const total_estimated_translation_token_count = target_locales.reduce(
      (accumulator, currentValue) => {
        return (
          accumulator +
          this.estimateTokensForLanguages(source_token_count, currentValue)
        );
      },
      0
    );

    return (
      total_estimated_translation_token_count <
      this.getRemainingOutputTokens(prompt_token_count)
    );
  }

  private isOutputWithinTokenLimit(
    prompt_token_count: number,
    source_token_count: number,
    target_locales: Locale[]
  ): boolean {
    let largest_translation_token_count = 0;

    for (let index = 0; index < target_locales.length; index++) {
      const locale = target_locales[index];
      const estimated_token_count = this.estimateTokensForLanguages(
        source_token_count,
        locale
      );

      if (largest_translation_token_count < estimated_token_count) {
        largest_translation_token_count = estimated_token_count;
      }
    }

    return (
      largest_translation_token_count <
      this.getRemainingOutputTokens(prompt_token_count)
    );
  }

  private createChatCompletionParams(
    system_message: OpenAI.Chat.ChatCompletionMessageParam,
    user_message: OpenAI.Chat.ChatCompletionMessageParam
  ): OpenAI.Chat.ChatCompletionCreateParams {
    return {
      messages: [system_message, user_message],
      model: this.model,
      response_format: { type: "json_object" },
    };
  }

  private getAverageEstimatedTokenModifier(target_locales: Locale[]) {
    const sum_of_multipliers = target_locales.reduce(
      (accumulator, currentValue) => {
        const value =
          locale_token_multiplier[currentValue] ??
          this.default_translation_token_multiplier;
        return accumulator + value;
      },
      0
    );

    return sum_of_multipliers / target_locales.length;
  }

  public async handleChatCompletion(
    source_locale: Locale,
    target_locales: Locale[],
    source: object
  ) {
    const systemMessage = this.createSystemMessage();

    // FIXME: The user message includes the users source locale file, which could be any locale, and english prompts that I wrote.
    // should generate a localized prompt for each language and access it with a map.
    const userMessage = this.createUserMessage(
      source_locale,
      target_locales,
      source
    );

    if (
      !this.isString(userMessage.content) ||
      !this.isString(systemMessage.content)
    ) {
      throw new Error(
        "cannot process token count. system_message.content & user_message.content must be type string"
      );
    }

    // FIXME: should use prompts in the lang of the source.
    const prompt_token_count = this.getTokenCount(
      systemMessage.content,
      userMessage.content
    );

    const source_token_count = this.getTokenCount(JSON.stringify(source));
    const remaining_output_token_count =
      this.getRemainingOutputTokens(prompt_token_count);

    // scenarios:
    // 1a. the tokenized length of the prompt exceeds the context window limit of the model
    if (!this.isPromptWithinContextWindowLimit(prompt_token_count)) {
      // FIXME: for now we will throw an error if the source locale json + prompt exceeds the models token limit
      throw new Error("prompt will exceed context window limit");
    }

    // 1b. the tokenized length of the prompt is within the token limit, but even a single output would exceed output token limit
    if (
      !this.isOutputWithinTokenLimit(
        prompt_token_count,
        source_token_count,
        target_locales
      )
    ) {
      // FIXME: for now we will throw an error if the source locale json + prompt exceeds the models token limit
      throw new Error("output will exceed max output token limit");
    }

    // 2. the tokenized length of the source and all targets fall below the output_token_limit
    if (
      this.isAllOutputWithinTokenLimit(
        prompt_token_count,
        source_token_count,
        target_locales
      )
    ) {
      const params = this.createChatCompletionParams(
        systemMessage,
        userMessage
      );
      const chat_completion = (await this.client.chat.completions.create(
        params
      )) as OpenAI.Chat.Completions.ChatCompletion;
      const result = chat_completion.choices.at(0)?.message.content;

      if (this.isChatCompletionEmpty(result)) {
        throw new Error("The translation failed to generate content.");
      }

      return result;
    }

    if (source_token_count <= 0) {
      throw new Error("Source token count must be greater than zero.");
    }

    // FIXME: we can be more accurate with our estimates
    const batch_size = Math.floor(
      remaining_output_token_count /
        (source_token_count *
          this.getAverageEstimatedTokenModifier(target_locales))
    );

    if (this.isInvalidBatchSize(batch_size)) {
      throw new Error(
        `Invalid batch size: ${batch_size}. Batch size cannot be less than 1.`
      );
    }

    const batches = [];

    for (let index = 0; index < target_locales.length; index += batch_size) {
      const batch = target_locales.slice(index, index + batch_size);
      batches.push(batch);
    }

    const results = await Promise.all(
      batches.map(async (batch) => {
        const batch_user_message = this.createUserMessage(
          source_locale,
          batch,
          source
        );
        const params = this.createChatCompletionParams(
          systemMessage,
          batch_user_message
        );

        try {
          const chat_completion = (await this.client.chat.completions.create(
            params
          )) as OpenAI.Chat.Completions.ChatCompletion;
          const result = chat_completion.choices.at(0)?.message.content;

          if (this.isChatCompletionEmpty(result)) {
            throw new Error("The translation failed to generate content.");
          }

          return JSON.parse(result);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Failed to process batch: ${error.message}`);
            throw new Error(); // Optionally rethrow the error
          } else {
            console.error("Unknown error occurred");
            throw new Error(); // Rethrow if you don't know the type
          }
        }
      })
    );

    const locales = Object.assign({}, ...results);
    return JSON.stringify(locales);
  }
}
