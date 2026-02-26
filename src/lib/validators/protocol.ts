import { z } from 'zod';
import {
  AMH_RANGES,
  AFC_RANGES,
  PROTOCOL_TYPES,
  TRIGGER_TYPES,
  MEDICATION_CATEGORIES,
} from '@/types/protocol';

export const medicationSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().max(50).default(''),
  category: z.enum(MEDICATION_CATEGORIES).default('stim'),
});

export const protocolSubmitSchema = z.object({
  age: z.number().int().min(18).max(55),
  ageMonths: z.number().int().min(0).max(11).nullable().default(null),
  amhRange: z.enum(AMH_RANGES).nullable().default(null),
  afcRange: z.enum(AFC_RANGES).nullable().default(null),
  protocolType: z.enum(PROTOCOL_TYPES),
  triggerType: z.enum(TRIGGER_TYPES).nullable().default(null),
  stimDays: z.number().int().min(1).max(30).nullable().default(null),
  country: z.string().max(60).nullable().default(null),
  state: z.string().max(60).nullable().default(null),
  medications: z.array(medicationSchema).max(30).default([]),
});

export type ProtocolSubmitInput = z.infer<typeof protocolSubmitSchema>;
