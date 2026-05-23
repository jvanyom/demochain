import { describe, it, expect } from 'bun:test'

import { computeElectionResults } from './election-results'
import { asProposalId } from './proposal'

const pid = asProposalId(1)

describe('computeElectionResults', () => {
	it('retorna un rànquing buit quan no hi ha paperetes', () => {
		const results = computeElectionResults(pid, [], 3)

		expect(results).toEqual({ proposalId: pid, ranking: [], totalVoters: 0, pairwiseMatrix: [] })
	})

	it('retorna un rànquing buit amb zero opcions', () => {
		const results = computeElectionResults(pid, [[0, 1, 2]], 0)

		expect(results.ranking).toEqual([])
		expect(results.totalVoters).toBe(0)
	})

	it('ordena primer el guanyador unànime', () => {
		const paperetes = [
			[0, 1, 2],
			[0, 2, 1],
			[0, 1, 2]
		]

		const results = computeElectionResults(pid, paperetes, 3)

		expect(results.totalVoters).toBe(3)
		expect(results.ranking[0]).toEqual({ optionId: 0, firstChoiceVotes: 3, finalRank: 0, pairwiseWins: 2 })
	})

	it('produeix un rànquing determinista amb totes les opcions ordenades', () => {
		const paperetes = [
			[0, 1, 2],
			[0, 1, 2],
			[1, 0, 2]
		]

		const results = computeElectionResults(pid, paperetes, 3)

		expect(results.ranking.length).toBe(3)
		expect(results.ranking.map(result => result.finalRank)).toEqual([0, 1, 2])
	})

	it('compta correctament els vots de primera elecció', () => {
		const paperetes = [
			[0, 1, 2],
			[1, 0, 2],
			[1, 2, 0],
			[2, 1, 0]
		]

		const results = computeElectionResults(pid, paperetes, 3)
		const perId = new Map(results.ranking.map(result => [result.optionId, result.firstChoiceVotes]))

		expect(perId.get(0)).toBe(1)
		expect(perId.get(1)).toBe(2)
		expect(perId.get(2)).toBe(1)
	})

	it("resol empats determinísticament per l'índex d'opció inferior", () => {
		// Empat perfecte entre 0 i 1 (una papereta cadascun, preferències idèntiques).
		const paperetes = [
			[0, 1],
			[1, 0]
		]

		const results = computeElectionResults(pid, paperetes, 2)

		// Empat → l'opció 0 primer per ordenació determinista.
		expect(results.ranking[0]?.optionId).toBe(0)
		expect(results.ranking[1]?.optionId).toBe(1)
	})

	it('retorna el proposalId al resultat', () => {
		const idPersonalitzat = asProposalId(42)
		const results = computeElectionResults(idPersonalitzat, [[0, 1]], 2)

		expect(results.proposalId).toBe(idPersonalitzat)
	})

	it('el guanyador Condorcet guanya sempre, fins i tot sense vots de primera opció', () => {
		// Cas típic de confusió: l'opció 0 NO té cap vot de primera opció, però
		// tots els votants la posen com a 2a opció → guanya totes les comparatives.
		//   Vot A: [1, 0, 2]  →  d[1][0]++, d[1][2]++, d[0][2]++
		//   Vot B: [2, 0, 1]  →  d[2][0]++, d[2][1]++, d[0][1]++
		// Resultat: d[0][1]=1:1=d[1][0] i d[0][2]=1:1=d[2][0] → empat perfecte d'1:1 (tot tied)
		// Però si hi ha 3 vots A i 1 vot B, l'opció 0 guanya cap a cap contra 1 i 2.
		const paperetes = [
			[1, 0, 2], // d[1][0]++, d[0][2]++
			[1, 0, 2], // d[1][0]++, d[0][2]++
			[1, 0, 2], // d[1][0]++, d[0][2]++
			[2, 0, 1], // d[2][0]++, d[0][1]++
			[2, 0, 1] // d[2][0]++, d[0][1]++
		]
		// d[0][1]=2 d[1][0]=3  → 1 guanya cap a cap contra 0
		// d[0][2]=3 d[2][0]=2  → 0 guanya cap a cap contra 2
		// d[1][2]=3 d[2][1]=2  → 1 guanya cap a cap contra 2
		// Schulze: 1 guanya (2 victòries: sobre 0 i 2), 0 és segon (1 victòria: sobre 2)

		const results = computeElectionResults(pid, paperetes, 3)

		expect(results.ranking[0]?.optionId).toBe(1) // Opció 1 guanya
		expect(results.ranking[0]?.firstChoiceVotes).toBe(3)
		expect(results.ranking[0]?.pairwiseWins).toBe(2)
		expect(results.ranking[2]?.optionId).toBe(2) // Opció 2 és darrera
	})

	it('empat perfecte: tots 0 victòries, es resol per índex', () => {
		// Cas de la imatge reportada: 2 vots [1,0,2] i 2 vots [2,0,1]
		// Totes les comparatives queden 2:2 → ningú té victòries Schulze
		// L'opció 0 guanya pel desempat d'índex (índex menor), malgrat tenir 0 vots de primera opció.
		// El component ResultsPage detecta correctament aquest cas com a "empat" (isTied = true).
		const paperetes = [
			[1, 0, 2],
			[1, 0, 2],
			[2, 0, 1],
			[2, 0, 1]
		]

		const results = computeElectionResults(pid, paperetes, 3)

		// Totes les comparatives empaten 2:2
		expect(results.pairwiseMatrix[0]?.[1]).toBe(2)
		expect(results.pairwiseMatrix[1]?.[0]).toBe(2)
		expect(results.pairwiseMatrix[0]?.[2]).toBe(2)
		expect(results.pairwiseMatrix[2]?.[0]).toBe(2)

		// Cap opció té victòries Schulze
		expect(results.ranking.every(result => result.pairwiseWins === 0)).toBe(true)

		// La primera de la llista és l'opció 0 (menor índex), però la UI ha de mostrar "empat"
		expect(results.ranking[0]?.optionId).toBe(0)
		expect(results.ranking[0]?.firstChoiceVotes).toBe(0)
	})

	it('exposa la matriu pairwise correctament', () => {
		// Cas simple: 3 opcions, 1 vot cadascuna com a primera
		const paperetes = [
			[0, 1, 2],
			[1, 2, 0],
			[2, 0, 1]
		]

		const results = computeElectionResults(pid, paperetes, 3)

		// d[i][j] + d[j][i] = nombre de votants (cada votant té exactament 1 preferència per parella)
		expect((results.pairwiseMatrix[0]?.[1] ?? -1) + (results.pairwiseMatrix[1]?.[0] ?? -1)).toBe(3)
		expect((results.pairwiseMatrix[0]?.[2] ?? -1) + (results.pairwiseMatrix[2]?.[0] ?? -1)).toBe(3)
		expect((results.pairwiseMatrix[1]?.[2] ?? -1) + (results.pairwiseMatrix[2]?.[1] ?? -1)).toBe(3)
		expect(results.pairwiseMatrix.length).toBe(3)
	})

	it('tots els votants trien el mateix ordre → opció 0 guanya totes les comparatives', () => {
		const paperetes = Array.from({ length: 10 }, () => [0, 1, 2])

		const results = computeElectionResults(pid, paperetes, 3)

		expect(results.totalVoters).toBe(10)
		expect(results.ranking[0]?.optionId).toBe(0)
		expect(results.ranking[0]?.pairwiseWins).toBe(2)
		expect(results.ranking[1]?.pairwiseWins).toBe(1)
		expect(results.ranking[2]?.pairwiseWins).toBe(0)
	})

	it('paperetes parcials (votant ordena només 2 de 3 opcions) → es compta correctament', () => {
		// 3 votants, cadascun ordena 2 de 3 opcions
		const paperetes = [
			[0, 1], // no expressa preferència sobre l'opció 2
			[1, 0],
			[0, 2]
		]

		const results = computeElectionResults(pid, paperetes, 3)

		expect(results.totalVoters).toBe(3)
		// L'opció 0 apareix a les 3 paperetes però no sempre en primer
		expect(results.ranking.length).toBe(3)
		expect(results.ranking[0]?.firstChoiceVotes).toBe(2) // Opció 0: primera a paperetes 0 i 2
	})

	it('5 votants, 3 opcions: opció 0 i 1 empatades Schulze, opció 2 perd sempre', () => {
		// Dissenyat perquè 0 i 1 tinguin 1 victòria cadascuna (empat Schulze)
		// i l'opció 2 no guanyi cap comparativa.
		const paperetes = [
			[0, 1, 2],
			[0, 1, 2],
			[1, 0, 2],
			[1, 0, 2],
			[0, 1, 2]
		]
		// d[0][1]=3, d[1][0]=2 → opció 0 guanya sobre 1
		// d[0][2]=5, d[2][0]=0 → opció 0 guanya sobre 2
		// d[1][2]=5, d[2][1]=0 → opció 1 guanya sobre 2
		// Schulze: 0 guanya 0 vs 1 i 0 vs 2 → 2 victòries (primera posició)

		const results = computeElectionResults(pid, paperetes, 3)

		expect(results.ranking[0]?.optionId).toBe(0)
		expect(results.ranking[0]?.pairwiseWins).toBe(2)
		expect(results.ranking[2]?.optionId).toBe(2)
		expect(results.ranking[2]?.pairwiseWins).toBe(0)
	})

	it("una sola papereta amb una sola opció → rànquing d'una opció", () => {
		const results = computeElectionResults(pid, [[0]], 1)

		expect(results.totalVoters).toBe(1)
		expect(results.ranking.length).toBe(1)
		expect(results.ranking[0]?.optionId).toBe(0)
		expect(results.ranking[0]?.firstChoiceVotes).toBe(1)
		expect(results.ranking[0]?.pairwiseWins).toBe(0)
	})
})
