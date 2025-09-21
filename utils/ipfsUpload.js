import { create } from 'ipfs-http-client';
import axios from 'axios';

class IPFSService {
  constructor() {
    // Using free IPFS services
    this.ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`
        ).toString('base64')}`
      }
    });
    
    // Alternative free IPFS gateways
    this.gateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];
  }

  /**
   * Upload data to IPFS
   * @param {Object} data - Data to upload
   * @returns {Promise<string>} IPFS hash
   */
  async uploadToIPFS(data) {
    try {
      const dataString = JSON.stringify(data, null, 2);
      const result = await this.ipfs.add(dataString);
      return result.path;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }

  /**
   * Upload file to IPFS
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Original filename
   * @returns {Promise<string>} IPFS hash
   */
  async uploadFileToIPFS(fileBuffer, filename) {
    try {
      const result = await this.ipfs.add({
        path: filename,
        content: fileBuffer
      });
      return result.path;
    } catch (error) {
      console.error('IPFS file upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Retrieve data from IPFS
   * @param {string} ipfsHash - IPFS hash
   * @returns {Promise<Object>} Retrieved data
   */
  async getFromIPFS(ipfsHash) {
    try {
      // Try different gateways for reliability
      for (const gateway of this.gateways) {
        try {
          const response = await axios.get(`${gateway}${ipfsHash}`, {
            timeout: 10000
          });
          return response.data;
        } catch (gatewayError) {
          console.warn(`Gateway ${gateway} failed:`, gatewayError.message);
          continue;
        }
      }
      throw new Error('All IPFS gateways failed');
    } catch (error) {
      console.error('IPFS retrieval error:', error);
      throw new Error('Failed to retrieve from IPFS');
    }
  }

  /**
   * Create metadata for carbon credit project
   * @param {Object} projectData - Project data from MongoDB
   * @returns {Object} NFT metadata
   */
  createProjectMetadata(projectData) {
    return {
      name: `${projectData.Project_Name} - Carbon Credit`,
      description: `Carbon credit token for ${projectData.Project_Name} project in ${projectData.State_UT}, ${projectData.District}. This project has sequestered ${projectData.Carbon_Sequestration_tCO2} tCO2 and issued ${projectData.Carbon_Credits_Issued} carbon credits.`,
      image: `https://ipfs.io/ipfs/QmYourProjectImageHash`, // Replace with actual image hash
      external_url: `https://your-domain.com/projects/${projectData.Project_ID}`,
      attributes: [
        {
          trait_type: "Project ID",
          value: projectData.Project_ID
        },
        {
          trait_type: "Ecosystem Type",
          value: projectData.Ecosystem_Type
        },
        {
          trait_type: "State/UT",
          value: projectData.State_UT
        },
        {
          trait_type: "District",
          value: projectData.District
        },
        {
          trait_type: "Area (Hectares)",
          value: projectData.Area_Hectares
        },
        {
          trait_type: "Species Planted",
          value: projectData.Species_Planted
        },
        {
          trait_type: "Plantation Date",
          value: new Date(projectData.Plantation_Date).toISOString()
        },
        {
          trait_type: "Verification Agency",
          value: projectData.Verification_Agency
        },
        {
          trait_type: "Verified Date",
          value: new Date(projectData.Verified_Date).toISOString()
        },
        {
          trait_type: "Carbon Sequestration (tCO2)",
          value: projectData.Carbon_Sequestration_tCO2
        },
        {
          trait_type: "Carbon Credits Issued",
          value: projectData.Carbon_Credits_Issued
        },
        {
          trait_type: "Status",
          value: projectData.Status
        },
        {
          trait_type: "Supporting NGO/Community",
          value: projectData.Supporting_NGO_Community
        },
        {
          trait_type: "Coordinates",
          value: projectData.Latitude_Longitude
        }
      ],
      properties: {
        project_id: projectData.Project_ID,
        ecosystem_type: projectData.Ecosystem_Type,
        state_ut: projectData.State_UT,
        district: projectData.District,
        village_panchayat: projectData.Village_Coastal_Panchayat,
        coordinates: projectData.Latitude_Longitude,
        area_hectares: projectData.Area_Hectares,
        species_planted: projectData.Species_Planted,
        plantation_date: projectData.Plantation_Date,
        verification_agency: projectData.Verification_Agency,
        verified_date: projectData.Verified_Date,
        carbon_sequestration: projectData.Carbon_Sequestration_tCO2,
        carbon_credits: projectData.Carbon_Credits_Issued,
        status: projectData.Status,
        supporting_ngo: projectData.Supporting_NGO_Community
      }
    };
  }

  /**
   * Get IPFS URL for a hash
   * @param {string} ipfsHash - IPFS hash
   * @returns {string} IPFS URL
   */
  getIPFSUrl(ipfsHash) {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  /**
   * Validate IPFS hash format
   * @param {string} hash - IPFS hash to validate
   * @returns {boolean} Whether hash is valid
   */
  isValidIPFSHash(hash) {
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || 
           /^bafybei[a-z2-7]{52}$/.test(hash);
  }
}

export default new IPFSService();
