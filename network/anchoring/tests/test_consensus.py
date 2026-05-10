from network.anchoring.consensus import check_consensus


HASH_A = "0x" + "ab" * 32
HASH_B = "0x" + "cd" * 32


class TestCheckConsensus:
    def test_empty_returns_not_reached(self):
        r = check_consensus({}, threshold_k=2)
        assert not r.reached
        assert r.consensus_hash == ""

    def test_k_nodes_agree(self):
        r = check_consensus(
            {"uib": HASH_A, "upc": HASH_A, "uab": HASH_B}, threshold_k=2
        )
        assert r.reached
        assert r.consensus_hash == HASH_A
        assert set(r.agreeing_nodes) == {"uib", "upc"}
        assert r.dissenting_nodes == ["uab"]

    def test_all_nodes_agree(self):
        r = check_consensus(
            {"uib": HASH_A, "upc": HASH_A, "uab": HASH_A}, threshold_k=2
        )
        assert r.reached
        assert r.dissenting_nodes == []

    def test_not_reached_when_below_k(self):
        r = check_consensus({"uib": HASH_A, "upc": HASH_B}, threshold_k=2)
        assert not r.reached

    def test_k_equals_n_all_must_agree(self):
        r = check_consensus(
            {"uib": HASH_A, "upc": HASH_A, "uab": HASH_B}, threshold_k=3
        )
        assert not r.reached

    def test_reports_total_nodes_and_k(self):
        r = check_consensus({"uib": HASH_A, "upc": HASH_A}, threshold_k=2)
        assert r.total_nodes == 2
        assert r.threshold_k == 2

    def test_all_hashes_preserved(self):
        hashes = {"uib": HASH_A, "upc": HASH_B}
        r = check_consensus(hashes, threshold_k=1)
        assert r.all_hashes == hashes


class TestCheckConsensusEdgeCases:
    def test_single_node_k1_reaches_consensus(self):
        r = check_consensus({"uib": HASH_A}, threshold_k=1)
        assert r.reached

    def test_single_node_k2_not_reached(self):
        r = check_consensus({"uib": HASH_A}, threshold_k=2)
        assert not r.reached
