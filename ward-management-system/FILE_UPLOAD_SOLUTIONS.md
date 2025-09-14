# File Upload Solutions for Vercel Deployment

## Problem
Your file upload system was failing because it was using local file storage (`public/uploads/`), which doesn't work on Vercel's serverless environment. Files get deleted when the serverless function ends.

## Solutions Implemented

### Option 1: Vercel Blob Storage (Recommended)
**File**: `pages/api/upload.js` (updated)

**Pros:**
- Native Vercel integration
- Automatic CDN distribution
- Simple setup
- Free tier available (1GB storage, 10GB bandwidth/month)

**Setup:**
1. Go to Vercel Dashboard → Your Project → Storage
2. Create a new Blob storage
3. Deploy your code (environment variables are set automatically)

### Option 2: Cloudinary (Alternative)
**File**: `pages/api/upload-cloudinary.js` (new)

**Pros:**
- Excellent for images and documents
- Advanced image processing capabilities
- Generous free tier (25GB storage, 25GB bandwidth/month)
- Works with any hosting provider

**Setup:**
1. Create account at https://cloudinary.com
2. Get your credentials from the dashboard
3. Add to your environment variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Install dependency: `npm install cloudinary`
5. Update your frontend to use `/api/upload-cloudinary` instead of `/api/upload`

## Current Implementation Details

### Vercel Blob (Current)
- **Development**: Uses local storage (`public/uploads/`)
- **Production**: Uses Vercel Blob storage
- **File access**: Direct URLs from Vercel's CDN
- **Max file size**: 20MB
- **Supported formats**: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR, XLS, XLSX, PPT, PPTX

### File Upload Flow
1. User selects file in admin interface
2. File is sent to `/api/upload`
3. API validates file type and size
4. File is uploaded to cloud storage
5. Public URL is returned to frontend
6. URL is saved in database with document/instruction

## Testing Your Setup

### 1. Deploy to Vercel
```bash
git add .
git commit -m "Add cloud file upload support"
git push
```

### 2. Test File Uploads
- Go to `/admin/instructions/` and try creating an instruction with a file
- Go to `/admin/documents/` and try uploading a document
- Check that files are accessible via the returned URLs

### 3. Verify in Vercel Dashboard
- Check Storage tab to see uploaded files
- Monitor usage and costs

## Troubleshooting

### Upload Fails with "File storage not configured"
- Ensure Vercel Blob storage is created and linked to your project
- Check that `BLOB_READ_WRITE_TOKEN` environment variable is set in Vercel

### Files Upload but Can't Be Accessed
- Check the returned URL format
- Ensure blob storage has public access enabled

### Development Issues
- Local development uses `public/uploads/` folder
- Ensure the folder exists and is writable
- Files in development are accessible at `http://localhost:3000/uploads/filename`

## Migration Notes

### Existing Files
If you have existing files in your database with local URLs (`/uploads/...`), you may need to:
1. Re-upload important files through the admin interface
2. Update database records with new cloud URLs
3. Or create a migration script to move existing files to cloud storage

### Database Schema
No changes needed - the same `fileUrl`, `fileName`, and `fileSize` fields are used.

## Cost Comparison

### Vercel Blob
- Free: 1GB storage, 10GB bandwidth/month
- Pro: $0.15/GB storage, $0.30/GB bandwidth

### Cloudinary
- Free: 25GB storage, 25GB bandwidth/month
- Paid: $99/month for 100GB storage, 100GB bandwidth

## Recommendation
Start with **Vercel Blob** since you're already on Vercel. It's the simplest setup and most cost-effective for your use case. You can always switch to Cloudinary later if you need more advanced features or hit the storage limits.