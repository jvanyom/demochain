// Tipus de wire — la forma de les estructures ARC-56 descodificades per algosdk. Aquests existeixen
// només per connectar la codificació on-chain als tipus de domini de 'src/domain/'.
// El codi fora de 'src/algorand/' no hauria d'importar-se d'aquí; hauria de consumir de 'src/domain/'.

// ARC-56 Organization struct: (uint64, string, string, address, uint32)
export interface OnChainOrganization {
  orgId: number;
  name: string;
  description: string;
  /** Adreça Algorand (58-char base32). */
  organizer: string;
  memberCount: number;
}
