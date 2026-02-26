import { EXTRACTION_SYSTEM_PROMPT } from './extraction-system';

/**
 * Build a system prompt for returning users submitting a new cycle.
 * Includes their previous protocol as context so Claude can ask "what changed?"
 */
export function buildReturningUserPrompt(previousProtocol: Record<string, unknown>): string {
  const prevJSON = JSON.stringify(previousProtocol, null, 2);

  return `${EXTRACTION_SYSTEM_PROMPT}

## Returning User Context

This user has submitted a previous cycle. Here is their most recent protocol data:

\`\`\`json
${prevJSON}
\`\`\`

## Returning User Flow — OVERRIDE the normal Conversation Flow above

1. Welcome them back very briefly (one line). Show a quick 2-line summary of their last cycle (protocol type, age, key meds).
2. Ask: "What's different this time?" — prompt for changes in meds, dosages, protocol type, trigger, etc.
3. **Pre-populate ALL fields** from their previous protocol in your extracted_data output. Only update fields the user explicitly mentions changing.
4. Their age may have changed — ask "Same age (${previousProtocol.age}) or different?" if not mentioned.
5. Auto-increment cycle number. If the previous cycle was #${previousProtocol.cycleNumber ?? 'unknown'}, default to the next number.
6. For fields they DON'T mention, keep the previous values. Don't re-ask about supplements, meds, diagnosis, location, etc. unless they bring it up.
7. Since age + meds carry over from previous, set canSubmit = true in the FIRST response. Also set isComplete = true if age + protocolType both carry over.
8. End your first response with: "Everything looks good! You can review the summary and tap **Confirm & Submit** when you're ready, or tell me what changed."`;
}
