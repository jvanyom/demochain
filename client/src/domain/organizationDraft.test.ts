import { describe, it, expect } from 'bun:test';
import { organizationDraftSchema } from './organizationDraft';

function errorMessages(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  if (result.success || !result.error) return [];
  return result.error.issues.map((i) => i.message);
}

describe('organizationDraftSchema', () => {
  it('passa amb un nom i una descripció vàlids', () => {
    const result = organizationDraftSchema.safeParse({ name: 'La meva org', description: 'Una descripció' });
    expect(result.success).toBeTrue();
  });

  it('elimina els espais laterals del nom i la descripció', () => {
    const result = organizationDraftSchema.safeParse({ name: '  La meva org  ', description: '  Desc  ' });
    expect(result.success).toBeTrue();
  });

  it('falla amb un nom buit → org.empty-name', () => {
    const result = organizationDraftSchema.safeParse({ name: '', description: 'Desc' });
    expect(result.success).toBeFalse();
    expect(errorMessages(result)).toContain('org.empty-name');
  });

  it('falla amb un nom d\'espais → org.empty-name', () => {
    const result = organizationDraftSchema.safeParse({ name: '   ', description: 'Desc' });
    expect(result.success).toBeFalse();
    expect(errorMessages(result)).toContain('org.empty-name');
  });

  it('falla amb una descripció buida → org.empty-description', () => {
    const result = organizationDraftSchema.safeParse({ name: 'La meva org', description: '' });
    expect(result.success).toBeFalse();
    expect(errorMessages(result)).toContain('org.empty-description');
  });

  it('falla amb una descripció d\'espais → org.empty-description', () => {
    const result = organizationDraftSchema.safeParse({ name: 'La meva org', description: '  ' });
    expect(result.success).toBeFalse();
    expect(errorMessages(result)).toContain('org.empty-description');
  });

  it('informa dels dos errors quan tant el nom com la descripció són buits', () => {
    const result = organizationDraftSchema.safeParse({ name: '', description: '' });
    expect(result.success).toBeFalse();
    const codes = errorMessages(result);
    expect(codes).toContain('org.empty-name');
    expect(codes).toContain('org.empty-description');
  });
});
