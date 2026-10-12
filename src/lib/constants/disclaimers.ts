export const DISCLAIMERS = {
  general: 'IVF Project provides community-reported data and published research for informational purposes only. This is not medical advice. Always consult your fertility specialist for guidance specific to your situation.',

  research: 'This is AI-generated navigation of PubMed search results, not a verified evidence review or medical advice. PubMed inclusion does not imply endorsement or quality evaluation. Verify important claims with your fertility specialist.',

  dashboard: 'These are self-reported, pseudonymous protocol records, not clinical evidence. Outcome measures are not currently published and this dashboard must not be used to predict an individual result.',

  smallSample: 'This group has a small number of reports. These numbers may not be representative and should be interpreted with extra caution.',

  notEnoughData: "We don't have enough community-reported data for this combination yet. As more people share their experiences, this will grow.",

  protocol: 'Your submission is pseudonymous, not guaranteed anonymous. We do not ask for names or email addresses; please omit clinic names and other direct identifiers. Age and clinical details are stored and can create re-identification risk in combination.',

  passphrase: 'This passphrase is your only way to return and update your record. We cannot recover it. Please write it down or save it somewhere safe.',

  outcome: 'However your cycle went, sharing your experience helps others understand the full range of possibilities. You only need to share what you feel comfortable with.',

  privacy: 'IVF Project does not ask for names or email addresses and does not persist IP addresses, but it stores sensitive, self-reported fertility data under a passphrase. Records are pseudonymous, not guaranteed anonymous.',

  apiDisclosure: 'To power the chat features, your messages are sent to Anthropic\'s Claude AI. Anthropic\'s API data handling policies apply. No personally identifiable information should be included in your messages.',
} as const;

export const MIN_GROUP_SIZE = 5;
