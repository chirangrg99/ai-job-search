import { createHash } from "node:crypto";
import { PARSER_SCHEMA_VERSION } from "./prompt";
export const descriptionHash = (description: string, complete: boolean) =>
  createHash("sha256")
    .update(JSON.stringify([PARSER_SCHEMA_VERSION, description, complete]))
    .digest("hex");
