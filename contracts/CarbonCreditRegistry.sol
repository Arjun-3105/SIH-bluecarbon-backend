// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./BlueCarbonToken.sol"; // ERC20 token with AccessControl

/**
 * @title CarbonCreditRegistry
 * @dev NFT registry for carbon projects with ERC20 integration
 */
contract CarbonCreditRegistry is ERC721, Ownable, Pausable, ReentrancyGuard {
    using Strings for uint256;

    uint256 private _tokenIdCounter;

    BlueCarbon public blueCarbon; // ERC20 token reference

    enum ProjectStatus { PENDING, VERIFIED, RETIRED }

    struct CarbonProjectOnChain {
        string projectId;        // Unique project ID
        uint16 carbonCredits;    // NFT credits
        ProjectStatus status;
        bool isRetired;
        uint64 retirementDate;
        address projectOwner;
        bytes32 ipfsHash;        // IPFS hash for off-chain metadata
    }

    mapping(uint256 => CarbonProjectOnChain) public projects;
    mapping(string => uint256) public projectToToken;
    mapping(uint256 => bool) public retiredCredits;

    // Events
    event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed owner, uint256 carbonCredits);
    event CreditsRetired(uint256 indexed tokenId, string indexed projectId, uint256 amount, string reason);
    event ERC20CreditsMinted(uint256 indexed tokenId, uint256 amount, address to);

    // Modifiers
    modifier onlyProjectOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the project owner");
        _;
    }

    modifier projectExists(uint256 tokenId) {
        require(tokenId < _tokenIdCounter, "Project does not exist");
        _;
    }

    constructor(address _blueCarbonToken)
        ERC721("Carbon Credit Registry", "CCR")
        Ownable(msg.sender)
        Pausable()
    {
        blueCarbon = BlueCarbon(_blueCarbonToken);
    }

    /** 
     * @dev Register a new NFT project
     */
    function registerProject(
    string memory projectId,
    uint16 carbonCredits,
    address projectOwner,       // Add this parameter
    bytes32 ipfsHash
) external whenNotPaused nonReentrant returns (uint256) {
    require(bytes(projectId).length > 0, "Project ID required");
    require(projectToToken[projectId] == 0, "Project exists");
    require(carbonCredits > 0, "Credits > 0");
    require(projectOwner != address(0), "Invalid owner");

    uint256 tokenId = _tokenIdCounter;
    _tokenIdCounter++;

    projects[tokenId] = CarbonProjectOnChain({
        projectId: projectId,
        carbonCredits: carbonCredits,
        status: ProjectStatus.VERIFIED, // automatically verified
        isRetired: false,
        retirementDate: 0,
        projectOwner: projectOwner,
        ipfsHash: ipfsHash
    });

    projectToToken[projectId] = tokenId;

    _safeMint(projectOwner, tokenId); // NFT goes to project owner
    emit ProjectRegistered(tokenId, projectId, projectOwner, carbonCredits);

    // Mint ERC20 tokens immediately (scale to 18 decimals)
    blueCarbon.mint(projectOwner, uint256(carbonCredits) * 1e18);
    emit ERC20CreditsMinted(tokenId, carbonCredits, projectOwner);

    return tokenId;
}


    /**
     * @dev Mint ERC20 tokens from NFT credits
     * Note: Registry contract must have MINTER_ROLE on BlueCarbon
     */
    function mintERC20Credits(uint256 tokenId, uint256 amount, address to)
        external
        onlyProjectOwner(tokenId)
        projectExists(tokenId)
        whenNotPaused
    {
        require(amount > 0, "Amount must be > 0");
        CarbonProjectOnChain storage project = projects[tokenId];
        require(!project.isRetired, "Project retired");
        require(amount <= project.carbonCredits, "Amount exceeds NFT credits");

        // Reduce NFT credits
        project.carbonCredits -= uint16(amount);

        // Mint ERC20 tokens (scale to 18 decimals)
        blueCarbon.mint(to, amount * 1e18);

        emit ERC20CreditsMinted(tokenId, amount, to);
    }

    /**
     * @dev Retire NFT credits permanently
     */
    function retireCredits(
        uint256 tokenId,
        uint16 amount,
        string memory reason
    ) external onlyProjectOwner(tokenId) projectExists(tokenId) whenNotPaused nonReentrant {
        CarbonProjectOnChain storage project = projects[tokenId];
        require(!project.isRetired, "Already retired");
        require(amount > 0 && amount <= project.carbonCredits, "Invalid amount");
        require(bytes(reason).length > 0, "Reason required");

        project.carbonCredits -= amount;
        project.isRetired = true;
        project.retirementDate = uint64(block.timestamp);
        project.status = ProjectStatus.RETIRED;

        retiredCredits[tokenId] = true;

        emit CreditsRetired(tokenId, project.projectId, amount, reason);
    }

    /** ERC721 Metadata URI */
    function tokenURI(uint256 tokenId) public view override projectExists(tokenId) returns (string memory) {
        string memory baseURI = "https://ipfs.io/ipfs/";
        return string(abi.encodePacked(baseURI, _bytes32ToString(projects[tokenId].ipfsHash)));
    }

    function _bytes32ToString(bytes32 data) internal pure returns (string memory) {
        bytes memory bytesData = new bytes(32);
        for (uint i = 0; i < 32; i++) bytesData[i] = data[i];
        return string(bytesData);
    }

    // Pause/unpause
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Emergency transfer
    function emergencyTransferProject(uint256 tokenId, address newOwner) external onlyOwner projectExists(tokenId) {
        require(newOwner != address(0), "Invalid owner");
        _transfer(ownerOf(tokenId), newOwner, tokenId);
        projects[tokenId].projectOwner = newOwner;
    }

function verifyAndMint(uint256 tokenId) external onlyOwner projectExists(tokenId) {
    CarbonProjectOnChain storage project = projects[tokenId];

    require(project.status != ProjectStatus.VERIFIED, "Already verified");
    require(!project.isRetired, "Project retired");

    // Mark project as verified
    project.status = ProjectStatus.VERIFIED;

    // Mint ERC20 tokens equal to NFT credits
    uint256 amount = project.carbonCredits;
    require(amount > 0, "No credits left");

    // Reduce NFT credits
    project.carbonCredits = 0;

    // Mint ERC20 tokens to project owner (scale to 18 decimals)
    blueCarbon.mint(project.projectOwner, amount * 1e18);

    emit ERC20CreditsMinted(tokenId, amount, project.projectOwner);
}
}
