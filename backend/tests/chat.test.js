// Chat Model Integration Tests
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Chat Model Integration Tests', () => {
    let mockData;

    beforeEach(() => {
        mockData = {
            appointmentId: new mongoose.Types.ObjectId(),
            senderId: new mongoose.Types.ObjectId(),
            senderType: 'patient',
            message: 'Hello Doctor!'
        };
    });

    test('should validate and save text message', async () => {
        const chat = new Chat(mockData);
        const savedChat = await chat.save();
        
        expect(savedChat._id).toBeDefined();
        expect(savedChat.senderType).toBe('patient');
        expect(savedChat.message).toBe('Hello Doctor!');
        expect(savedChat.isFile).toBe(false); // Should be default
    });

    test('should enforce senderType enum', async () => {
        mockData.senderType = 'admin'; // invalid
        const chat = new Chat(mockData);
        
        let error;
        try { await chat.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.senderType).toBeDefined();
    });

    test('should require appointmentId', async () => {
        delete mockData.appointmentId;
        const chat = new Chat(mockData);
        
        let error;
        try { await chat.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.appointmentId).toBeDefined();
    });

    test('should require senderId', async () => {
        delete mockData.senderId;
        const chat = new Chat(mockData);
        
        let error;
        try { await chat.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.senderId).toBeDefined();
    });

    test('should require message text even if isFile is false', async () => {
        delete mockData.message;
        const chat = new Chat(mockData);
        
        let error;
        try { await chat.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.message).toBeDefined();
    });

    test('should set default correct timestamp', async () => {
        const chat = new Chat(mockData);
        const savedChat = await chat.save();
        
        expect(savedChat.timestamp instanceof Date).toBe(true);
    });

    test('should save file attributes properly if provided', async () => {
        mockData.isFile = true;
        mockData.filePath = '/files/123.jpg';
        mockData.fileName = 'test.jpg';
        mockData.fileType = 'image/jpeg';
        
        const chat = new Chat(mockData);
        const savedChat = await chat.save();
        
        expect(savedChat.isFile).toBe(true);
        expect(savedChat.filePath).toBe('/files/123.jpg');
    });
});
