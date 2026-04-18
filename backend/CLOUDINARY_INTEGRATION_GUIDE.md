# Cloudinary Integration Guide

## Overview
Your backend has been successfully integrated with Cloudinary for file uploads. All file uploads that were previously stored locally are now stored in Cloudinary's cloud storage.

## Changes Made

### 1. Environment Variables (.env)
Added Cloudinary credentials:
```
CLOUDINARY_CLOUD_NAME=dskicsm0m
CLOUDINARY_API_KEY=278513783863146
CLOUDINARY_API_SECRET=K3zFstQ98i4drhLDRBx7_N8_xkE
```

### 2. Dependencies (package.json)
Added two new packages:
- `cloudinary` ^1.41.0 - Cloudinary SDK
- `multer-storage-cloudinary` ^4.0.0 - Multer storage adapter for Cloudinary

**Installation:**
```bash
npm install
```

### 3. Upload Middleware (/middlewares/upload.js)
**Complete rewrite** from disk storage to Cloudinary storage with organized folders:
- `mediquick/profiles` - Profile photos (doctor, patient, employee, supplier)
- `mediquick/documents` - Verification documents (doctor, employee, supplier signup)
- `mediquick/chat` - Chat file uploads between doctor and patient
- `mediquick/doctorNotes` - Doctor appointment notes and medical records
- `mediquick/blog` - Blog post images
- `mediquick/medicines` - Medicine/product images
- `mediquick/uploads` - General uploads (fallback)

### 4. Routes Updated

#### Chat Routes (/routes/chatRoutes.js)
- Removed inline multer storage configuration
- Now imports `uploadChat` from centralized middleware
- File uploads go to Cloudinary

### 5. Controllers Updated

#### Doctor Controller (`/controllers/doctorController.js`)
- **Signup**: Uses `req.file.path` (Cloudinary URL) instead of `/uploads/${filename}`
- **Profile Photo Update**: Uses `req.file.path` for Cloudinary URL
- **File Cleanup**: Removed local filesystem cleanup (Cloudinary handles this)

#### Supplier Controller (`/controllers/supplierController.js`)
- **Signup**: Profile photo and document now use `req.file.path` (Cloudinary URLs)
- **Profile Photo Update**: Uses Cloudinary URL
- **Medicine Image Upload**: Uses Cloudinary URL

#### Employee Controller (`/controllers/employeeController.js`)
- **Signup**: Profile photo and document now use Cloudinary URLs
- **Profile Photo Update**: Uses Cloudinary URL

#### Patient Controller (`/controllers/patientController.js`)
- **Profile Photo Upload**: Uses `req.file.path` for Cloudinary URL
- **Profile Update**: Uses Cloudinary URL
- **Avatar Upload**: Uses Cloudinary URL

#### Appointment Controller (`/controllers/appointmentController.js`)
- **Doctor Notes**: Files uploaded to Cloudinary
- **File Deletion**: Removed local filesystem cleanup (Cloudinary handles storage)

#### Blog Controller (`/controllers/blogController.js`)
- **Image Upload**: Uses `req.file.path` for Cloudinary URLs

## File Structure on Cloudinary

All uploaded files are organized in your Cloudinary account under:
```
mediquick/
├── profiles/          # Profile photos
├── documents/         # Verification documents
├── chat/              # Chat files
├── doctorNotes/       # Doctor notes and medical records
├── blog/              # Blog images
├── medicines/         # Medicine images
└── uploads/           # General uploads
```

## Benefits

✅ **Persistent Storage**: Files persist across container restarts and deployments
✅ **Scalability**: Works seamlessly with multiple backend instances on Render
✅ **CDN Delivery**: Files served through Cloudinary's global CDN (faster delivery)
✅ **No Local Disk Clutter**: No need to manage local `/uploads` folders
✅ **Secure**: Files stored securely in the cloud
✅ **Automatic Cleanup**: Cloudinary manages old file cleanup automatically
✅ **Bandwidth Optimization**: Cloudinary optimizes image delivery

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Verify Environment Variables
Ensure your `.env` file contains:
```
CLOUDINARY_CLOUD_NAME=dskicsm0m
CLOUDINARY_API_KEY=278513783863146
CLOUDINARY_API_SECRET=K3zFstQ98i4drhLDRBx7_N8_xkE
```

### 3. Test Upload
1. Start the backend: `npm start` or `npm run dev`
2. Upload a doctor profile photo or document
3. Check the response - `req.file.path` will contain the Cloudinary URL
4. Verify the file appears in your Cloudinary dashboard under `mediquick/` folder

## Important Notes

⚠️ **Do NOT commit credentials to GitHub**
- Credentials are stored in `.env` which should be in `.gitignore`
- On Render, add these as environment variables in the dashboard settings

⚠️ **Remove local uploads folder from Git**
If you previously committed the `/uploads` folder, remove it:
```bash
git rm -r --cached uploads/
git commit -m "Remove local uploads folder"
```

⚠️ **Database Migration (Optional)**
Existing file paths in the database will still work if they're accessible URLs. However, for new uploads, all paths will be Cloudinary URLs.

## URL Format

Files stored in Cloudinary will have URLs like:
```
https://res.cloudinary.com/dskicsm0m/image/upload/v1234567890/mediquick/profiles/filename.jpg
```

These URLs are:
- Direct download links
- Work on any device
- Served through CDN (cached globally)
- Persistent and permanent

## Troubleshooting

### Issue: "Cannot find module cloudinary"
**Solution**: Run `npm install` to install dependencies

### Issue: File uploads fail with 401 error
**Solution**: Verify your Cloudinary credentials in `.env` are correct

### Issue: Files not appearing in Cloudinary dashboard
**Solution**: Check that the environment variables are loaded by restarting the server

### Issue: Old local file paths still in database
**Solution**: New uploads will use Cloudinary URLs. Old paths can coexist if the database allows it.

## Next Steps for Production

1. **Render Deployment**:
   - Add these environment variables in Render dashboard:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
   - No need for `/uploads` folder persistence

2. **Frontend Updates** (If needed):
   - Frontend already displays image URLs - no changes needed
   - Cloudinary URLs work with standard `<img>` tags and `Image` components

3. **Remove Local Uploads**:
   ```bash
   # Remove from git history
   git rm -r --cached uploads/
   git commit -m "Remove local uploads, using Cloudinary"
   
   # Can optionally keep local uploads folder for development
   ```

## File Size Limits

All upload middlewares have file size limits:
- **Profile photos**: 5 MB
- **Documents**: 10 MB
- **Chat files**: 10 MB
- **Doctor notes**: 10 MB
- **Blog images**: 5 MB
- **Medicine images**: 5 MB

Adjust these in `/middlewares/upload.js` if needed.

## Support

For Cloudinary documentation: https://cloudinary.com/documentation
For multer-storage-cloudinary: https://github.com/skyline-zt/multer-storage-cloudinary
