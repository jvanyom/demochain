from dataclasses import dataclass, field


@dataclass
class Ballot:
    """Papereta de preferència d'un votant per a una proposta Demochain.

    El contracte Demochain emmagatzema la papereta com a DynamicArray[UInt8]
    on cada valor és l'índex (0-indexed) de l'opció en la posició de preferència.

    Exemple amb 3 opcions: preference=[2, 0, 1] significa que el votant
    prefereix l'opció 2 en primer lloc, l'opció 0 en segon i l'opció 1 en tercer.
    """
    voter: str
    preference: list[int]


@dataclass
class ElectionState:
    """Estat complet d'una elecció llegit des del contracte Demochain (Algorand).

    Representa les paperetes d'una proposta aprovada en el moment de l'ancoratge.
    A diferència del sistema original (que emmagatzemava comptadors per candidat),
    Demochain emmagatzema les paperetes de preferència completes (mètode Schulze).

    Atributs:
        proposal_id: Identificador numèric de la proposta (clau del BoxMap pr_).
        title:       Títol de la proposta llegit del struct Proposal.
        options:     Llista d'opcions en l'ordre original del contracte.
        ballots:     Paperetes de tots els votants que han votat.
        block_round: Round d'Algorand en el moment de la lectura (per a auditoria).
    """
    proposal_id: int
    title: str
    options: list[str]
    ballots: list[Ballot] = field(default_factory=list)
    block_round: int = 0

    @property
    def election_id(self) -> str:
        """Identificador de cadena usat com a electionId al NotaryContract."""
        return f"proposta-{self.proposal_id}"
