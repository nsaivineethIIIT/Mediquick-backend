#!/bin/bash

# Solr Setup Script
# This script initializes Solr and reindexes all medicines

echo "🔍 FDFED Project - Solr Setup Script"
echo "===================================="

# Check if Solr is running
echo ""
echo "Checking Solr connection..."
curl -s http://localhost:8983/solr/admin/info/system > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Solr is running on http://localhost:8983"
else
    echo "❌ Solr is not running"
    echo "Please ensure Solr is running: docker-compose up -d solr"
    exit 1
fi

echo ""
echo "Starting Node.js setup..."
echo ""

# Run the reindex script
node -e "
const solrClient = require('./utils/solrClient');
const { reindexAllMedicines } = require('./utils/solrIndexer');
const Medicine = require('./models/Medicine');
const mongoose = require('mongoose');

// Connect to MongoDB first
require('dotenv').config();

async function setup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📚 Connected to MongoDB');
        
        // Wait for Solr to be ready
        let attempts = 0;
        while (!solrClient.isReady() && attempts < 10) {
            console.log('⏳ Waiting for Solr to be ready...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (!solrClient.isReady()) {
            console.error('❌ Solr did not become ready');
            process.exit(1);
        }
        
        console.log('✅ Solr is ready');
        console.log('');
        
        // Reindex medicines
        await reindexAllMedicines(Medicine);
        
        console.log('');
        console.log('✅ Solr setup completed successfully!');
        console.log('🔗 Solr URL: http://localhost:8983/solr/#/medicines');
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Setup failed:', err.message);
        process.exit(1);
    }
}

setup();
"
