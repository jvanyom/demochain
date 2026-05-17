import {describe, it, expect} from 'bun:test';

import type {ProposalStateKind} from './proposalState';
import type {Proposal} from './proposal';

import {proposalMatchesFilter} from './proposalFilter';

function mockProposal(stateKind: ProposalStateKind): Proposal {
    const tally = {votesFor: 0, totalVotes: 0};

    const state =
        stateKind === 'PendingApproval' ? {kind: 'PendingApproval' as const, approvalTally: tally, memberCount: 0}
            : stateKind === 'Rejected' ? {kind: 'Rejected' as const, approvalTally: tally, memberCount: 0}
                : stateKind === 'PendingStart' ? {kind: 'PendingStart' as const}
                    : stateKind === 'Open' ? {kind: 'Open' as const}
                        : {kind: 'Closed' as const};

    return {state} as unknown as Proposal;
}

describe("filtre 'all'", () => {
    const estats: ProposalStateKind[] = ['PendingApproval', 'PendingStart', 'Open', 'Rejected', 'Closed'];

    for (const kind of estats) {
        it(`retorna true per a ${kind}`, () => {
            expect(proposalMatchesFilter(mockProposal(kind), 'all')).toBeTrue();
        });
    }
});

describe("filtre 'active'", () => {
    it('retorna true per a PendingApproval', () => {
        expect(proposalMatchesFilter(mockProposal('PendingApproval'), 'active')).toBeTrue();
    });

    it('retorna true per a PendingStart', () => {
        expect(proposalMatchesFilter(mockProposal('PendingStart'), 'active')).toBeTrue();
    });

    it('retorna true per a Open', () => {
        expect(proposalMatchesFilter(mockProposal('Open'), 'active')).toBeTrue();
    });

    it('retorna true per a Rejected (active = no Closed)', () => {
        expect(proposalMatchesFilter(mockProposal('Rejected'), 'active')).toBeTrue();
    });

    it('retorna false només per a Closed', () => {
        expect(proposalMatchesFilter(mockProposal('Closed'), 'active')).toBeFalse();
    });
});

describe("filtre 'pending'", () => {
    it('retorna true només per a PendingApproval', () => {
        expect(proposalMatchesFilter(mockProposal('PendingApproval'), 'pending')).toBeTrue();
    });

    it('retorna false per a PendingStart', () => {
        expect(proposalMatchesFilter(mockProposal('PendingStart'), 'pending')).toBeFalse();
    });

    it('retorna false per a Open', () => {
        expect(proposalMatchesFilter(mockProposal('Open'), 'pending')).toBeFalse();
    });

    it('retorna false per a Rejected', () => {
        expect(proposalMatchesFilter(mockProposal('Rejected'), 'pending')).toBeFalse();
    });

    it('retorna false per a Closed', () => {
        expect(proposalMatchesFilter(mockProposal('Closed'), 'pending')).toBeFalse();
    });
});

describe("filtre 'approved'", () => {
    it('retorna true només per a PendingStart', () => {
        expect(proposalMatchesFilter(mockProposal('PendingStart'), 'approved')).toBeTrue();
    });

    it('retorna false per a PendingApproval', () => {
        expect(proposalMatchesFilter(mockProposal('PendingApproval'), 'approved')).toBeFalse();
    });

    it('retorna false per a Open', () => {
        expect(proposalMatchesFilter(mockProposal('Open'), 'approved')).toBeFalse();
    });

    it('retorna false per a Rejected', () => {
        expect(proposalMatchesFilter(mockProposal('Rejected'), 'approved')).toBeFalse();
    });

    it('retorna false per a Closed', () => {
        expect(proposalMatchesFilter(mockProposal('Closed'), 'approved')).toBeFalse();
    });
});

describe("filtre 'voting'", () => {
    it('retorna true només per a Open', () => {
        expect(proposalMatchesFilter(mockProposal('Open'), 'voting')).toBeTrue();
    });

    it('retorna false per a PendingApproval', () => {
        expect(proposalMatchesFilter(mockProposal('PendingApproval'), 'voting')).toBeFalse();
    });

    it('retorna false per a PendingStart', () => {
        expect(proposalMatchesFilter(mockProposal('PendingStart'), 'voting')).toBeFalse();
    });

    it('retorna false per a Rejected', () => {
        expect(proposalMatchesFilter(mockProposal('Rejected'), 'voting')).toBeFalse();
    });

    it('retorna false per a Closed', () => {
        expect(proposalMatchesFilter(mockProposal('Closed'), 'voting')).toBeFalse();
    });
});

describe("filtre 'closed'", () => {
    it('retorna true només per a Closed', () => {
        expect(proposalMatchesFilter(mockProposal('Closed'), 'closed')).toBeTrue();
    });

    it('retorna false per a PendingApproval', () => {
        expect(proposalMatchesFilter(mockProposal('PendingApproval'), 'closed')).toBeFalse();
    });

    it('retorna false per a PendingStart', () => {
        expect(proposalMatchesFilter(mockProposal('PendingStart'), 'closed')).toBeFalse();
    });

    it('retorna false per a Open', () => {
        expect(proposalMatchesFilter(mockProposal('Open'), 'closed')).toBeFalse();
    });

    it('retorna false per a Rejected', () => {
        expect(proposalMatchesFilter(mockProposal('Rejected'), 'closed')).toBeFalse();
    });
});
