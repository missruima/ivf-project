import { z } from 'zod';
import { TRANSFER_OUTCOMES } from '@/types/protocol';

export const outcomeSubmitSchema = z.object({
  eggsRetrieved: z.number().int().min(0).max(80).nullable().default(null),
  eggsMature: z.number().int().min(0).max(80).nullable().default(null),
  eggsFertilized: z.number().int().min(0).max(80).nullable().default(null),
  eggsFrozen: z.number().int().min(0).max(80).nullable().default(null),
  eggsThawed: z.number().int().min(0).max(80).nullable().default(null),
  day3Embryos: z.number().int().min(0).max(60).nullable().default(null),
  blastsDay5: z.number().int().min(0).max(40).nullable().default(null),
  blastsDay6: z.number().int().min(0).max(40).nullable().default(null),
  blastsDay7: z.number().int().min(0).max(20).nullable().default(null),
  embryoGradesDay5: z.string().max(200).nullable().default(null),
  embryoGradesDay6: z.string().max(200).nullable().default(null),
  embryoGradesDay7: z.string().max(200).nullable().default(null),
  pgtTested: z.number().int().min(0).max(40).nullable().default(null),
  pgtEuploid: z.number().int().min(0).max(40).nullable().default(null),
  pgtMosaic: z.number().int().min(0).max(40).nullable().default(null),
  pgtAneuploid: z.number().int().min(0).max(40).nullable().default(null),
  pgtInconclusive: z.number().int().min(0).max(40).nullable().default(null),
  transferCount: z.number().int().min(0).max(10).nullable().default(null),
  transferOutcome: z.enum(TRANSFER_OUTCOMES).nullable().default(null),
});

export type OutcomeSubmitInput = z.infer<typeof outcomeSubmitSchema>;
