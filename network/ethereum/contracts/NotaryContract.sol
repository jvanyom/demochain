// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  NotaryContract
 * @notice Ancoratge K-of-N dels resultats electorals de Demochain.
 *
 *         Cada node universitari envia de forma independent el hash SHA-256
 *         de les paperetes d'una proposta llegides des d'Algorand. Quan K
 *         nodes envien el mateix hash, el resultat queda ancorat permanentment.
 *
 * @dev    La llista blanca i el llindar K es congelen en obrir l'elecció.
 *         Canvis posteriors de membres no afecten les eleccions en curs.
 */
contract NotaryContract {

    address public admin;
    address[] private _universityList;
    mapping(address => bool) public whitelist;
    uint256 public universityCount;
    uint256 public globalK;

    struct Election {
        uint256 thresholdK;
        address[] authorizedNodes;
        mapping(address => bool) isAuthorized;
        mapping(address => bytes32) submissions;
        mapping(bytes32 => uint256) hashCount;
        bool open;
        bool anchored;
    }

    mapping(string => Election) private _elections;

    event UniversityAdded(address indexed university);
    event UniversityRemoved(address indexed university);
    event ElectionOpened(string indexed electionId, uint256 thresholdK, uint256 nodeCount);
    event HashSubmitted(string indexed electionId, bytes32 resultHash, address indexed submitter);
    event ResultAnchored(string indexed electionId, bytes32 resultHash, uint256 confirmations);

    modifier onlyAdmin() {
        require(msg.sender == admin, "NotaryContract: not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addUniversity(address uni) external onlyAdmin {
        require(uni != address(0), "NotaryContract: zero address");
        require(!whitelist[uni], "NotaryContract: already whitelisted");
        whitelist[uni] = true;
        _universityList.push(uni);
        universityCount++;
        globalK = _ceilTwoThirds(universityCount);
        emit UniversityAdded(uni);
    }

    function removeUniversity(address uni) external onlyAdmin {
        require(whitelist[uni], "NotaryContract: not whitelisted");
        whitelist[uni] = false;
        uint256 len = _universityList.length;
        for (uint256 i = 0; i < len; i++) {
            if (_universityList[i] == uni) {
                _universityList[i] = _universityList[len - 1];
                _universityList.pop();
                break;
            }
        }
        universityCount--;
        globalK = universityCount > 0 ? _ceilTwoThirds(universityCount) : 0;
        emit UniversityRemoved(uni);
    }

    function openElection(string calldata electionId) external onlyAdmin {
        Election storage e = _elections[electionId];
        require(!e.open, "NotaryContract: election already open");
        require(universityCount > 0, "NotaryContract: no universities registered");
        e.open = true;
        e.thresholdK = globalK;
        uint256 len = _universityList.length;
        for (uint256 i = 0; i < len; i++) {
            address uni = _universityList[i];
            e.authorizedNodes.push(uni);
            e.isAuthorized[uni] = true;
        }
        emit ElectionOpened(electionId, e.thresholdK, len);
    }

    function submitHash(string calldata electionId, bytes32 resultHash) external {
        Election storage e = _elections[electionId];
        require(e.open, "NotaryContract: election not open");
        require(!e.anchored, "NotaryContract: already anchored");
        require(e.isAuthorized[msg.sender], "NotaryContract: not authorized");
        require(e.submissions[msg.sender] == bytes32(0), "NotaryContract: already submitted");
        require(resultHash != bytes32(0), "NotaryContract: zero hash");
        e.submissions[msg.sender] = resultHash;
        uint256 count = ++e.hashCount[resultHash];
        emit HashSubmitted(electionId, resultHash, msg.sender);
        if (count >= e.thresholdK) {
            e.anchored = true;
            emit ResultAnchored(electionId, resultHash, count);
        }
    }

    function isElectionAnchored(string calldata electionId) external view returns (bool) {
        return _elections[electionId].anchored;
    }

    function getSubmission(string calldata electionId, address submitter)
        external view returns (bytes32)
    {
        return _elections[electionId].submissions[submitter];
    }

    function universityList() external view returns (address[] memory) {
        return _universityList;
    }

    /// @dev ceil(2n/3) = (2n + 2) / 3
    function _ceilTwoThirds(uint256 n) internal pure returns (uint256) {
        return (2 * n + 2) / 3;
    }
}
