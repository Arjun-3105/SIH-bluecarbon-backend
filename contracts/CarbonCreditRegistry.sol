// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CarbonCreditRegistry
 * @dev A comprehensive carbon credit registry using ERC-721 tokens
 * @notice This contract manages carbon credits as NFTs with immutable project data
 */
contract CarbonCreditRegistry is ERC721, Ownable, Pausable, ReentrancyGuard {
    using Strings for uint256;

    uint256 private _tokenIdCounter;

    // Struct to store carbon credit project data
    struct CarbonProject {
        string projectId;           // Unique project identifier
        string projectName;         // Name of the project
        string ecosystemType;       // Type of ecosystem (Mangrove, Forest, etc.)
        string stateUT;             // State or Union Territory
        string district;            // District name
        string villagePanchayat;    // Village or Coastal Panchayat
        string coordinates;         // Latitude and Longitude
        uint256 areaHectares;       // Area in hectares
        string speciesPlanted;      // Species planted
        uint256 plantationDate;     // Timestamp of plantation
        string verificationAgency;  // Agency that verified the project
        uint256 verifiedDate;       // Timestamp of verification
        uint256 carbonSequestration; // Carbon sequestered in tCO2
        uint256 carbonCredits;      // Number of carbon credits issued
        string status;              // Project status
        string supportingNGO;       // Supporting NGO or Community
        string ipfsHash;            // IPFS hash for additional metadata
        address projectOwner;       // Address that owns this project
        bool isRetired;             // Whether credits have been retired
        uint256 retirementDate;     // When credits were retired
        string retirementReason;    // Reason for retirement
    }

    // Mapping from token ID to project data
    mapping(uint256 => CarbonProject) public projects;
    
    // Mapping from project ID to token ID (for quick lookup)
    mapping(string => uint256) public projectToToken;
    
    // Mapping to track retired credits
    mapping(uint256 => bool) public retiredCredits;
    
    // Events
    event ProjectRegistered(
        uint256 indexed tokenId,
        string indexed projectId,
        address indexed owner,
        uint256 carbonCredits
    );
    
    event CreditsRetired(
        uint256 indexed tokenId,
        string indexed projectId,
        uint256 amount,
        string reason
    );
    
    event ProjectUpdated(
        uint256 indexed tokenId,
        string indexed projectId,
        string field,
        string newValue
    );

    // Modifiers
    modifier onlyProjectOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the project owner");
        _;
    }

    modifier projectExists(uint256 tokenId) {
        require(tokenId < _tokenIdCounter, "Project does not exist");
        _;
    }

    constructor() ERC721("Carbon Credit Registry", "CCR") Ownable(msg.sender) {}

    /**
     * @dev Register a new carbon credit project
     * @param projectData The complete project data structure
     * @param ipfsHash IPFS hash containing additional metadata
     * @return tokenId The token ID assigned to this project
     */
    function registerProject(
        CarbonProject memory projectData,
        string memory ipfsHash
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(bytes(projectData.projectId).length > 0, "Project ID cannot be empty");
        require(projectToToken[projectData.projectId] == 0, "Project already registered");
        require(projectData.carbonCredits > 0, "Carbon credits must be greater than 0");
        require(projectData.areaHectares > 0, "Area must be greater than 0");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        projectData.projectOwner = msg.sender;
        projectData.ipfsHash = ipfsHash;
        projectData.isRetired = false;
        projectData.retirementDate = 0;
        projectData.retirementReason = "";

        projects[tokenId] = projectData;
        projectToToken[projectData.projectId] = tokenId;

        _safeMint(msg.sender, tokenId);

        emit ProjectRegistered(tokenId, projectData.projectId, msg.sender, projectData.carbonCredits);

        return tokenId;
    }

    /**
     * @dev Retire carbon credits (burn them permanently)
     * @param tokenId The token ID to retire
     * @param amount The amount of credits to retire
     * @param reason The reason for retirement
     */
    function retireCredits(
        uint256 tokenId,
        uint256 amount,
        string memory reason
    ) external onlyProjectOwner(tokenId) projectExists(tokenId) whenNotPaused nonReentrant {
        CarbonProject storage project = projects[tokenId];
        
        require(!project.isRetired, "Credits already retired");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= project.carbonCredits, "Amount exceeds available credits");
        require(bytes(reason).length > 0, "Retirement reason required");

        project.carbonCredits -= amount;
        project.isRetired = true;
        project.retirementDate = block.timestamp;
        project.retirementReason = reason;
        project.status = "Retired";

        retiredCredits[tokenId] = true;

        emit CreditsRetired(tokenId, project.projectId, amount, reason);
    }

    /**
     * @dev Update project status (only by project owner)
     * @param tokenId The token ID to update
     * @param newStatus The new status
     */
    function updateProjectStatus(
        uint256 tokenId,
        string memory newStatus
    ) external onlyProjectOwner(tokenId) projectExists(tokenId) whenNotPaused {
        require(bytes(newStatus).length > 0, "Status cannot be empty");
        
        projects[tokenId].status = newStatus;
        
        emit ProjectUpdated(tokenId, projects[tokenId].projectId, "status", newStatus);
    }

    /**
     * @dev Get project data by token ID
     * @param tokenId The token ID
     * @return project The complete project data
     */
    function getProject(uint256 tokenId) external view projectExists(tokenId) returns (CarbonProject memory) {
        return projects[tokenId];
    }

    /**
     * @dev Get project data by project ID
     * @param projectId The project ID
     * @return project The complete project data
     */
    function getProjectById(string memory projectId) external view returns (CarbonProject memory) {
        uint256 tokenId = projectToToken[projectId];
        require(tokenId != 0, "Project not found");
        return projects[tokenId];
    }

    /**
     * @dev Get total number of projects registered
     * @return count The total count
     */
    function getTotalProjects() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Get total carbon credits issued
     * @return total The total carbon credits
     */
    function getTotalCarbonCredits() external view returns (uint256) {
        uint256 total = 0;
        uint256 totalProjects = _tokenIdCounter;
        
        for (uint256 i = 0; i < totalProjects; i++) {
            if (!projects[i].isRetired) {
                total += projects[i].carbonCredits;
            }
        }
        
        return total;
    }

    /**
     * @dev Get total carbon credits retired
     * @return total The total retired credits
     */
    function getTotalRetiredCredits() external view returns (uint256) {
        uint256 total = 0;
        uint256 totalProjects = _tokenIdCounter;
        
        for (uint256 i = 0; i < totalProjects; i++) {
            if (projects[i].isRetired) {
                total += (projects[i].carbonSequestration - projects[i].carbonCredits);
            }
        }
        
        return total;
    }

    /**
     * @dev Check if a project exists by project ID
     * @param projectId The project ID to check
     * @return exists Whether the project exists
     */
    function projectExistsById(string memory projectId) external view returns (bool) {
        return projectToToken[projectId] != 0;
    }

    /**
     * @dev Override tokenURI to return IPFS metadata
     * @param tokenId The token ID
     * @return The token URI
     */
    function tokenURI(uint256 tokenId) public view override projectExists(tokenId) returns (string memory) {
        string memory baseURI = "https://ipfs.io/ipfs/";
        return string(abi.encodePacked(baseURI, projects[tokenId].ipfsHash));
    }

    /**
     * @dev Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency function to transfer ownership of a project (only owner)
     * @param tokenId The token ID
     * @param newOwner The new owner address
     */
    function emergencyTransferProject(
        uint256 tokenId,
        address newOwner
    ) external onlyOwner projectExists(tokenId) {
        require(newOwner != address(0), "Invalid new owner");
        _transfer(ownerOf(tokenId), newOwner, tokenId);
        projects[tokenId].projectOwner = newOwner;
    }
}
