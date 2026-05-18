import { z } from 'zod';

export const LeadSchema = z.object({
  full_name: z.string().min(1),
  phone_number: z.string().min(5),
  email: z.string().email().optional().nullable(),
  property_address: z.string().optional().nullable(),
  call_status: z.string().optional(),
});

export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START_CALL'), leadId: z.string() }),
  z.object({ type: z.literal('END_CALL'), outcome: z.string().optional() }),
  z.object({ type: z.literal('TRANSCRIPT_UPDATE'), text: z.string(), speaker: z.string(), mode: z.string().optional() }),
  z.object({ type: z.literal('AUDIO_CHUNK'), chunk: z.string() }),
  z.object({ type: z.literal('PING') }),
  z.object({ type: z.literal('PONG') }),
]);
