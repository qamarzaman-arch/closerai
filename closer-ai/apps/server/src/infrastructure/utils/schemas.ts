import { z } from 'zod';

export const LeadSchema = z.object({
  full_name: z.string().min(1),
  phone_number: z.string().min(5),
  email: z.string().email().optional().nullable(),
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')),
  website_url: z.string().url().optional().nullable().or(z.literal('')),
  property_address: z.string().optional().nullable(),
  property_type: z.string().optional().nullable(),
  estimated_value: z.number().optional().nullable(),
  seller_motivation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  follow_up_date: z.coerce.date().optional().nullable(),
  call_status: z.string().optional(),
});

export const LeadUpdateSchema = LeadSchema.partial();

export const LeadResourceSchema = z.object({
  type: z.enum(['NOTE', 'LINKEDIN', 'WEBSITE', 'PROFILE', 'AI_RESEARCH', 'OTHER']).default('NOTE'),
  title: z.string().min(1),
  url: z.string().url().optional().nullable().or(z.literal('')),
  content: z.string().min(1),
});

export const LeadImportSchema = z.array(LeadSchema.extend({
  full_name: z.string().min(1),
  phone_number: z.string().min(5),
}).partial({
  email: true,
  property_address: true,
  property_type: true,
  estimated_value: true,
  seller_motivation: true,
  notes: true,
  tags: true,
  follow_up_date: true,
  call_status: true,
}).required({
  full_name: true,
  phone_number: true,
})).min(1).max(500);

export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START_CALL'), leadId: z.string() }),
  z.object({ type: z.literal('END_CALL'), outcome: z.string().optional() }),
  z.object({ type: z.literal('TRANSCRIPT_UPDATE'), text: z.string(), speaker: z.string(), mode: z.string().optional() }),
  z.object({ type: z.literal('AUDIO_CHUNK'), chunk: z.string(), speaker: z.enum(['Caller', 'Client']).default('Client') }),
  z.object({ type: z.literal('PING') }),
  z.object({ type: z.literal('PONG') }),
]);
