import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  referenceOutputSchema,
  resolveReferences,
  sourcePassages,
} from "@/server/job-parser/references";
import { PARSER_INSTRUCTIONS } from "@/server/job-parser/prompt";
export interface AIClient {
  parseJobDescription(
    description: string,
    model: string,
  ): Promise<{ output: unknown; model: string }>;
}
export class AIError extends Error {
  constructor(
    readonly code:
      | "configuration"
      | "unavailable"
      | "refused"
      | "incomplete"
      | "invalid_output",
  ) {
    super(
      {
        configuration:
          "Configure OPENAI_API_KEY on the server to parse job descriptions.",
        unavailable:
          "The AI request failed. Check API access or quota before explicitly retrying.",
        refused:
          "The model declined this extraction. No parsed requirements were saved.",
        incomplete:
          "The AI response was incomplete. No partial requirements were saved.",
        invalid_output:
          "The response failed schema or source-evidence validation. No parsed requirements were saved.",
      }[code],
    );
  }
}
export class OpenAIClient implements AIClient {
  private readonly client: OpenAI;
  constructor(apiKey: string, fetcher?: typeof fetch) {
    if (!apiKey.trim()) throw new AIError("configuration");
    this.client = new OpenAI({
      apiKey,
      maxRetries: 0,
      timeout: 60000,
      ...(fetcher ? { fetch: fetcher } : {}),
    });
  }
  async parseJobDescription(description: string, model: string) {
    try {
      const response = await this.client.responses.parse({
        model,
        store: false,
        max_output_tokens: 8000,
        instructions: PARSER_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: JSON.stringify({ passages: sourcePassages(description) }),
          },
        ],
        text: {
          format: zodTextFormat(referenceOutputSchema, "job_requirements"),
        },
      });
      if (response.status !== "completed") throw new AIError("incomplete");
      if (
        response.output.some(
          (item) =>
            item.type === "message" &&
            item.content.some((content) => content.type === "refusal"),
        )
      )
        throw new AIError("refused");
      if (!response.output_parsed) throw new AIError("invalid_output");
      try {
        return {
          output: resolveReferences(response.output_parsed, description),
          model: response.model,
        };
      } catch {
        throw new AIError("invalid_output");
      }
    } catch (error) {
      if (error instanceof AIError) throw error;
      // Never propagate SDK errors containing request details, headers or generated content.
      throw new AIError(
        error instanceof SyntaxError ? "invalid_output" : "unavailable",
      );
    }
  }
}
