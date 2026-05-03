import { describe, it, expect } from 'bun:test';
import { basicsSchema, datesSchema, optionsSchema, proposalSchema } from './proposal';

const APPROVAL_BUFFER_DAYS = 3;

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function errorCodes(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  if (result.success || !result.error) return [];
  return result.error.issues.map((i) => i.message);
}

describe('basicsSchema', () => {
  it('passes with non-empty title and description', () => {
    const result = basicsSchema.safeParse({ title: 'My proposal', description: 'Some detail' });
    expect(result.success).toBe(true);
  });

  it('fails with empty title → proposal.empty-title', () => {
    const result = basicsSchema.safeParse({ title: '', description: 'Some detail' });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.empty-title');
  });

  it('fails with whitespace-only title → proposal.empty-title', () => {
    const result = basicsSchema.safeParse({ title: '   ', description: 'Some detail' });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.empty-title');
  });

  it('fails with empty description → proposal.empty-description', () => {
    const result = basicsSchema.safeParse({ title: 'My proposal', description: '' });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.empty-description');
  });

  it('fails with whitespace-only description → proposal.empty-description', () => {
    const result = basicsSchema.safeParse({ title: 'My proposal', description: '  ' });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.empty-description');
  });
});

describe('datesSchema', () => {
  it('passes when start is 4+ days away and end is 2+ days after start', () => {
    const result = datesSchema.safeParse({
      startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
      endDate: futureDate(APPROVAL_BUFFER_DAYS + 3),
    });
    expect(result.success).toBe(true);
  });

  it('fails when start is less than 3 days from now → proposal.starting-too-soon', () => {
    const result = datesSchema.safeParse({
      startDate: futureDate(1),
      endDate: futureDate(5),
    });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.starting-too-soon');
  });

  it('fails when end equals start → proposal.small-voting-window', () => {
    const start = futureDate(APPROVAL_BUFFER_DAYS + 1);
    const result = datesSchema.safeParse({
      startDate: start,
      endDate: new Date(start),
    });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.small-voting-window');
  });

  it('fails when end is exactly 1 day after start → proposal.small-voting-window', () => {
    const result = datesSchema.safeParse({
      startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
      endDate: futureDate(APPROVAL_BUFFER_DAYS + 2),
    });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.small-voting-window');
  });

  it('passes when end is more than 1 day after start', () => {
    const result = datesSchema.safeParse({
      startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
      endDate: futureDate(APPROVAL_BUFFER_DAYS + 4),
    });
    expect(result.success).toBe(true);
  });
});

describe('optionsSchema', () => {
  it('passes with 2 non-empty unique options', () => {
    const result = optionsSchema.safeParse({ options: ['Option A', 'Option B'] });
    expect(result.success).toBe(true);
  });

  it('fails with only 1 option → proposal.too-few-options', () => {
    const result = optionsSchema.safeParse({ options: ['Only one'] });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.too-few-options');
  });

  it('fails with 0 options → proposal.too-few-options', () => {
    const result = optionsSchema.safeParse({ options: [] });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.too-few-options');
  });

  it('fails with an empty option → proposal.empty-options', () => {
    const result = optionsSchema.safeParse({ options: ['Option A', 'Option B', ''] });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.empty-options');
  });

  it('fails with a whitespace-only option → proposal.empty-options', () => {
    const result = optionsSchema.safeParse({ options: ['Option A', 'Option B', '   '] });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.empty-options');
  });

  it('fails with duplicate options (case-insensitive) → proposal.duplicated-options', () => {
    const result = optionsSchema.safeParse({ options: ['Option A', 'option a'] });
    expect(result.success).toBe(false);
    expect(errorCodes(result)).toContain('proposal.duplicated-options');
  });

  it('passes with 3 unique options', () => {
    const result = optionsSchema.safeParse({ options: ['A', 'B', 'C'] });
    expect(result.success).toBe(true);
  });
});

describe('proposalSchema (full)', () => {
  it('passes with all valid data', () => {
    const result = proposalSchema.safeParse({
      title: 'My Proposal',
      description: 'A detailed description',
      startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
      endDate: futureDate(APPROVAL_BUFFER_DAYS + 3),
      options: ['Option A', 'Option B'],
    });
    expect(result.success).toBe(true);
  });

  it('reports all errors when everything is invalid', () => {
    const result = proposalSchema.safeParse({
      title: '',
      description: '',
      startDate: futureDate(1),
      endDate: futureDate(1),
      options: ['only'],
    });
    expect(result.success).toBe(false);
    const codes = errorCodes(result);
    expect(codes).toContain('proposal.empty-title');
    expect(codes).toContain('proposal.empty-description');
    expect(codes).toContain('proposal.starting-too-soon');
    expect(codes).toContain('proposal.too-few-options');
  });
});
