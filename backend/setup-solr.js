/**
 * Solr Setup Script
 * Run: node setup-solr.js
 * This script initializes Solr and reindexes all medicines from MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const solrClient = require('./utils/solrClient');
const { reindexAllMedicines } = require('./utils/solrIndexer');
const doctorSolrClient = require('./utils/doctorSolrClient');
const { reindexAllDoctors } = require('./utils/doctorSolrIndexer');
const Medicine = require('./models/Medicine');
const Doctor = require('./models/Doctor');

async function testSolrConnection() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8983,
      path: '/solr/admin/info/system',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function setup() {
  try {
    console.log('🔍 FDFED Project - Solr Setup Script');
    console.log('====================================');
    console.log('');

    // Check Solr connection
    console.log('Checking Solr connection...');
    const solrRunning = await testSolrConnection();
    
    if (!solrRunning) {
      console.error('❌ Solr is not running on http://localhost:8983');
      console.log('Please ensure Solr is running:');
      console.log('  docker-compose up -d solr');
      process.exit(1);
    }
    
    console.log('✅ Solr is running on http://localhost:8983');
    console.log('');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Wait for Solr clients to be ready
    console.log('Initializing Solr clients...');
    let attempts = 0;
    while ((!solrClient.isReady() || !doctorSolrClient.isReady()) && attempts < 20) {
      console.log(`⏳ Waiting for Solr cores to be ready (${attempts + 1}/20)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!solrClient.isReady() || !doctorSolrClient.isReady()) {
      console.error('❌ One or more Solr cores did not become ready');
      process.exit(1);
    }

    console.log('✅ Solr client is ready');
    console.log('');

    // Get medicine count
    console.log('Checking medicines in database...');
    const medicineCount = await Medicine.countDocuments();
    
    if (medicineCount === 0) {
      console.warn('⚠️  No medicines found in database');
      console.log('Please add medicines before reindexing');
      process.exit(0);
    }

    console.log(`📚 Found ${medicineCount} medicines to index`);
    console.log('');

    // Reindex medicines
    console.log('Reindexing medicines to Solr...');
    const medicineSuccess = await reindexAllMedicines(Medicine);

    // Reindex doctors
    console.log('');
    console.log('Checking approved doctors in database...');
    const doctorCount = await Doctor.countDocuments({ isApproved: true });
    console.log(`🩺 Found ${doctorCount} approved doctors to index`);
    const doctorSuccess = await reindexAllDoctors(Doctor);

    console.log('');
    if (medicineSuccess || doctorSuccess) {
      console.log('✅ Solr setup completed successfully!');
      console.log('');
      console.log('📊 Next steps:');
      console.log('  1. Visit Solr Dashboard: http://localhost:8983/solr/');
      console.log('  2. Select "medicines" core from the dropdown');
      console.log('  3. View indexed documents in the UI');
      console.log('');
      console.log('🧪 Test the search API:');
      console.log('  GET http://localhost:3002/medicine/search?query=aspirin');
      console.log('  GET http://localhost:3002/doctor/search?query=cardio');
    } else {
      console.error('❌ Solr setup encountered issues');
      console.log('Check the logs above for details');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

setup();
