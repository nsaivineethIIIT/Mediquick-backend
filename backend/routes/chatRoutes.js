const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyTokenAndSetUser } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storageChat = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../public/uploads/chat');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadChat = multer({ storage: storageChat });

/**
 * @swagger
 * /chat/send:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a text message in appointment chat
 *     description: |
 *       Sends a text message between doctor and patient during a confirmed appointment.
 *       Both doctors and patients can send messages for appointments they're part of.
 *       Messages are stored with timestamp and sender information.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - message
 *               - senderType
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 description: MongoDB ID of the appointment this message is for
 *                 example: "60d5ec49c1234567890ab124"
 *               message:
 *                 type: string
 *                 description: Text content of the message
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: "Please describe your symptoms in detail"
 *               senderType:
 *                 type: string
 *                 enum: ['doctor', 'patient']
 *                 description: Type of sender (must match authenticated user type)
 *                 example: "doctor"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chat:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Unique message ID
 *                     appointmentId:
 *                       type: string
 *                       description: ID of the appointment
 *                     senderId:
 *                       type: string
 *                       description: ID of the sender (doctor or patient)
 *                     senderType:
 *                       type: string
 *                       enum: ['doctor', 'patient']
 *                       description: Type of sender
 *                     message:
 *                       type: string
 *                       description: Message text
 *                     isFile:
 *                       type: boolean
 *                       description: Whether this is a file message
 *                       example: false
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the message was sent
 *       400:
 *         description: Bad request - appointment must be confirmed or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Chat is only available for confirmed appointments"
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - user is not part of this appointment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Not authorized to chat for this appointment"
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Appointment not found"
 *       500:
 *         description: Internal server error
 */
router.post('/send', verifyTokenAndSetUser, chatController.postSend);

/**
 * @swagger
 * /chat/send-file:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a file in appointment chat
 *     description: |
 *       Uploads and sends a file (document, image, etc.) in the chat for a confirmed appointment.
 *       Both doctors and patients can send files. The file is stored on the server and a reference
 *       is saved in the chat message. Supported file types include images, PDFs, and documents.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - senderType
 *               - file
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 description: MongoDB ID of the appointment this file is for
 *                 example: "60d5ec49c1234567890ab124"
 *               senderType:
 *                 type: string
 *                 enum: ['doctor', 'patient']
 *                 description: Type of sender (must match authenticated user type)
 *                 example: "patient"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload (images, PDFs, documents, etc.)
 *     responses:
 *       200:
 *         description: File sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chat:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Unique message ID
 *                     appointmentId:
 *                       type: string
 *                       description: ID of the appointment
 *                     senderId:
 *                       type: string
 *                       description: ID of the sender (doctor or patient)
 *                     senderType:
 *                       type: string
 *                       enum: ['doctor', 'patient']
 *                       description: Type of sender
 *                     message:
 *                       type: string
 *                       description: Display text with file name
 *                       example: "File: medical-report.pdf"
 *                     fileName:
 *                       type: string
 *                       description: Generated filename on server
 *                       example: "1234567890-medical-report.pdf"
 *                     originalFileName:
 *                       type: string
 *                       description: Original filename as uploaded
 *                       example: "medical-report.pdf"
 *                     fileType:
 *                       type: string
 *                       description: MIME type of the file
 *                       example: "application/pdf"
 *                     isFile:
 *                       type: boolean
 *                       description: Indicates this is a file message
 *                       example: true
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the file was sent
 *       400:
 *         description: Bad request - missing file or appointment must be confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No file uploaded"
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - user is not part of this appointment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Not authorized to chat for this appointment"
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Appointment not found"
 *       500:
 *         description: Internal server error
 */
router.post('/send-file', verifyTokenAndSetUser, uploadChat.single('file'), chatController.postSendFile);

/**
 * @swagger
 * /chat/download/{filename}:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Download a file from chat
 *     description: |
 *       Downloads a file that was previously uploaded in a chat conversation.
 *       This endpoint is publicly accessible with just the filename.
 *       Files are stored in the public uploads directory.
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The filename of the file to download (as stored on server)
 *         example: "1234567890-medical-report.pdf"
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "File not found"
 */
router.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../public/uploads/chat', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

/**
 * @swagger
 * /chat/{appointmentId}:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get all messages for an appointment
 *     description: |
 *       Retrieves the complete chat history for a specific appointment.
 *       Messages are sorted chronologically by timestamp (oldest first).
 *       Only doctors and patients who are part of the appointment can view the chat.
 *       Includes both text messages and file messages with full metadata.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the appointment to get chat messages for
 *         example: "60d5ec49c1234567890ab124"
 *     responses:
 *       200:
 *         description: Chat messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   description: Array of chat messages sorted by timestamp
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Unique message ID
 *                       appointmentId:
 *                         type: string
 *                         description: ID of the appointment
 *                       senderId:
 *                         type: string
 *                         description: ID of the sender (doctor or patient)
 *                       senderType:
 *                         type: string
 *                         enum: ['doctor', 'patient']
 *                         description: Type of sender
 *                       message:
 *                         type: string
 *                         description: Message text or file description
 *                       filePath:
 *                         type: string
 *                         nullable: true
 *                         description: Server path to uploaded file (if this is a file message)
 *                       fileName:
 *                         type: string
 *                         nullable: true
 *                         description: Generated filename on server (if this is a file message)
 *                       fileType:
 *                         type: string
 *                         nullable: true
 *                         description: MIME type of the file (if this is a file message)
 *                       isFile:
 *                         type: boolean
 *                         description: Whether this message contains a file
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: When the message was sent
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - user is not part of this appointment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Not authorized to view this chat"
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Appointment not found"
 *       500:
 *         description: Internal server error
 */
router.get('/:appointmentId', verifyTokenAndSetUser, chatController.getChat);

module.exports = router;