/**
 * Example of how a verifier frontend would integrate with the verification system
 * This demonstrates the complete flow from getting pending evidence to submitting verification
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

class VerifierFrontend {
  constructor(authToken) {
    this.authToken = authToken;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
  }

  /**
   * Get all pending evidence for verification
   */
  async getPendingEvidence() {
    try {
      const response = await axios.get(`${BASE_URL}/verification/pending-evidence`, {
        headers: this.headers
      });
      
      console.log('📋 Pending Evidence:');
      console.log(`Found ${response.data.count} items pending verification`);
      
      return response.data.evidence;
    } catch (error) {
      console.error('❌ Error fetching pending evidence:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Submit verification for evidence
   */
  async submitVerification(evidenceId, verificationData) {
    try {
      const payload = {
        evidenceId,
        ...verificationData
      };

      const response = await axios.post(`${BASE_URL}/verification/submit`, payload, {
        headers: this.headers
      });

      console.log('✅ Verification submitted successfully:');
      console.log(`Status: ${response.data.evidence.status}`);
      
      if (response.data.blockchainResult) {
        console.log(`Blockchain Token ID: ${response.data.blockchainResult.tokenId}`);
        console.log(`Transaction Hash: ${response.data.blockchainResult.transactionHash}`);
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error submitting verification:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Approve evidence with comments
   */
  async approveEvidence(evidenceId, comments, co2Estimate) {
    const verificationData = {
      status: 'APPROVED',
      comments,
      co2Estimate
    };

    return await this.submitVerification(evidenceId, verificationData);
  }

  /**
   * Reject evidence with reason
   */
  async rejectEvidence(evidenceId, reason) {
    const verificationData = {
      status: 'REJECTED',
      comments: reason
    };

    return await this.submitVerification(evidenceId, verificationData);
  }
}

// Example usage
async function demonstrateVerifierFlow() {
  console.log('🔍 Verifier Frontend Integration Example');
  console.log('========================================\n');

  // Initialize verifier frontend (in real app, token would come from login)
  const verifier = new VerifierFrontend('YOUR_JWT_TOKEN_HERE');

  try {
    // Step 1: Get pending evidence
    console.log('Step 1: Fetching pending evidence...');
    const pendingEvidence = await verifier.getPendingEvidence();
    
    if (pendingEvidence.length === 0) {
      console.log('No pending evidence found.');
      return;
    }

    // Step 2: Review first evidence item
    const evidence = pendingEvidence[0];
    console.log('\nStep 2: Reviewing evidence...');
    console.log(`Evidence ID: ${evidence._id}`);
    console.log(`Project ID: ${evidence.projectId}`);
    console.log(`Ecosystem Type: ${evidence.ecosystemType}`);
    console.log(`CO2 Estimate: ${evidence.co2Estimate}`);
    console.log(`GPS: ${evidence.gps.latitude}, ${evidence.gps.longitude}`);
    console.log(`Photos: ${evidence.photos.length} files`);
    console.log(`Videos: ${evidence.videos.length} files`);

    // Step 3: Approve the evidence
    console.log('\nStep 3: Approving evidence...');
    const result = await verifier.approveEvidence(
      evidence._id,
      'Evidence verified successfully. All measurements are accurate and meet verification standards.',
      evidence.co2Estimate
    );

    console.log('\n✅ Verification completed successfully!');
    console.log('Blockchain registration:', result.blockchainResult ? 'Success' : 'Failed');

  } catch (error) {
    console.error('❌ Error in verification flow:', error.message);
  }
}

// Example of rejecting evidence
async function demonstrateRejection() {
  console.log('\n🚫 Evidence Rejection Example');
  console.log('==============================\n');

  const verifier = new VerifierFrontend('YOUR_JWT_TOKEN_HERE');

  try {
    const pendingEvidence = await verifier.getPendingEvidence();
    
    if (pendingEvidence.length > 0) {
      const evidence = pendingEvidence[0];
      
      console.log('Rejecting evidence:', evidence._id);
      const result = await verifier.rejectEvidence(
        evidence._id,
        'Insufficient evidence provided. Please resubmit with additional documentation.'
      );

      console.log('✅ Evidence rejected successfully');
    }
  } catch (error) {
    console.error('❌ Error rejecting evidence:', error.message);
  }
}

// React/Vue component example structure
const VerifierComponentExample = `
// React component example
import React, { useState, useEffect } from 'react';

const VerifierDashboard = () => {
  const [pendingEvidence, setPendingEvidence] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingEvidence();
  }, []);

  const fetchPendingEvidence = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verification/pending-evidence', {
        headers: {
          'Authorization': \`Bearer \${authToken}\`
        }
      });
      const data = await response.json();
      setPendingEvidence(data.evidence);
    } catch (error) {
      console.error('Error fetching evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (evidenceId, status, comments) => {
    try {
      const response = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${authToken}\`
        },
        body: JSON.stringify({
          evidenceId,
          status,
          comments
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the list
        fetchPendingEvidence();
        alert('Verification submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
    }
  };

  return (
    <div className="verifier-dashboard">
      <h2>Pending Evidence for Verification</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="evidence-list">
          {pendingEvidence.map(evidence => (
            <div key={evidence._id} className="evidence-card">
              <h3>Project: {evidence.projectId}</h3>
              <p>Ecosystem: {evidence.ecosystemType}</p>
              <p>CO2 Estimate: {evidence.co2Estimate}</p>
              <p>Location: {evidence.gps.latitude}, {evidence.gps.longitude}</p>
              
              <div className="verification-actions">
                <button 
                  onClick={() => handleVerify(evidence._id, 'APPROVED', 'Approved')}
                  className="approve-btn"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleVerify(evidence._id, 'REJECTED', 'Rejected')}
                  className="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifierDashboard;
`;

if (require.main === module) {
  // Run examples if this file is executed directly
  console.log('Note: These examples require a valid JWT token and running server');
  console.log('Update YOUR_JWT_TOKEN_HERE with a real token to test');
  
  // Uncomment to run examples:
  // demonstrateVerifierFlow();
  // demonstrateRejection();
}

module.exports = {
  VerifierFrontend,
  demonstrateVerifierFlow,
  demonstrateRejection,
  VerifierComponentExample
};
