// Prescription Model Integration Tests
const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Prescription Model Integration Tests', () => {
    let mockData;

    beforeEach(() => {
        mockData = {
            patientName: 'John Patient',
            patientEmail: 'john@patient.com',
            doctorEmail: 'dr@test.com',
            age: 30,
            gender: 'male',
            weight: 75,
            appointmentDate: new Date(),
            appointmentTime: '10:00 AM',
            symptoms: 'Headache and fever',
            appointmentId: new mongoose.Types.ObjectId(),
            doctorId: new mongoose.Types.ObjectId(),
            patientId: new mongoose.Types.ObjectId(),
            medicines: [
                {
                    medicineName: 'Paracetamol',
                    dosage: '500mg',
                    frequency: 'Twice a day',
                    duration: '5 days',
                    instructions: 'After meals'
                }
            ],
            additionalNotes: 'Rest well'
        };
    });

    test('should validate and save correct prescription', async () => {
        const pres = new Prescription(mockData);
        const saved = await pres.save();
        
        expect(saved._id).toBeDefined();
        expect(saved.medicines.length).toBe(1);
        expect(saved.medicines[0].medicineName).toBe('Paracetamol');
    });

    test('should reject missing patient, doctor, appointment IDs', async () => {
        delete mockData.patientId;
        delete mockData.doctorId;
        delete mockData.appointmentId;
        
        const pres = new Prescription(mockData);
        let error;
        try { await pres.save(); } catch (err) { error = err; }
        
        expect(error.errors.patientId).toBeDefined();
        expect(error.errors.doctorId).toBeDefined();
        expect(error.errors.appointmentId).toBeDefined();
    });

    test('should enforce gender enum', async () => {
        mockData.gender = 'unknown'; // invalid
        
        const pres = new Prescription(mockData);
        let error;
        try { await pres.save(); } catch (err) { error = err; }
        
        expect(error.errors.gender).toBeDefined();
    });

    test('should enforce missing medicines requirement fields', async () => {
        // Missing duration and frequency in the nested array
        mockData.medicines = [{
            medicineName: 'Aspirin',
            dosage: '100mg'
        }];
        
        const pres = new Prescription(mockData);
        let error;
        try { await pres.save(); } catch (err) { error = err; }
        
        // Mongoose format for arrays is: medicines.0.frequency
        expect(error.errors['medicines.0.frequency']).toBeDefined();
        expect(error.errors['medicines.0.duration']).toBeDefined();
    });

    test('should require core patient metrics (age, weight)', async () => {
        delete mockData.age;
        delete mockData.weight;
        
        const pres = new Prescription(mockData);
        let error;
        try { await pres.save(); } catch (err) { error = err; }
        
        expect(error.errors.age).toBeDefined();
        expect(error.errors.weight).toBeDefined();
    });

    test('should require symptoms description', async () => {
        delete mockData.symptoms;
        
        const pres = new Prescription(mockData);
        let error;
        try { await pres.save(); } catch (err) { error = err; }
        
        expect(error.errors.symptoms).toBeDefined();
    });

    test('should allow multiple medicines in array', async () => {
        mockData.medicines.push({
            medicineName: 'Cough Syrup',
            dosage: '10ml',
            frequency: 'Night',
            duration: '3 days'
        });
        
        const pres = new Prescription(mockData);
        const saved = await pres.save();
        
        expect(saved.medicines.length).toBe(2);
        expect(saved.medicines[1].medicineName).toBe('Cough Syrup');
    });
});
