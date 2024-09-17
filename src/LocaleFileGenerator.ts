import * as dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

import { OpenAI } from "openai";
import { Locale } from "./Locale";
import { IGenerator } from "./IGenerator";

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
  private readonly model_token_limit = 16384;
  private readonly translation_multiplier = 1.2;

  constructor() {
    this.client = new OpenAI();
    this.client.apiKey = this.GetApiKey();
  }

  getCompletionTokenLimit(promptTokensCount: number) {
    const remaining = this.model_token_limit - promptTokensCount;

    if (remaining <= 0) {
      throw new Error("prompt exceeds token limit");
    }

    return this.model_token_limit - promptTokensCount;
  }

  /**
   * Estimate token count for multiple input strings.
   * A helpful rule of thumb is that one token generally corresponds to ~4 characters of text for common English text.
   * This translates to roughly ¾ of a word (so 100 tokens ~= 75 words).
   * @param texts - One or more strings to estimate token count for
   * @returns The total estimated token count for all inputs
   */
  private estimateTokenCount(...texts: string[]): number {
    const total_length = texts.reduce((sum, text) => sum + text.length, 0);
    return Math.round(total_length / 4);
  }

  private GetApiKey() {
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      throw Error(
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

  private createParams(
    system_message: OpenAI.Chat.ChatCompletionMessageParam,
    user_message: OpenAI.Chat.ChatCompletionMessageParam
  ): OpenAI.Chat.ChatCompletionCreateParams {
    return {
      messages: [system_message, user_message],
      model: this.model,
      response_format: { type: "json_object" },
    };
  }

  public async handleChatCompletion(
    source_locale: Locale,
    target_locales: Locale[],
    source: object
  ) {
    const systemMessage = this.createSystemMessage();

    const userMessage = this.createUserMessage(
      source_locale,
      target_locales,
      source
    );

    const prompt_tokens = this.estimateTokenCount(
      systemMessage.content as string,
      userMessage.content as string
    );

    const max_completion_tokens = this.getCompletionTokenLimit(prompt_tokens);

    const source_tokens = this.estimateTokenCount(JSON.stringify(source));

    // scenarios:
    // 1. the tokenized length of the prompt exceeds the max_completion_tokens of the model
    if (prompt_tokens > this.model_token_limit) {
      // Scenario 1: Split source into chunks
      // FIXME: for now we will throw an error if the source locale json + prompt exceeds the models token limit
      throw Error("prompt exceeds token limit");
    }

    if (source_tokens * this.translation_multiplier > max_completion_tokens) {
      // FIXME: for now we will throw an error if the source locale json + prompt exceeds the models token limit
      throw Error("generating target will exceed token limit");
    }

    // 2. the tokenized length of the source and all targets fall below the max token limit
    if (
      source_tokens * this.translation_multiplier * target_locales.length <=
      max_completion_tokens
    ) {
      const params = this.createParams(systemMessage, userMessage);
      const chat_completion = (await this.client.chat.completions.create(
        params
      )) as OpenAI.Chat.Completions.ChatCompletion;
      const result = chat_completion.choices.at(0)?.message.content;

      if (!result) {
        throw Error("The translation failed to generate content.");
      }

      return result;
    }

    // max number of locales that can be processed with a single request.
    // FIXME: im fuzzy about understanding how this works....
    const batch_size = Math.floor(
      max_completion_tokens / (source_tokens * this.translation_multiplier)
    );

    if (batch_size === 0) {
      throw new Error("batch size cannot be zero");
    }

    const batches = [];
    let locales = {};

    for (let index = 0; index < target_locales.length; index += batch_size) {
      const batch = target_locales.slice(index, index + batch_size);
      batches.push(batch);
    }

    for (const batch of batches) {
      const batch_user_message = this.createUserMessage(
        source_locale,
        batch,
        source
      );
      const params = this.createParams(systemMessage, batch_user_message);
      const chat_completion = (await this.client.chat.completions.create(
        params
      )) as OpenAI.Chat.Completions.ChatCompletion;
      const result = chat_completion.choices.at(0)?.message.content;

      if (!result) {
        throw Error("The translation failed to generate content.");
      }
      const batch_result_json = JSON.parse(result);
      locales = { ...locales, ...batch_result_json };
    }

    return JSON.stringify(locales);
  }
}
