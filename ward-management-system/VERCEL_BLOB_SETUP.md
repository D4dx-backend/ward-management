# Vercel Blob Storage Setup Guide

## Overview
Your file upload system has been updated to use Vercel Blob storage for production deployments, which solves the file upload issues you were experiencing.

## What Changed
1. **Updated upload API** (`/pages/api/upload.js`) to use Vercel Blob storage in production
2. **Added Vercel Blob dependency** (`@vercel/blob`) to package.json
3. **Created Vercel configuration** (`vercel.json`) with proper settings
4. **Dual environment support**: Local storage for development, Blob storage for production

## Setup Instructions

### 1. Enable Vercel Blob Storage
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your ward-management project
3. Go to the **Storage** tab
4. Click **Create Database** and select **Blob**
5. Choose a name for your blob store (e.g., "ward-files")
6. Click **Create**

### 2. Environment Variables
Vercel will automatically set the `BLOB_READ_WRITE_TOKEN` environment variable when you create the blob storage. You don't need to manually configure this.

### 3. Deploy Your Changes
1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Add Vercel Blob storage for file uploads"
   git push
   ```

2. Vercel will automatically deploy your changes

### 4. Test File Uploads
After deployment, test the file upload functionality in:
- `/admin/instructions/` - Creating/editing instructions with file attachments
- `/admin/documents/` - Uploading documents

## How It Works

### Development Environment
- Files are stored locally in `public/uploads/`
- Accessible via `/uploads/filename.ext`

### Production Environment (Vercel)
- Files are stored in Vercel Blob storage
- Accessible via Vercel's CDN URLs
- Automatic scaling and global distribution

## File Limits
- **Maximum file size**: 20MB
- **Supported formats**: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR, XLS, XLSX, PPT, PPTX
- **Storage**: Unlimited (pay-per-use on Vercel)

## Benefits
✅ **Persistent storage** - Files won't be deleted when serverless functions restart
✅ **Global CDN** - Fast file access worldwide
✅ **Scalable** - Handles any number of files
✅ **Secure** - Built-in access controls
✅ **Cost-effective** - Pay only for what you use

## Troubleshooting

### If uploads still fail:
1. Check Vercel deployment logs in your dashboard
2. Ensure Blob storage is properly created and linked
3. Verify the `BLOB_READ_WRITE_TOKEN` environment variable is set

### For development issues:
1. Ensure the `public/uploads/` directory exists and is writable
2. Check file permissions on your local machine

## Cost Information
Vercel Blob storage pricing:
- **Free tier**: 1GB storage, 10GB bandwidth per month
- **Pro tier**: $0.15/GB storage, $0.30/GB bandwidth
- Most small to medium applications stay within the free tier

Your file upload system is now production-ready and will work reliably on Vercel!