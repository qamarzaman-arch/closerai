import { LeadSchema, WSMessageSchema } from '../src/infrastructure/utils/schemas';

describe('Schema Validation', () => {
  it('should validate valid lead data', () => {
    const result = LeadSchema.safeParse({
      full_name: 'John Doe',
      phone_number: '1234567890'
    });
    expect(result.success).toBe(true);
  });
});
