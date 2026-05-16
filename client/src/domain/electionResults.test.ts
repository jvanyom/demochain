import { describe, it, expect } from 'bun:test';
import { computeElectionResults } from './electionResults';
import { asProposalId } from './proposal';

const pid = asProposalId(1);

describe('computeElectionResults', () => {
  it('retorna un rànquing buit quan no hi ha paperetes', () => {
    const results = computeElectionResults(pid, [], 3);
    expect(results).toEqual({ proposalId: pid, ranking: [], totalVoters: 0 });
  });

  it('retorna un rànquing buit amb zero opcions', () => {
    const results = computeElectionResults(pid, [[0, 1, 2]], 0);
    expect(results.ranking).toEqual([]);
    expect(results.totalVoters).toBe(0);
  });

  it('ordena primer el guanyador unànime', () => {
    const paperetes = [
      [0, 1, 2],
      [0, 2, 1],
      [0, 1, 2],
    ];
    const results = computeElectionResults(pid, paperetes, 3);
    expect(results.totalVoters).toBe(3);
    expect(results.ranking[0]).toEqual({ optionId: 0, firstChoiceVotes: 3, finalRank: 0 });
  });

  it('produeix un rànquing determinista amb totes les opcions ordenades', () => {
    const paperetes = [
      [0, 1, 2],
      [0, 1, 2],
      [1, 0, 2],
    ];
    const results = computeElectionResults(pid, paperetes, 3);
    expect(results.ranking.length).toBe(3);
    expect(results.ranking.map((r) => r.finalRank)).toEqual([0, 1, 2]);
  });

  it('compta correctament els vots de primera elecció', () => {
    const paperetes = [
      [0, 1, 2],
      [1, 0, 2],
      [1, 2, 0],
      [2, 1, 0],
    ];
    const results = computeElectionResults(pid, paperetes, 3);
    const perId = new Map(results.ranking.map((r) => [r.optionId, r.firstChoiceVotes]));
    expect(perId.get(0)).toBe(1);
    expect(perId.get(1)).toBe(2);
    expect(perId.get(2)).toBe(1);
  });

  it('resol empats determinísticament per l\'índex d\'opció inferior', () => {
    // Empat perfecte entre 0 i 1 (una papereta cadascun, preferències idèntiques).
    const paperetes = [
      [0, 1],
      [1, 0],
    ];
    const results = computeElectionResults(pid, paperetes, 2);
    // Empat → l'opció 0 primer per ordenació determinista.
    expect(results.ranking[0].optionId).toBe(0);
    expect(results.ranking[1].optionId).toBe(1);
  });

  it('retorna el proposalId al resultat', () => {
    const idPersonalitzat = asProposalId(42);
    const results = computeElectionResults(idPersonalitzat, [[0, 1]], 2);
    expect(results.proposalId).toBe(idPersonalitzat);
  });
});
