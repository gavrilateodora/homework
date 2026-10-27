/**
 * References between steps.
 *
 * A step property can read the output of another step with a template expression:
 *   "Hello {{ steps.6f1c...e2.output.fullName }}"
 *
 * Step ids are UUIDs. Output keys are plain identifiers.
 */

const REFERENCE_PATTERN = /\{\{\s*steps\.([0-9a-f-]{36})\.output\.(\w+)\s*\}\}/gi;

export function makeReference(stepId, outputKey) {
  return `{{ steps.${stepId}.output.${outputKey} }}`;
}

/**
 * Lists the references found in a single string.
 * @param {string} text
 * @returns {{ stepId: string, outputKey: string, raw: string }[]}
 */
export function parseReferences(text) {
  if (typeof text !== "string") return [];
  return [...text.matchAll(REFERENCE_PATTERN)].map((m) => ({ raw: m[0], stepId: m[1], outputKey: m[2] }));
}

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, v]) => {
      out.push(key); // object keys can hold references too
      collectStrings(v, out);
    });
  }
  return out;
}

export function findStepsUsing(flow, targetId) {
  return flow.steps.filter(
    (s) =>
      s.id !== targetId &&
      collectStrings(s.properties).some((text) =>
        parseReferences(text).some((ref) => ref.stepId === targetId)
      )
  );
}