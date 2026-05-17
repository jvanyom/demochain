// Tipus de wire — la forma de les estructures ARC-56 descodificades per algosdk. Aquests existeixen
// només per connectar la codificació on-chain als tipus de domini de 'src/domain/'.
// El codi fora de 'src/algorand/' no hauria d'importar-se d'aquí; hauria de consumir de 'src/domain/'.

// ARC-56 Organization struct: (uint64, string, string, address, uint32)
import type {Address, OrganizationId} from "@/domain";

export interface OnChainOrganization {
    orgId: OrganizationId;
    name: string;
    description: string;
    /** Adreça Algorand (58-char base32). */
    organizer: Address;
    memberCount: number;
}

// ARC-56 Proposal struct: (uint64, string, string, string[], uint64, uint64)
export interface OnChainProposal {
    orgId: OrganizationId;
    title: string;
    description: string;
    options: string[];
    /** UNIX seconds. */
    startingDate: number;
    /** UNIX seconds. */
    endingDate: number;
}

// ARC-56 ApprovalTally struct: (uint32, uint32)
export interface OnChainApprovalTally {
    votesFor: number;
    totalVotes: number;
}
