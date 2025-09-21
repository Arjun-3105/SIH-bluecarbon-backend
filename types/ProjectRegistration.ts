/**
 * TypeScript interfaces for project registration
 * These interfaces match the frontend form data structure and can be used
 * to ensure type safety when converting to contract format
 */

export interface Location {
  lat: string;
  lng: string;
  address: string; // This stays as 'address' for frontend compatibility
}

export interface PlantationData {
  species: string[];
  treeCount: number;
  averageHeight: number;
  averageLength: number;
  averageBreadth: number;
  seedlings: number;
  estimatedCO2Sequestration: number;
}

export interface FormData {
  projectId: string;
  projectName: string;
  description: string;
  ecosystemType: string;
  organizationName: string;
  ownerName: string;
  email: string;
  phone: string;
  area: number;
  density: number;
  location: Location;
  startDate: number;
  duration: number;
  legalOwnership: string;
  permits: string[];
  baselineData: string;
  monitoringPlan: string;
  validator: string;
  communityConsent: boolean;
  documents: string[];
  // Plantation data
  plantationSpecies: string[];
  treeCount: number;
  averageHeight: number;
  averageLength: number;
  averageBreadth: number;
  seedlings: number;
  estimatedCO2Sequestration: number;
}

export interface EcosystemType {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export interface ProjectStep {
  title: string;
  icon: React.ReactNode;
  fields: number;
}

export interface CurrentLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// Contract-specific interfaces
export interface ContractLocation {
  lat: string;
  lng: string;
  fullAddress: string; // Contract uses 'fullAddress' to avoid Solidity keyword conflict
}

export interface ContractPlantationData {
  species: string[];
  treeCount: number;
  averageHeight: number;
  averageLength: number;
  averageBreadth: number;
  seedlings: number;
  estimatedCO2Sequestration: number;
}

export interface ContractProjectData {
  // Basic Project Information
  projectId: string;
  projectName: string;
  description: string;
  ecosystemType: string;
  
  // Organization Information
  organizationName: string;
  ownerName: string;
  email: string;
  phone: string;
  
  // Location and Area Information
  location: ContractLocation;
  area: number;
  density: number;
  
  // Project Timeline
  startDate: number;
  duration: number;
  
  // Legal and Ownership
  legalOwnership: string;
  permits: string[];
  communityConsent: boolean;
  
  // Plantation Data
  plantation: ContractPlantationData;
  
  // Monitoring and Validation
  baselineData: string;
  monitoringPlan: string;
  validator: string;
  
  // Documents and Evidence
  documents: string[];
  
  // Legacy fields for backward compatibility
  stateUT: string;
  district: string;
  villagePanchayat: string;
  coordinates: string;
  areaHectares: number;
  speciesPlanted: string;
  plantationDate: number;
  verificationAgency: string;
  verifiedDate: number;
  carbonSequestration: number;
  carbonCredits: number;
  status: string;
  supportingNGO: string;
  ipfsHash: string;
  projectOwner: string;
  isRetired: boolean;
  retirementDate: number;
  retirementReason: string;
}

// Utility function to convert frontend data to contract format
export function convertFrontendToContract(frontendData: FormData): ContractProjectData {
  return {
    // Basic Project Information
    projectId: frontendData.projectId,
    projectName: frontendData.projectName,
    description: frontendData.description,
    ecosystemType: frontendData.ecosystemType,
    
    // Organization Information
    organizationName: frontendData.organizationName,
    ownerName: frontendData.ownerName,
    email: frontendData.email,
    phone: frontendData.phone,
    
    // Location and Area Information
    location: {
      lat: frontendData.location.lat,
      lng: frontendData.location.lng,
      fullAddress: frontendData.location.address
    },
    area: frontendData.area,
    density: frontendData.density,
    
    // Project Timeline
    startDate: frontendData.startDate,
    duration: frontendData.duration,
    
    // Legal and Ownership
    legalOwnership: frontendData.legalOwnership,
    permits: frontendData.permits,
    communityConsent: frontendData.communityConsent,
    
    // Plantation Data
    plantation: {
      species: frontendData.plantationSpecies,
      treeCount: frontendData.treeCount,
      averageHeight: frontendData.averageHeight,
      averageLength: frontendData.averageLength,
      averageBreadth: frontendData.averageBreadth,
      seedlings: frontendData.seedlings,
      estimatedCO2Sequestration: frontendData.estimatedCO2Sequestration
    },
    
    // Monitoring and Validation
    baselineData: frontendData.baselineData,
    monitoringPlan: frontendData.monitoringPlan,
    validator: frontendData.validator,
    
    // Documents and Evidence
    documents: frontendData.documents,
    
    // Legacy fields (will be set by contract)
    stateUT: "",
    district: "",
    villagePanchayat: "",
    coordinates: "",
    areaHectares: 0,
    speciesPlanted: "",
    plantationDate: 0,
    verificationAgency: "",
    verifiedDate: 0,
    carbonSequestration: 0,
    carbonCredits: 0,
    status: "",
    supportingNGO: "",
    ipfsHash: "",
    projectOwner: "0x0000000000000000000000000000000000000000",
    isRetired: false,
    retirementDate: 0,
    retirementReason: ""
  };
}

// CO2 calculation function (matches frontend logic)
export function calculateCO2Sequestration(
  treeCount: number,
  avgHeight: number,
  avgLength: number,
  avgBreadth: number,
  ecosystemType: string
): number {
  // Basic biomass calculation based on tree dimensions
  const volume = avgHeight * avgLength * avgBreadth; // m³
  const biomass = volume * 0.6; // kg (approximate biomass density)
  
  // CO2 sequestration factors by ecosystem type (kg CO2 per kg biomass per year)
  const co2Factors: Record<string, number> = {
    mangroves: 1.8,
    seagrass: 0.9,
    salt_marsh: 1.2,
    coral_reef: 0.3
  };
  
  const factor = co2Factors[ecosystemType] || 1.0;
  const co2PerTree = biomass * factor;
  const totalCO2 = (co2PerTree * treeCount) / 1000; // Convert to tonnes
  
  return Math.round(totalCO2 * 100) / 100; // Round to 2 decimal places
}
