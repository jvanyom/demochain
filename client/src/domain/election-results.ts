import type { ProposalId } from './proposal'

interface OptionResult {
	/** Option index, matching `ProposalOption.id`. */
	optionId: number
	firstChoiceVotes: number
	/** 0 = winner, ties broken deterministically by option index. */
	finalRank: number
	/** How many other options this option defeats in pairwise comparisons. */
	pairwiseWins: number
}

export interface ElectionResults {
	proposalId: ProposalId
	ranking: OptionResult[]
	totalVoters: number
	/** d[i][j] = number of voters who prefer option i over option j. */
	pairwiseMatrix: number[][]
}

/**
 * Mètode de Schulze (variant de Schwartz Sequential Dropping / força de camí).
 *
 * 1. Construeix matriu per parelles d[i][j] = #voters que prefereixen i sobre j.
 * 2. Calculeu la matriu de camí més fort p[i][j] utilitzant Floyd-Warshall.
 * 3. Classificació: i supera j si p[i][j] > p[j][i]. Ordena per nombre d'opcions superades.
 */
export function computeElectionResults(
	proposalId: ProposalId,
	ballots: number[][],
	optionCount: number
): ElectionResults {
	if (ballots.length === 0 || optionCount === 0)
		return { proposalId, ranking: [], totalVoters: 0, pairwiseMatrix: [] }

	const pref: number[][] = Array.from({ length: optionCount }, () => new Array(optionCount).fill(0))

	for (const ballot of ballots)
		for (let rankI = 0; rankI < ballot.length; rankI++)
			for (let rankJ = rankI + 1; rankJ < ballot.length; rankJ++) {
				const i = ballot[rankI]!
				const j = ballot[rankJ]!

				if (pref[i]?.[j] !== undefined) pref[i][j]++
			}

	const pathStrength: number[][] = Array.from({ length: optionCount }, (_i, i) =>
		Array.from({ length: optionCount }, (_j, j) => {
			if (i === j) return 0
			if (pref[i]?.[j] !== undefined && pref[j]?.[i] !== undefined && pref[i][j] > pref[j][i]) return pref[i][j]
			return 0
		})
	)

	for (let k = 0; k < optionCount; k++)
		for (let i = 0; i < optionCount; i++)
			for (let j = 0; j < optionCount; j++) {
				if (i === j) continue

				pathStrength[i]![j] = Math.max(
					pathStrength[i]![j]!,
					Math.min(pathStrength[i]![k]!, pathStrength[k]![j]!)
				)
			}

	const wins = Array.from({ length: optionCount }, (_el, i) => {
		let count = 0

		for (let j = 0; j < optionCount; j++)
			if (
				i !== j &&
				pathStrength[i]?.[j] !== undefined &&
				pathStrength[j]?.[i] !== undefined &&
				pathStrength[i][j]! > pathStrength[j]![i]!
			)
				count++

		return { optionId: i, wins: count }
	})

	wins.sort((a, b) => b.wins - a.wins || a.optionId - b.optionId)

	const firstChoiceCounts = new Array<number>(optionCount).fill(0)

	for (const ballot of ballots)
		if (ballot[0] !== undefined && ballot[0] < optionCount && firstChoiceCounts[ballot[0]] !== undefined)
			firstChoiceCounts[ballot[0]]!++

	const ranking: OptionResult[] = wins.map(({ optionId, wins: winsCount }, rank) => ({
		optionId,
		firstChoiceVotes: firstChoiceCounts[optionId] ?? -1,
		finalRank: rank,
		pairwiseWins: winsCount
	}))

	return { proposalId, ranking, totalVoters: ballots.length, pairwiseMatrix: pref }
}
