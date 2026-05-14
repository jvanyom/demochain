import { describe, it, expect } from 'bun:test';
import { parseRouteId } from './utils';

describe('parseRouteId', () => {
  it('llança error quan l\'entrada és undefined', () => {
    expect(() => parseRouteId(undefined)).toThrowError();
  });

  it('llança error quan l\'entrada és null', () => {
    expect(() => parseRouteId(null)).toThrowError();
  });

  it('analitza una cadena numèrica vàlida', () => {
    expect(parseRouteId('123')).toBe(123);
  });

  it('llança un error quan l\'id és zero', () => {
    expect(() => parseRouteId('0')).toThrowError();
  });

  it('llança un error quan és una cadena no numèrica', () => {
    expect(() => parseRouteId('abc')).toThrowError();
  });

  it('llança un error quan és una cadena buida', () => {
    expect(() => parseRouteId('')).toThrowError();
  });

  it('trunca la part decimal (comportament de parseInt)', () => {
    expect(parseRouteId('12.5')).toBe(12);
  });

  it('llança un error quan és un nombre negatiu', () => {
    expect(() => parseRouteId('-5')).toThrowError();
  });

  it('llança un error quan és una cadena que comença amb lletres', () => {
    expect(() => parseRouteId('abc123')).toThrowError();
  });
});
