# Carbon Credit Registry API Documentation

## Overview

This API provides endpoints for managing carbon credit projects with blockchain integration. Each project is represented as an ERC-721 NFT token on the Ethereum Sepolia testnet.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All blockchain endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Blockchain Endpoints

### 1. Register Project on Blockchain

**POST** `/blockchain/register/:projectId`

Registers a verified project on the blockchain as an NFT.

**Parameters:**
- `projectId` (path): The unique project identifier

**Response:**
```json
{
  "success": true,
  "message": "Project registered on blockchain successfully",
  "data": {
    "tokenId": "1",
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "ipfsHash": "Qm...",
    "gasUsed": "234567"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/blockchain/register/SDF-WB-2022-001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Retire Carbon Credits

**POST** `/blockchain/retire/:projectId`

Retires (burns) carbon credits permanently.

**Parameters:**
- `projectId` (path): The unique project identifier

**Request Body:**
```json
{
  "amount": 1000,
  "reason": "Project completed successfully"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Credits retired successfully",
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345679,
    "gasUsed": "123456"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/blockchain/retire/SDF-WB-2022-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 1000, "reason": "Project completed"}'
```

### 3. Update Project Status

**PUT** `/blockchain/status/:projectId`

Updates the project status on the blockchain.

**Parameters:**
- `projectId` (path): The unique project identifier

**Request Body:**
```json
{
  "status": "Completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project status updated successfully",
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345680,
    "gasUsed": "98765"
  }
}
```

### 4. Get Project from Blockchain

**GET** `/blockchain/project/:projectId`

Retrieves project data from both database and blockchain.

**Parameters:**
- `projectId` (path): The unique project identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "Project_ID": "SDF-WB-2022-001",
      "Project_Name": "Sundarbans Mangrove Restoration",
      "Ecosystem_Type": "Mangrove",
      "blockchain": {
        "tokenId": "1",
        "isRegistered": true,
        "isRetired": false
      }
    },
    "blockchain": {
      "tokenId": "1",
      "projectId": "SDF-WB-2022-001",
      "carbonCredits": "8250",
      "isRetired": false
    },
    "ipfsMetadata": {
      "name": "Sundarbans Mangrove Restoration - Carbon Credit",
      "description": "Carbon credit token for...",
      "attributes": [...]
    }
  }
}
```

### 5. Get Blockchain Statistics

**GET** `/blockchain/statistics`

Retrieves overall blockchain statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProjects": "5",
    "totalCarbonCredits": "25000",
    "totalRetiredCredits": "5000",
    "activeCredits": "20000",
    "walletBalance": "0.5",
    "contractAddress": "0x..."
  }
}
```

### 6. Get All Blockchain Projects

**GET** `/blockchain/projects`

Retrieves all projects registered on the blockchain with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `ecosystemType` (optional): Filter by ecosystem type

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "Project_ID": "SDF-WB-2022-001",
        "Project_Name": "Sundarbans Mangrove Restoration",
        "Ecosystem_Type": "Mangrove",
        "State_UT": "West Bengal",
        "Carbon_Credits_Issued": 8250,
        "blockchain": {
          "tokenId": "1",
          "isRegistered": true,
          "isRetired": false
        }
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1
    }
  }
}
```

### 7. Verify Project on Blockchain

**GET** `/blockchain/verify/:projectId`

Checks if a project exists on the blockchain.

**Parameters:**
- `projectId` (path): The unique project identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "SDF-WB-2022-001",
    "existsOnBlockchain": true
  }
}
```

### 8. Get Token URI

**GET** `/blockchain/token-uri/:projectId`

Retrieves the token URI for a project (IPFS metadata URL).

**Parameters:**
- `projectId` (path): The unique project identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenId": "1",
    "tokenURI": "https://ipfs.io/ipfs/Qm...",
    "ipfsHash": "Qm..."
  }
}
```

### 9. Sync Project with Blockchain

**POST** `/blockchain/sync/:projectId`

Syncs local project data with the latest blockchain state.

**Parameters:**
- `projectId` (path): The unique project identifier

**Response:**
```json
{
  "success": true,
  "message": "Project synced with blockchain successfully",
  "data": {
    "project": {...},
    "blockchainData": {...}
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `404`: Not Found (project not found)
- `500`: Internal Server Error

## Rate Limiting

Currently no rate limiting is implemented, but it's recommended to add rate limiting for production use.

## Webhooks

The system emits events that can be used for webhook integration:

- `ProjectRegistered`: When a project is registered on blockchain
- `CreditsRetired`: When carbon credits are retired
- `ProjectUpdated`: When project data is updated

## Testing

Use the provided test script to verify blockchain functionality:

```bash
npm run test:blockchain
```

## Sample Data

The system includes sample data migration:

```bash
npm run migrate
```

This will create a sample project with the Sundarbans Mangrove Restoration data.

## Security Considerations

1. **Private Keys**: Never expose private keys in client-side code
2. **Authentication**: All blockchain operations require valid JWT tokens
3. **Input Validation**: All inputs are validated before blockchain operations
4. **Gas Limits**: Appropriate gas limits are set to prevent failed transactions
5. **Error Handling**: Comprehensive error handling prevents sensitive data exposure

## Monitoring

Monitor the following metrics:

- Transaction success rates
- Gas usage patterns
- IPFS availability
- Contract event emissions
- Wallet balance

## Verification Endpoints

### 1. Get Pending Evidence

**GET** `/api/verification/pending-evidence`

Retrieves all evidence pending verification for verifiers to review.

**Response:**
```json
{
  "success": true,
  "evidence": [
    {
      "_id": "68d0a1b711605742bdef4974",
      "projectId": "BC-MFTHXD6D-JA5PLX",
      "timestampISO": "2025-09-21T10:15:30.000Z",
      "gps": {
        "latitude": 28.44321,
        "longitude": 77.5065,
        "precision": 5
      },
      "photos": ["site_photo_1.png", "site_photo_2.png"],
      "videos": ["inspection_video_1.mp4"],
      "ecosystemType": "mangrove",
      "soilCores": [
        {
          "depth_cm": 10,
          "carbon_kg": 2.5
        }
      ],
      "co2Estimate": 15,
      "evidenceHash": "ab12cd34ef5678901234567890abcdef1234567890abcdef1234567890abcd",
      "status": "PENDING",
      "submittedAt": "2025-09-21T10:15:35.000Z",
      "inspector": {
        "name": "John Inspector",
        "email": "john@example.com"
      }
    }
  ],
  "count": 1
}
```

### 2. Submit Evidence Verification

**POST** `/api/verification/submit`

Allows verifiers to submit verification for evidence data. When approved, minimal essential data is stored on blockchain while detailed data remains off-chain.

**Request Body:**
```json
{
  "evidenceId": "68d0a1b711605742bdef4974",
  "projectId": "BC-MFTHXD6D-JA5PLX",
  "status": "APPROVED",
  "comments": "Evidence verified successfully",
  "gps": {
    "latitude": 28.44321,
    "longitude": 77.5065,
    "precision": 5
  },
  "ecosystemType": "mangrove",
  "soilCores": [
    {
      "depth_cm": 10,
      "carbon_kg": 2.5
    }
  ],
  "co2Estimate": 15,
  "photos": ["site_photo_1.png", "site_photo_2.png"],
  "videos": ["inspection_video_1.mp4"],
  "evidenceHash": "ab12cd34ef5678901234567890abcdef1234567890abcdef1234567890abcd"
}
```

**Response (Approved):**
```json
{
  "success": true,
  "message": "Evidence verified and registered on blockchain successfully",
  "verification": {
    "_id": "...",
    "projectId": "...",
    "evidenceId": "68d0a1b711605742bdef4974",
    "status": "Approved",
    "comments": "Evidence verified successfully",
    "verifier": "...",
    "verifiedAt": "2025-09-21T10:15:35.000Z",
    "blockchain": {
      "tokenId": "1",
      "transactionHash": "0x...",
      "blockNumber": 12345678,
      "ipfsHash": "Qm...",
      "isRegistered": true
    }
  },
  "blockchainResult": {
    "tokenId": "1",
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "ipfsHash": "Qm...",
    "gasUsed": "234567"
  },
  "evidence": {
    "id": "68d0a1b711605742bdef4974",
    "status": "APPROVED",
    "verifiedAt": "2025-09-21T10:15:35.000Z"
  }
}
```

**Response (Rejected):**
```json
{
  "success": true,
  "message": "Evidence verification completed (rejected)",
  "verification": {
    "_id": "...",
    "status": "Rejected",
    "comments": "Insufficient evidence provided"
  },
  "evidence": {
    "id": "68d0a1b711605742bdef4974",
    "status": "REJECTED",
    "verifiedAt": "2025-09-21T10:15:35.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/verification/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "evidenceId": "68d0a1b711605742bdef4974",
    "status": "APPROVED",
    "comments": "Evidence verified successfully",
    "co2Estimate": 15,
    "evidenceHash": "ab12cd34ef5678901234567890abcdef1234567890abcdef1234567890abcd"
  }'
```

**Required Fields:**
- `evidenceId`: The ID of the evidence to verify
- `status`: Either "APPROVED" or "REJECTED"
- `evidenceHash`: Hash of the evidence data for immutability

**Optional Fields:**
- `comments`: Verifier comments
- `gps`: GPS coordinates (if different from original)
- `ecosystemType`: Type of ecosystem
- `soilCores`: Soil core data
- `co2Estimate`: CO2 sequestration estimate
- `photos`: Photo references
- `videos`: Video references

**Blockchain Storage:**
When evidence is approved, only essential data is stored on-chain:
- Project ID
- Project name
- Ecosystem type
- CO2 estimate (as carbon credits)
- Basic location info
- IPFS hash for detailed metadata

All detailed evidence data (photos, videos, sensor readings, etc.) remains off-chain in the database and IPFS.

## Support

For issues or questions:

1. Check the server logs for detailed error messages
2. Verify blockchain transaction status on Etherscan
3. Ensure proper environment configuration
4. Check IPFS gateway availability
