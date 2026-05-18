import { LeadSchema, WSMessageSchema } from '../src/utils/schemas';

describe('Schema Validation', () => {
  it('should validate valid lead data', () => {
    const result = LeadSchema.safeParse({
      full_name: 'John Doe',
      phone_number: '1234567890'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid lead data', () => {
    const result = LeadSchema.safeParse({
      full_name: '',
      phone_number: '123'
    });
    expect(result.success).toBe(false);
  });

  it('should validate valid WS message', () => {
      const result = WSMessageSchema.safeParse({ type: 'PING' });
      expect(result.success).toBe(true);
  });
});
