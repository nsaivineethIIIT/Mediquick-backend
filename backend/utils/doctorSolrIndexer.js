const doctorSolrClient = require('./doctorSolrClient');

function mapDoctorToDoc(doctor) {
  return {
    id: doctor._id.toString(),
    entityType_s: 'doctor',
    name_s: doctor.name || '',
    email_s: doctor.email || '',
    mobile_s: doctor.mobile || '',
    specialization_s: doctor.specialization || '',
    location_s: doctor.location || '',
    registrationNumber_s: doctor.registrationNumber || '',
    onlineStatus_s: doctor.onlineStatus || '',
    consultationFee_f: Number(doctor.consultationFee || 0),
    profilePhoto_s: doctor.profilePhoto || '/images/default-doctor.svg',
    isApproved_b: Boolean(doctor.isApproved),
    search_text_t: [
      doctor.name,
      doctor.specialization,
      doctor.location,
      doctor.registrationNumber
    ].filter(Boolean).join(' '),
    timestamp_dt: new Date().toISOString()
  };
}

async function reindexAllDoctors(Doctor) {
  try {
    if (!doctorSolrClient.isReady()) {
      console.warn('⚠️ Doctor Solr not ready for reindexing');
      return false;
    }

    await doctorSolrClient.deleteByQuery('entityType_s:doctor');
    const doctors = await Doctor.find({ isApproved: true }).lean();

    if (doctors.length === 0) {
      console.warn('⚠️ No approved doctors found to index');
      return false;
    }

    const docs = doctors.map(mapDoctorToDoc);
    const success = await doctorSolrClient.indexDocuments(docs);

    if (success) {
      console.log(`✅ Reindexed ${docs.length} doctors to Solr`);
    } else {
      console.warn('⚠️ Failed to reindex doctors to Solr');
    }

    return success;
  } catch (err) {
    console.error('❌ Doctor reindexing error:', err.message);
    return false;
  }
}

module.exports = {
  reindexAllDoctors,
  doctorSolrClient
};
