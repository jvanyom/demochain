import {describe, it, expect} from 'bun:test';

import {addressSchema, asAddress, isAddress, parseAddressList} from './address';

const VALID = 'A'.repeat(58);
const B_ADDR = 'B'.repeat(58);
const C_ADDR = 'C'.repeat(58);
const SHORT = 'A'.repeat(57);
const INVALID_CHAR = 'A'.repeat(57) + '1';

function errorMessages(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
    if (result.success || !result.error)
        return [];

    return result.error.issues.map(i => i.message);
}

describe('addressSchema', () => {
    it('passa amb una adreça base32 vàlida de 58 caràcters', () => {
        expect(addressSchema.safeParse(VALID).success).toBeTrue();
    });

    it('elimina els espais laterals abans de validar', () => {
        expect(addressSchema.safeParse(`  ${VALID}  `).success).toBeTrue();
    });

    it('falla quan l\'adreça té menys de 58 caràcters → address.invalid', () => {
        const result = addressSchema.safeParse(SHORT);

        expect(result.success).toBeFalse();
        expect(errorMessages(result)).toContain('address.invalid');
    });

    it('falla amb un caràcter invàlid (dígit 1) → address.invalid', () => {
        const result = addressSchema.safeParse(INVALID_CHAR);

        expect(result.success).toBeFalse();
        expect(errorMessages(result)).toContain('address.invalid');
    });

    it('falla amb lletres minúscules → address.invalid', () => {
        const result = addressSchema.safeParse('a'.repeat(58));

        expect(result.success).toBeFalse();
        expect(errorMessages(result)).toContain('address.invalid');
    });

    it('falla amb una cadena buida → address.invalid', () => {
        const result = addressSchema.safeParse('');

        expect(result.success).toBeFalse();
        expect(errorMessages(result)).toContain('address.invalid');
    });
});

describe('isAddress', () => {
    it('retorna true per a una adreça vàlida', () => {
        expect(isAddress(VALID)).toBeTrue();
    });

    it('retorna true quan l\'adreça té espais laterals (elimina els espais)', () => {
        expect(isAddress(`  ${VALID}  `)).toBeTrue();
    });

    it('retorna false per a una adreça de menys de 58 caràcters', () => {
        expect(isAddress(SHORT)).toBeFalse();
    });

    it('retorna false per a un caràcter invàlid', () => {
        expect(isAddress(INVALID_CHAR)).toBeFalse();
    });

    it('retorna false per a una cadena buida', () => {
        expect(isAddress('')).toBeFalse();
    });

    it('retorna false per a lletres minúscules', () => {
        expect(isAddress('a'.repeat(58))).toBeFalse();
    });
});

describe('parseAddressList', () => {
    const A = asAddress(VALID);
    const B = asAddress(B_ADDR);
    const C = asAddress(C_ADDR);

    it('retorna arrays buits per a una cadena buida', () => {
        expect(parseAddressList('')).toEqual({valid: [], invalid: []});
    });

    it('retorna arrays buits per a una cadena d\'espais', () => {
        expect(parseAddressList('   \n  \r\n  ')).toEqual({valid: [], invalid: []});
    });

    it('analitza una sola adreça vàlida', () => {
        const result = parseAddressList(A);

        expect(result.valid).toEqual([A]);
        expect(result.invalid).toEqual([]);
    });

    it('analitza múltiples adreces separades per salts de línia', () => {
        const result = parseAddressList(`${A}\n${B}`);

        expect(result.valid).toEqual([A, B]);
        expect(result.invalid).toEqual([]);
    });

    it('analitza múltiples adreces separades per \\r\\n', () => {
        const result = parseAddressList(`${A}\r\n${B}`);

        expect(result.valid).toEqual([A, B]);
        expect(result.invalid).toEqual([]);
    });

    it('agafa la primera columna d\'una línia CSV (separada per comes)', () => {
        const result = parseAddressList(`${A},etiqueta,extra`);

        expect(result.valid).toEqual([A]);
        expect(result.invalid).toEqual([]);
    });

    it('agafa la primera columna separada per punt i coma', () => {
        const result = parseAddressList(`${A};etiqueta`);

        expect(result.valid).toEqual([A]);
        expect(result.invalid).toEqual([]);
    });

    it('agafa la primera columna separada per tabuladors', () => {
        const result = parseAddressList(`${A}\tetiqueta`);

        expect(result.valid).toEqual([A]);
        expect(result.invalid).toEqual([]);
    });

    it('deduplica les adreces vàlides repetides', () => {
        const result = parseAddressList(`${A}\n${A}\n${A}`);

        expect(result.valid).toEqual([A]);
        expect(result.invalid).toEqual([]);
    });

    it('no deduplica les adreces invàlides', () => {
        const result = parseAddressList('invalida\ninvalida');

        expect(result.invalid).toEqual(['invalida', 'invalida']);
    });

    it('posa les adreces invàlides a la llista d\'invàlides', () => {
        const result = parseAddressList('noesunaadreça');

        expect(result.valid).toEqual([]);
        expect(result.invalid).toEqual(['noesunaadreça']);
    });

    it('gestiona una barreja d\'adreces vàlides i invàlides', () => {
        const result = parseAddressList(`${A}\ninvalida\n${B}`);

        expect(result.valid).toEqual([A, B]);
        expect(result.invalid).toEqual(['invalida']);
    });

    it('ignora les línies en blanc entre entrades', () => {
        const result = parseAddressList(`${A}\n\n\n${B}`);

        expect(result.valid).toEqual([A, B]);
        expect(result.invalid).toEqual([]);
    });

    it('conserva l\'ordre d\'inserció per a les adreces vàlides', () => {
        const result = parseAddressList(`${C}\n${B}\n${A}`);

        expect(result.valid).toEqual([C, B, A]);
    });
});
