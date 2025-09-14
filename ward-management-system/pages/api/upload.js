import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('Upload API called:', req.method);
  
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    console.log('No session found for upload');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('User authenticated:', session.user.id, session.user.role);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Check if we're in production (Vercel) or development
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProduction && !process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({ error: 'File storage not configured' });
    }

    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      keepExtensions: true,
    });

    console.log('Parsing form data...');
    const [fields, files] = await form.parse(req);
    console.log('Form parsed. Files:', Object.keys(files));
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      console.log('No file found in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath
    });

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.mimetype) && 
        !file.originalFilename?.match(/\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|zip|rar|xls|xlsx|ppt|pptx)$/i)) {
      return res.status(400).json({ 
        error: 'File type not supported. Please use PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR, XLS, XLSX, PPT, or PPTX files.' 
      });
    }

    let fileUrl, fileName;

    if (isProduction) {
      // Use Vercel Blob storage in production
      console.log('Using Vercel Blob storage...');
      
      // Read file content
      const fileBuffer = fs.readFileSync(file.filepath);
      
      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalFilename || 'file';
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const uniqueFileName = `${baseName}_${timestamp}${extension}`;
      
      // Upload to Vercel Blob
      const blob = await put(uniqueFileName, fileBuffer, {
        access: 'public',
        contentType: file.mimetype,
      });
      
      fileUrl = blob.url;
      fileName = file.originalFilename;
      
      // Clean up temporary file
      fs.unlinkSync(file.filepath);
      
      console.log('File uploaded to Vercel Blob:', fileUrl);
    } else {
      // Use local storage in development
      console.log('Using local storage for development...');
      
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        console.log('Creating uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalFilename || 'file';
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const uniqueFileName = `${baseName}_${timestamp}${extension}`;
      
      const newPath = path.join(uploadsDir, uniqueFileName);
      
      // Move file to uploads directory
      fs.renameSync(file.filepath, newPath);
      
      fileUrl = `/uploads/${uniqueFileName}`;
      fileName = file.originalFilename;
      
      console.log('File uploaded locally:', fileUrl);
    }

    res.status(200).json({
      url: fileUrl,
      filename: fileName,
      size: file.size,
      type: file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload file';
    if (error.code === 'EACCES') {
      errorMessage = 'Server permission denied - cannot write to upload directory';
    } else if (error.code === 'ENOSPC') {
      errorMessage = 'Server storage full - cannot upload file';
    } else if (error.message.includes('maxFileSize')) {
      errorMessage = 'File too large - maximum size is 20MB';
    } else if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
      errorMessage = 'File storage not configured properly';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}