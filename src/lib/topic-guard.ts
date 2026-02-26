/**
 * Lightweight topic relevance filter.
 * Catches obviously off-topic messages BEFORE they reach the Anthropic API.
 * This is intentionally generous — borderline queries get through and
 * the system prompt handles the rest. We only block clear abuse.
 */

// Terms that indicate the message is plausibly fertility/IVF related.
// Checked case-insensitively against the full conversation (all user messages).
const FERTILITY_KEYWORDS = [
  // IVF & ART
  'ivf', 'icsi', 'iui', 'fet', 'embryo', 'blastocyst', 'morula',
  'transfer', 'retrieval', 'egg', 'oocyte', 'sperm', 'fertiliz',
  'implant', 'beta', 'tww', 'two week wait',
  // Protocols & meds
  'protocol', 'stim', 'trigger', 'lupron', 'cetrotide', 'ganirelix',
  'gonal', 'follistim', 'menopur', 'omnitrope', 'letrozole', 'clomid',
  'progesterone', 'estrogen', 'estrace', 'endometrin', 'pio', 'hcg',
  'priming', 'antagonist', 'agonist', 'mini ivf', 'natural cycle',
  // Fertility markers
  'amh', 'fsh', 'lh', 'afc', 'antral', 'ovarian reserve', 'follicle',
  'ovulat', 'anovul',
  // Outcomes
  'pregnant', 'pregnancy', 'miscarriage', 'chemical', 'ectopic',
  'live birth', 'stillbirth', 'loss', 'euploid', 'aneuploid', 'mosaic',
  'pgt', 'pgs', 'pgd', 'genetic testing', 'biopsy',
  // Conditions
  'pcos', 'endometriosis', 'endo', 'diminished ovarian', 'dor',
  'unexplained infertility', 'male factor', 'tubal', 'uterine',
  'polyp', 'fibroid', 'adenomyosis', 'thin lining', 'lining',
  'asherman', 'hydrosalpinx', 'varicocele', 'azoo',
  // Anatomy & biology
  'ovary', 'ovaries', 'uterus', 'cervix', 'fallopian', 'testic',
  // General fertility
  'fertility', 'infertil', 'conceiv', 'conception', 'reproduct',
  'donor', 'surrog', 'freeze', 'frozen', 'thaw', 'cryopreserv',
  'vitrif',
  // Context words someone sharing a protocol would use
  'cycle', 'clinic', 'doctor', 'RE ', 'reproductive endocrin',
  'blood work', 'ultrasound', 'monitoring', 'baseline',
  'age range', 'dosage', 'dose', 'units', 'iu',
  // Emotional context
  'ttc', 'trying to conceive', 'journey', 'waiting',
];

// Patterns that strongly suggest abuse / off-topic use
const ABUSE_PATTERNS = [
  /write\s+(me\s+)?(a\s+)?(code|script|program|essay|poem|story|song|email)/i,
  /\b(python|javascript|java|c\+\+|html|css|sql|react|node)\b.*\b(code|function|class|import)\b/i,
  /translate\s+(this|the following)\s+(to|into)\b/i,
  /\b(hack|crack|exploit|bypass|jailbreak)\b/i,
  /\bignore\s+(previous|above|all)\s+(instructions|prompts|rules)\b/i,
  /\byou\s+are\s+(now|no longer)\b/i,
  /\bact\s+as\s+(a|an)\s+(?!fertility|ivf|reproductive)/i,
  /\b(bitcoin|crypto|stock|invest|trade|forex)\b/i,
  /\b(recipe|cook|bake|ingredient)\b/i,
  /\b(weather|score|game|movie|music|lyrics)\b/i,
];

/**
 * Check whether a message (or conversation) is plausibly on-topic.
 *
 * @param messages - All user messages in the conversation
 * @returns { allowed: true } or { allowed: false, reason: string }
 */
export function checkTopicRelevance(
  messages: { role: string; content: string }[]
): { allowed: true } | { allowed: false; reason: string } {
  // Combine all user messages into one blob for keyword scanning
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();

  // If there are no user messages, block
  if (!userText.trim()) {
    return { allowed: false, reason: 'No message provided.' };
  }

  // Check for clear abuse patterns first
  const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  for (const pattern of ABUSE_PATTERNS) {
    if (pattern.test(latestUserMsg)) {
      return {
        allowed: false,
        reason: 'This tool is designed for IVF and fertility questions only. How can I help you with your fertility journey?',
      };
    }
  }

  // For the first message, require at least one fertility keyword.
  // For follow-up messages, be more lenient (they may be answering
  // a follow-up question like "yes" or "about 12").
  const isFirstMessage = messages.filter((m) => m.role === 'user').length === 1;

  if (isFirstMessage) {
    const hasRelevantKeyword = FERTILITY_KEYWORDS.some((kw) =>
      userText.includes(kw.toLowerCase())
    );

    // Also allow very short messages (< 20 chars) that might be greetings —
    // the system prompt will steer them. Only block longer off-topic messages.
    if (!hasRelevantKeyword && userText.length > 30) {
      return {
        allowed: false,
        reason: "I'm here to help with IVF and fertility questions. Could you ask me something about fertility treatments, protocols, or research?",
      };
    }
  }

  return { allowed: true };
}
