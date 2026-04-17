const solrClient = require('./solrClient');

/**
 * Index a single medicine to Solr
 */
async function indexMedicine(medicine) {
  if (!solrClient.isReady()) {
    console.warn('⚠️  Solr not ready for indexing');
    return false;
  }

  const doc = {
    id: medicine._id.toString(),
    entityType_s: 'medicine',
    name_s: medicine.name || '',
    medicineID_s: medicine.medicineID || '',
    manufacturer_s: medicine.manufacturer || '',
    quantity_i: Number(medicine.quantity || 0),
    cost_f: Number(medicine.cost || 0),
    expiryDate_dt: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString() : null,
    supplierId_s: medicine.supplierId ? medicine.supplierId.toString() : '',
    image_s: medicine.image || '',
    search_text_t: [medicine.name, medicine.medicineID, medicine.manufacturer].filter(Boolean).join(' '),
    timestamp_dt: new Date().toISOString()
  };

  const success = await solrClient.indexDocument(doc);
  if (success) {
    console.log(`✅ Indexed medicine: ${medicine.name}`);
  } else {
    console.warn(`⚠️  Failed to index medicine: ${medicine.name}`);
  }
  return success;
}

/**
 * Index multiple medicines in batch
 */
async function indexMedicines(medicines) {
  if (!solrClient.isReady()) {
    console.warn('⚠️  Solr not ready for batch indexing');
    return false;
  }

  if (!medicines || medicines.length === 0) {
    return false;
  }

  const docs = medicines.map(medicine => ({
    id: medicine._id.toString(),
    entityType_s: 'medicine',
    name_s: medicine.name || '',
    medicineID_s: medicine.medicineID || '',
    manufacturer_s: medicine.manufacturer || '',
    quantity_i: Number(medicine.quantity || 0),
    cost_f: Number(medicine.cost || 0),
    expiryDate_dt: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString() : null,
    supplierId_s: medicine.supplierId ? medicine.supplierId.toString() : '',
    image_s: medicine.image || '',
    search_text_t: [medicine.name, medicine.medicineID, medicine.manufacturer].filter(Boolean).join(' '),
    timestamp_dt: new Date().toISOString()
  }));

  const success = await solrClient.indexDocuments(docs);
  if (success) {
    console.log(`✅ Indexed ${medicines.length} medicines to Solr`);
  } else {
    console.warn(`⚠️  Failed to index ${medicines.length} medicines`);
  }
  return success;
}

/**
 * Reindex all medicines from MongoDB to Solr
 */
async function reindexAllMedicines(Medicine) {
  try {
    // Clear only medicine docs in shared core
    await solrClient.deleteByQuery('entityType_s:medicine');
    console.log('🗑️  Cleared medicine docs from Solr index');

    // Fetch all medicines
    const medicines = await Medicine.find({}).lean();
    console.log(`📚 Found ${medicines.length} medicines to index`);

    if (medicines.length === 0) {
      console.warn('⚠️  No medicines found to index');
      return false;
    }

    // Index in batches
    const batchSize = 100;
    let indexed = 0;

    for (let i = 0; i < medicines.length; i += batchSize) {
      const batch = medicines.slice(i, i + batchSize);
      const success = await indexMedicines(batch);
      if (success) {
        indexed += batch.length;
        console.log(`Progress: ${indexed}/${medicines.length}`);
      }
    }

    const success = indexed > 0;
    console.log(`✅ Reindexing complete: ${indexed} medicines`);
    return success;
  } catch (err) {
    console.error('❌ Reindexing error:', err.message);
    return false;
  }
}

/**
 * Delete a medicine from Solr
 */
async function deleteMedicine(medicineId) {
  if (!solrClient.isReady()) {
    return false;
  }

  const success = await solrClient.deleteDocument(medicineId);
  if (success) {
    console.log(`✅ Deleted medicine from Solr: ${medicineId}`);
  }
  return success;
}

module.exports = {
  indexMedicine,
  indexMedicines,
  reindexAllMedicines,
  deleteMedicine,
  solrClient
};
