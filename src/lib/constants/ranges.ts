/**
 * Age bracket labels for dashboard grouping.
 * We store exact age but group into brackets for aggregate display.
 */
export function getAgeBracket(age: number): string {
  if (age < 30) return 'Under 30';
  if (age < 35) return '30–34';
  if (age < 38) return '35–37';
  if (age < 41) return '38–40';
  if (age < 43) return '41–42';
  return '43+';
}

export const AGE_BRACKET_ORDER = ['Under 30', '30–34', '35–37', '38–40', '41–42', '43+'];

export const AMH_RANGE_LABELS: Record<string, string> = {
  '<0.5': 'Below 0.5 ng/mL',
  '0.5-1.0': '0.5–1.0 ng/mL',
  '1.0-1.5': '1.0–1.5 ng/mL',
  '1.5-2.0': '1.5–2.0 ng/mL',
  '2.0-3.0': '2.0–3.0 ng/mL',
  '3.0-4.0': '3.0–4.0 ng/mL',
  '4.0+': 'Above 4.0 ng/mL',
  'unknown': 'Not sure',
};

export const AFC_RANGE_LABELS: Record<string, string> = {
  '<5': 'Fewer than 5',
  '5-10': '5–10',
  '11-15': '11–15',
  '16-20': '16–20',
  '21-30': '21–30',
  '30+': 'More than 30',
  'unknown': 'Not sure',
};

export const PROTOCOL_TYPE_LABELS: Record<string, string> = {
  'antagonist': 'Antagonist',
  'long_lupron': 'Long Lupron',
  'short_lupron': 'Short Lupron',
  'mini_ivf': 'Mini IVF',
  'natural': 'Natural Cycle',
  'flare': 'Flare',
  'estrogen_priming': 'Estrogen Priming',
  'other': 'Other',
};

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  'hcg': 'HCG',
  'lupron': 'Lupron',
  'dual': 'Dual Trigger',
  'other': 'Other',
  'unknown': 'Not sure',
};

export const TRANSFER_OUTCOME_LABELS: Record<string, string> = {
  'positive_beta': 'Positive Beta',
  'negative_beta': 'Negative Beta',
  'chemical': 'Chemical Pregnancy',
  'clinical_pregnancy': 'Clinical Pregnancy',
  'miscarriage': 'Miscarriage',
  'live_birth': 'Live Birth',
  'ongoing': 'Ongoing Pregnancy',
  'not_yet': 'Not Yet Transferred',
};
