export const AMH_RANGES = ['<0.5', '0.5-1.0', '1.0-1.5', '1.5-2.0', '2.0-3.0', '3.0-4.0', '4.0+', 'unknown'] as const;
export type AmhRange = typeof AMH_RANGES[number];

export const AFC_RANGES = ['<5', '5-10', '11-15', '16-20', '21-30', '30+', 'unknown'] as const;
export type AfcRange = typeof AFC_RANGES[number];

export const PROTOCOL_TYPES = [
  'antagonist', 'long_lupron', 'short_lupron', 'mini_ivf',
  'natural', 'flare', 'estrogen_priming', 'other'
] as const;
export type ProtocolType = typeof PROTOCOL_TYPES[number];

export const TRIGGER_TYPES = ['hcg', 'lupron', 'dual', 'other', 'unknown'] as const;
export type TriggerType = typeof TRIGGER_TYPES[number];

export const CYCLE_TYPES = ['fresh_transfer', 'freeze_all', 'fresh_to_frozen', 'cancelled'] as const;
export type CycleType = typeof CYCLE_TYPES[number];

export const FERTILIZATION_METHODS = ['standard', 'icsi', 'imsi', 'picsi', 'macs', 'other'] as const;
export type FertilizationMethod = typeof FERTILIZATION_METHODS[number];

export const DIAGNOSES = [
  'dor', 'pcos', 'endometriosis', 'male_factor', 'tubal', 'unexplained',
  'recurrent_loss', 'pof', 'genetic_carrier', 'cancer_other',
  'ovulation_disorder', 'not_infertile', 'unknown'
] as const;
export type Diagnosis = typeof DIAGNOSES[number];

export const TRANSFER_OUTCOMES = [
  'positive_beta', 'negative_beta', 'chemical',
  'clinical_pregnancy', 'miscarriage', 'live_birth',
  'ongoing', 'not_yet'
] as const;
export type TransferOutcome = typeof TRANSFER_OUTCOMES[number];

export const MEDICATION_CATEGORIES = ['stim', 'supplement', 'other'] as const;
export type MedicationCategory = typeof MEDICATION_CATEGORIES[number];

export interface Medication {
  name: string;
  dosage: string;
  category: MedicationCategory;
}

export interface Protocol {
  id: string;
  age: number;
  ageMonths: number | null;
  amhRange: AmhRange | null;
  amhValue: number | null;
  afcRange: AfcRange | null;
  afcCount: number | null;
  protocolType: ProtocolType | null;
  triggerType: TriggerType | null;
  stimDays: number | null;
  country: string | null;
  state: string | null;
  cycleNumber: number | null;
  cycleType: CycleType | null;
  donorSperm: boolean | null;
  donorEggs: boolean | null;
  fertilizationMethod: FertilizationMethod | null;
  partnerAge: number | null;
  peakE2: number | null;
  maxFollicles: number | null;
  diagnoses: Diagnosis[];
  medications: Medication[];
  submittedAt: string;
  updatedAt: string;
}

export interface Outcome {
  id: string;
  protocolId: string;
  eggsRetrieved: number | null;
  eggsMature: number | null;
  eggsFertilized: number | null;
  eggsFrozen: number | null;
  eggsThawed: number | null;
  day3Embryos: number | null;
  blastsDay5: number | null;
  blastsDay6: number | null;
  blastsDay7: number | null;
  embryoGradesDay5: string | null;
  embryoGradesDay6: string | null;
  embryoGradesDay7: string | null;
  pgtTested: number | null;
  pgtEuploid: number | null;
  pgtMosaic: number | null;
  pgtAneuploid: number | null;
  pgtInconclusive: number | null;
  transferCount: number | null;
  transferOutcome: TransferOutcome | null;
  reportedAt: string;
  updatedAt: string;
}

export interface ProtocolWithOutcome extends Protocol {
  outcome: Outcome | null;
}

export interface ExtractedProtocolData {
  age: number | null;
  ageMonths: number | null;
  amhRange: AmhRange | null;
  amhValue: number | null;
  afcRange: AfcRange | null;
  afcCount: number | null;
  protocolType: ProtocolType | null;
  medications: Medication[];
  supplements: Medication[];
  triggerType: TriggerType | null;
  stimDays: number | null;
  country: string | null;
  state: string | null;
  cycleNumber: number | null;
  cycleType: CycleType | null;
  donorSperm: boolean | null;
  donorEggs: boolean | null;
  fertilizationMethod: FertilizationMethod | null;
  partnerAge: number | null;
  peakE2: number | null;
  maxFollicles: number | null;
  diagnoses: Diagnosis[];
  canSubmit: boolean;
  isComplete: boolean;
  missingRequired: string[];
}

export interface ExtractedOutcomeData {
  eggsRetrieved: number | null;
  eggsMature: number | null;
  eggsFertilized: number | null;
  eggsFrozen: number | null;
  eggsThawed: number | null;
  day3Embryos: number | null;
  blastsDay5: number | null;
  blastsDay6: number | null;
  blastsDay7: number | null;
  embryoGradesDay5: string | null;
  embryoGradesDay6: string | null;
  embryoGradesDay7: string | null;
  pgtTested: number | null;
  pgtEuploid: number | null;
  pgtMosaic: number | null;
  pgtAneuploid: number | null;
  pgtInconclusive: number | null;
  transferCount: number | null;
  transferOutcome: TransferOutcome | null;
  isComplete: boolean;
}
