#!/usr/bin/env node

/**
 * Simple Data Viewer
 * Creates a simple web interface to view blockchain data
 */

const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = 3002;

// Connect to local Hardhat network
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const accounts = provider.listAccounts().then(accounts => accounts[0]);

// Contract ABI
const contractABI = [
  "function getTotalProjects() external view returns (uint256)",
  "function getTotalCarbonCredits() external view returns (uint256)",
  "function getProject(uint256 tokenId) external view returns (tuple(string projectId, string projectName, string description, string ecosystemType, string organizationName, string ownerName, string email, string phone, tuple(string lat, string lng, string fullAddress) location, uint256 area, uint256 density, uint256 startDate, uint256 duration, string legalOwnership, string[] permits, bool communityConsent, tuple(string[] species, uint256 treeCount, uint256 averageHeight, uint256 averageLength, uint256 averageBreadth, uint256 seedlings, uint256 estimatedCO2Sequestration) plantation, string baselineData, string monitoringPlan, string validator, string[] documents, string stateUT, string district, string villagePanchayat, string coordinates, uint256 areaHectares, string speciesPlanted, uint256 plantationDate, string verificationAgency, uint256 verifiedDate, uint256 carbonSequestration, uint256 carbonCredits, string status, string supportingNGO, string ipfsHash, address projectOwner, bool isRetired, uint256 retirementDate, string retirementReason))"
];

const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

app.use(express.static('public'));

// API endpoint to get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const wallet = await accounts;
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const totalProjects = await contract.getTotalProjects();
    const projects = [];
    
    for (let i = 1; i <= totalProjects; i++) {
      try {
        const project = await contract.getProject(i);
        projects.push({
          tokenId: i,
          projectId: project.projectId,
          projectName: project.projectName,
          description: project.description,
          ecosystemType: project.ecosystemType,
          organizationName: project.organizationName,
          ownerName: project.ownerName,
          email: project.email,
          phone: project.phone,
          location: project.location,
          area: project.area.toString(),
          density: project.density.toString(),
          startDate: new Date(Number(project.startDate) * 1000).toLocaleDateString(),
          duration: project.duration.toString(),
          legalOwnership: project.legalOwnership,
          permits: project.permits,
          communityConsent: project.communityConsent,
          plantation: project.plantation,
          baselineData: project.baselineData,
          monitoringPlan: project.monitoringPlan,
          validator: project.validator,
          documents: project.documents,
          carbonCredits: project.carbonCredits.toString(),
          status: project.status,
          isRetired: project.isRetired
        });
      } catch (error) {
        console.log(`Error loading project ${i}: ${error.message}`);
      }
    }
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const wallet = await accounts;
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const totalProjects = await contract.getTotalProjects();
    const totalCredits = await contract.getTotalCarbonCredits();
    
    res.json({
      totalProjects: totalProjects.toString(),
      totalCredits: totalCredits.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Carbon Credit Registry - Data Viewer</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            h1 {
                color: #2d3748;
                text-align: center;
                margin-bottom: 30px;
                font-size: 2.5rem;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .stat-number {
                font-size: 2rem;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .stat-label {
                font-size: 0.9rem;
                opacity: 0.9;
            }
            .projects {
                margin-top: 30px;
            }
            .project-card {
                border: 1px solid #e2e8f0;
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 20px;
                background: #f8fafc;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .project-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            }
            .project-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .project-title {
                font-size: 1.3rem;
                font-weight: bold;
                color: #2d3748;
            }
            .project-id {
                background: #4299e1;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.8rem;
            }
            .project-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-bottom: 15px;
            }
            .info-item {
                display: flex;
                flex-direction: column;
            }
            .info-label {
                font-size: 0.8rem;
                color: #718096;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 3px;
            }
            .info-value {
                font-weight: 500;
                color: #2d3748;
            }
            .species-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }
            .species-tag {
                background: #48bb78;
                color: white;
                padding: 4px 12px;
                border-radius: 15px;
                font-size: 0.8rem;
            }
            .loading {
                text-align: center;
                padding: 40px;
                color: #718096;
            }
            .error {
                background: #fed7d7;
                color: #c53030;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌱 Carbon Credit Registry</h1>
            
            <div class="stats" id="stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalProjects">-</div>
                    <div class="stat-label">Total Projects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalCredits">-</div>
                    <div class="stat-label">Carbon Credits</div>
                </div>
            </div>
            
            <div class="projects" id="projects">
                <div class="loading">Loading projects...</div>
            </div>
        </div>

        <script>
            async function loadData() {
                try {
                    // Load statistics
                    const statsResponse = await fetch('/api/statistics');
                    const stats = await statsResponse.json();
                    
                    document.getElementById('totalProjects').textContent = stats.totalProjects;
                    document.getElementById('totalCredits').textContent = stats.totalCredits;
                    
                    // Load projects
                    const projectsResponse = await fetch('/api/projects');
                    const projects = await projectsResponse.json();
                    
                    const projectsContainer = document.getElementById('projects');
                    
                    if (projects.length === 0) {
                        projectsContainer.innerHTML = '<div class="loading">No projects found</div>';
                        return;
                    }
                    
                    projectsContainer.innerHTML = projects.map(project => \`
                        <div class="project-card">
                            <div class="project-header">
                                <div class="project-title">\${project.projectName}</div>
                                <div class="project-id">#\${project.tokenId}</div>
                            </div>
                            
                            <div class="project-info">
                                <div class="info-item">
                                    <div class="info-label">Project ID</div>
                                    <div class="info-value">\${project.projectId}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Ecosystem</div>
                                    <div class="info-value">\${project.ecosystemType}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Organization</div>
                                    <div class="info-value">\${project.organizationName}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Owner</div>
                                    <div class="info-value">\${project.ownerName}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Area</div>
                                    <div class="info-value">\${project.area} hectares</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Tree Count</div>
                                    <div class="info-value">\${parseInt(project.plantation.treeCount).toLocaleString()}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">CO2 Sequestration</div>
                                    <div class="info-value">\${project.plantation.estimatedCO2Sequestration} tonnes</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Carbon Credits</div>
                                    <div class="info-value">\${project.carbonCredits}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Location</div>
                                    <div class="info-value">\${project.location.fullAddress}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Start Date</div>
                                    <div class="info-value">\${project.startDate}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Status</div>
                                    <div class="info-value">\${project.status}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Community Consent</div>
                                    <div class="info-value">\${project.communityConsent ? 'Yes' : 'No'}</div>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">Plantation Species</div>
                                <div class="species-list">
                                    \${project.plantation.species.map(species => \`<span class="species-tag">\${species}</span>\`).join('')}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">Permits</div>
                                <div class="info-value">\${project.permits.join(', ')}</div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">Description</div>
                                <div class="info-value">\${project.description}</div>
                            </div>
                        </div>
                    \`).join('');
                    
                } catch (error) {
                    document.getElementById('projects').innerHTML = \`
                        <div class="error">
                            Error loading data: \${error.message}
                        </div>
                    \`;
                }
            }
            
            // Load data when page loads
            loadData();
            
            // Refresh data every 30 seconds
            setInterval(loadData, 30000);
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Data Viewer running at http://localhost:${PORT}`);
  console.log('📊 View all your blockchain data in a beautiful web interface!');
});

module.exports = app;
