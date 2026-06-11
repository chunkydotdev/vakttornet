/**
 * Single validated content bundle for the whole app. buildContent() runs the
 * zod schemas, so anything imported from here is known-good data.
 */
import { buildContent } from "@vakttornet/content";

export const content = buildContent();
