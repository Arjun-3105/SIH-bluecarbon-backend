# Project Registration and Blockchain Integration API Guide

This guide explains how to integrate the project registration form with the backend API and blockchain storage.

## Overview

The system now supports a complete flow from frontend project registration to blockchain storage:

1. **Project Registration**: Users submit project data via the frontend form
2. **Verification**: Verifiers review and approve/reject projects
3. **Blockchain Storage**: Approved projects are automatically registered on the blockchain
4. **Carbon Credits**: Verified projects receive carbon credits as NFTs

## API Endpoints

### 1. Project Registration

**POST** `/api/projects/register`

Register a new project from the frontend form.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectName": "Mangrove Restoration Project",
  "description": "Restoring mangrove ecosystems in coastal areas",
  "ecosystemType": "mangroves",
  "organizationName": "Environmental NGO",
  "ownerName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "area": "10.5",
  "density": "high",
  "location": {
    "lat": "19.0760",
    "lng": "72.8777",
    "address": "Mumbai, Maharashtra, India",
    "stateUT": "Maharashtra",
    "district": "Mumbai",
    "villagePanchayat": "Mumbai City"
  },
  "startDate": "2024-01-01",
  "duration": "5 years",
  "legalOwnership": "Community owned",
  "permits": ["Environmental Clearance", "Coastal Regulation Zone"],
  "baselineData": "Baseline carbon stock: 50 tCO2/ha",
  "monitoringPlan": "Quarterly monitoring with GPS coordinates",
  "validator": "Environmental Verifier",
  "communityConsent": true,
  "documents": [
    {
      "name": "Environmental Impact Assessment",
      "type": "pdf",
      "size": 1024000,
      "category": "legal",
      "ipfsHash": "QmHash..."
    }
  ],
  "plantationSpecies": ["Rhizophora apiculata", "Avicennia marina"],
  "treeCount": "1000",
  "averageHeight": "2.5",
  "averageLength": "1.2",
  "averageBreadth": "0.8",
  "seedlings": "500",
  "estimatedCO2Sequestration": 25.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project registered successfully and is pending verification.",
  "project": {
    "id": "68cfa9e72669348034fa86c6",
    "projectId": "PROJ_1758439911873_ABC12345",
    "name": "Mangrove Restoration Project",
    "status": "Pending",
    "ecosystemType": "mangroves",
    "area": 10.5,
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### 2. Get User Projects

**GET** `/api/projects/my-projects`

Get all projects created by the logged-in user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "_id": "68cfa9e72669348034fa86c6",
      "Project_ID": "PROJ_1758439911873_ABC12345",
      "Project_Name": "Mangrove Restoration Project",
      "status": "Pending",
      "Ecosystem_Type": "mangroves",
      "Area_Hectares": 10.5,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "blockchain": {
        "isRegistered": false,
        "isRetired": false
      }
    }
  ],
  "count": 1
}
```

### 3. Get Pending Verifications

**GET** `/api/verification/pending`

Get all projects pending verification (Verifiers only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "_id": "68cfa9e72669348034fa86c6",
      "Project_ID": "PROJ_1758439911873_ABC12345",
      "Project_Name": "Mangrove Restoration Project",
      "status": "Pending",
      "Ecosystem_Type": "mangroves",
      "Area_Hectares": 10.5,
      "createdBy": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### 4. Approve Project

**POST** `/api/verification/approve/:projectId`

Approve a project and register it on the blockchain (Verifiers only).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "comments": "Project meets all verification criteria. Mangrove species are appropriate for the location.",
  "gps": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "precision": 5
  },
  "mangroveData": {
    "species": ["Rhizophora apiculata", "Avicennia marina"],
    "treeCount": 1000,
    "avgDBHcm": 15,
    "avgHeightM": 2.5,
    "soilCarbonContentPercent": 2.5,
    "seedlingsCount": 500
  },
  "co2Estimate": 25.5,
  "photos": ["photo1.jpg", "photo2.jpg"],
  "videos": ["video1.mp4"],
  "evidenceHash": "QmEvidenceHash..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project approved and registered on blockchain successfully.",
  "verification": {
    "_id": "68cfa9e82669348034fa86ce",
    "projectId": "68cfa9e72669348034fa86c6",
    "status": "Approved",
    "comments": "Project meets all verification criteria...",
    "verifier": "68cfa9e72669348034fa86c7",
    "verifiedAt": "2024-01-20T11:00:00.000Z"
  },
  "blockchainResult": {
    "success": true,
    "tokenId": "1",
    "transactionHash": "0x1234567890abcdef...",
    "blockNumber": 12345678,
    "ipfsHash": "QmMetadataHash...",
    "gasUsed": "500000"
  },
  "project": {
    "id": "68cfa9e72669348034fa86c6",
    "status": "Verified",
    "blockchain": {
      "tokenId": "1",
      "contractAddress": "0xContractAddress...",
      "transactionHash": "0x1234567890abcdef...",
      "blockNumber": 12345678,
      "ipfsHash": "QmMetadataHash...",
      "isRegistered": true,
      "lastBlockchainUpdate": "2024-01-20T11:00:00.000Z"
    }
  }
}
```

### 5. Reject Project

**POST** `/api/verification/reject/:projectId`

Reject a project (Verifiers only).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "comments": "Project does not meet verification criteria. Insufficient baseline data.",
  "reason": "Insufficient documentation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project rejected successfully.",
  "verification": {
    "_id": "68cfa9e82669348034fa86ce",
    "projectId": "68cfa9e72669348034fa86c6",
    "status": "Rejected",
    "comments": "Project does not meet verification criteria...",
    "verifier": "68cfa9e72669348034fa86c7",
    "verifiedAt": "2024-01-20T11:00:00.000Z"
  },
  "project": {
    "id": "68cfa9e72669348034fa86c6",
    "status": "Rejected"
  }
}
```

## Frontend Integration

### 1. Project Registration Form

Update your frontend form to submit data to the new endpoint:

```javascript
const handleSubmit = async (formData) => {
  try {
    const response = await fetch('/api/projects/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    
    if (result.success) {
      // Show success message
      console.log('Project registered:', result.project);
      // Redirect to project dashboard or show success page
    } else {
      // Handle error
      console.error('Registration failed:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### 2. Project Status Tracking

Monitor project status changes:

```javascript
const checkProjectStatus = async (projectId) => {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    
    if (result.success) {
      const project = result.project;
      
      // Check if project is blockchain registered
      if (project.blockchain?.isRegistered) {
        console.log('Project registered on blockchain!');
        console.log('Token ID:', project.blockchain.tokenId);
        console.log('Transaction:', project.blockchain.transactionHash);
      }
    }
  } catch (error) {
    console.error('Error checking status:', error);
  }
};
```

## Blockchain Integration

### Smart Contract Structure

The updated smart contract stores minimal on-chain data:

```solidity
struct CarbonProject {
    string projectId;          // Unique project identifier
    string projectName;        // Name of the project
    string ecosystemType;      // Ecosystem type (mangroves, seagrass, etc.)
    string stateUT;            // State or Union Territory
    string district;           // District name
    string villagePanchayat;   // Village or Coastal Panchayat
    uint16 carbonCredits;      // Number of carbon credits issued
    bool isRetired;            // Whether credits have been retired
    uint64 retirementDate;     // Timestamp of retirement
    string retirementReason;   // Reason for retirement
    ProjectStatus status;      // Project status (enum)
    address projectOwner;      // Wallet address of project owner
    bytes32 ipfsHash;          // IPFS hash of full project metadata
}
```

### Project Status Enum

```solidity
enum ProjectStatus { PENDING, VERIFIED, RETIRED }
```

### Key Functions

1. **registerProject**: Register a verified project on blockchain
2. **retireCredits**: Retire carbon credits permanently
3. **updateProjectStatus**: Update project status
4. **getProject**: Retrieve project data by token ID
5. **getProjectById**: Retrieve project data by project ID

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "message": "Project not found."
}
```

```json
{
  "success": false,
  "message": "Project is not in pending status."
}
```

```json
{
  "success": false,
  "message": "Project approved but blockchain registration failed. Please retry blockchain registration.",
  "blockchainError": "Insufficient gas for transaction"
}
```

### Blockchain Registration Failures

If blockchain registration fails during approval, the project is still marked as verified in the database, but you can retry the blockchain registration using:

**POST** `/api/verification/retry-blockchain/:projectId`

## Testing

Run the test script to verify the integration:

```bash
node scripts/testProjectFlow.js
```

This will test:
- Project creation
- Verification process
- Status updates
- Blockchain data preparation
- Database operations

## Environment Variables

Ensure these environment variables are set:

```env
MONGODB_URI=mongodb://localhost:27017/carbon-credits
CONTRACT_ADDRESS=0xYourContractAddress
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-project-id
PRIVATE_KEY=your-private-key
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Role-based Access**: Different endpoints have different role requirements
3. **Input Validation**: Validate all input data before processing
4. **Blockchain Security**: Private keys should be stored securely
5. **IPFS**: Ensure IPFS gateway is accessible and secure

## Monitoring

Monitor the following:
- Project registration success rates
- Verification approval/rejection rates
- Blockchain transaction success rates
- Gas usage and costs
- IPFS upload success rates

This integration provides a complete flow from frontend project registration to blockchain storage, ensuring data integrity and transparency in the carbon credit system.
