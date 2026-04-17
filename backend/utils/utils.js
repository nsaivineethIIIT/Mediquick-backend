const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');

const checkEmailExists = async (email, excludeId = null) => {
    const query = { email: email.trim().toLowerCase() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const [patient, doctor, admin, supplier, employee] = await Promise.all([
        Patient.findOne(query),
        Doctor.findOne(query),
        Admin.findOne(query),
        Supplier.findOne(query),
        Employee.findOne(query)
    ]);

    return patient || doctor || admin || supplier || employee;
};

const checkMobileExists = async (mobile, excludeId = null) => {
    const query = { mobile: mobile.trim() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const [patient, doctor, admin, supplier, employee] = await Promise.all([
        Patient.findOne(query),
        Doctor.findOne(query),
        Admin.findOne(query),
        Supplier.findOne(query),
        Employee.findOne(query)
    ]);

    return patient || doctor || admin || supplier || employee;
};

module.exports = { checkEmailExists, checkMobileExists };