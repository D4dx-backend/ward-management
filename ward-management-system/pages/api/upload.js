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
    // Check deployment environment
    const isVercel = process.env.VERCEL;
    const isProduction = process.env.NODE_ENV === 'production';
    const hasDigitalOceanConfig = process.env.DIGITAL_OCEAN_DEPLOYMENT;
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    console.log('Environment check:', { 
      NODE_ENV: process.env.NODE_ENV, 
      VERCEL: process.env.VERCEL, 
      DIGITAL_OCEAN_DEPLOYMENT: process.env.DIGITAL_OCEAN_DEPLOYMENT,
      isProduction,
      isVercel,
      hasDigitalOceanConfig,
      hasBlobToken
    });
    
    // For Vercel deployments, require Blob storage in production
    if (isVercel && isProduction && !hasBlobToken) {
      console.error('BLOB_READ_WRITE_TOKEN not configured for Vercel deployment');
      return res.status(500).json({ error: 'File storage not configured - BLOB_READ_WRITE_TOKEN missing' });
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

    if (isVercel && isProduction && hasBlobToken) {
      // Use Vercel Blob storage for Vercel deployments
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
      // Use local storage for development and Digital Ocean deployments
      console.log('Using local storage for development/Digital Ocean deployment...');
      
      // For Digital Ocean and other traditional hosting, use a more robust path approach
      let uploadsDir;
      
      if (isProduction && !isVercel) {
        // For production deployments on traditional servers (like Digital Ocean)
        // Try multiple potential paths for uploads directory
        const possiblePaths = [
          path.join(process.cwd(), 'public', 'uploads'),
          path.join(process.cwd(), 'uploads'),
          path.join(__dirname, '..', '..', '..', 'public', 'uploads'),
          '/var/www/html/uploads', // Common Digital Ocean path
          '/opt/app/public/uploads', // Docker container path
        ];
        
        uploadsDir = possiblePaths.find(dir => {
          try {
            // Check if directory exists or can be created
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            // Test write permissions
            fs.accessSync(dir, fs.constants.W_OK);
            return true;
          } catch (error) {
            console.log(`Cannot use directory ${dir}:`, error.message);
            return false;
          }
        });
        
        if (!uploadsDir) {
          console.error('No writable uploads directory found');
          return res.status(500).json({ 
            error: 'Server configuration error: No writable uploads directory available. Please ensure the uploads directory exists with proper write permissions.' 
          });
        }
      } else {
        // For development
        uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      }
      
      console.log('Using uploads directory:', uploadsDir);
      
      if (!fs.existsSync(uploadsDir)) {
        console.log('Creating uploads directory...');
        try {
          fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
          console.log('Uploads directory created successfully');
        } catch (error) {
          console.error('Failed to create uploads directory:', error);
          return res.status(500).json({ error: 'Failed to create uploads directory: ' + error.message });
        }
      } else {
        console.log('Uploads directory already exists');
      }
      
      // Test write permissions
      try {
        fs.accessSync(uploadsDir, fs.constants.W_OK);
        console.log('Uploads directory is writable');
      } catch (error) {
        console.error('Uploads directory is not writable:', error);
        return res.status(500).json({ 
          error: 'Server configuration error: Uploads directory is not writable. Please check file permissions.' 
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalFilename || 'file';
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const uniqueFileName = `${baseName}_${timestamp}${extension}`;
      
      const newPath = path.join(uploadsDir, uniqueFileName);
      console.log('Moving file from:', file.filepath, 'to:', newPath);
      
      try {
        // Move file to uploads directory
        fs.renameSync(file.filepath, newPath);
        console.log('File moved successfully');
        
        // Verify file exists
        if (!fs.existsSync(newPath)) {
          throw new Error('File was not properly moved to uploads directory');
        }
        
        // Generate appropriate URL based on deployment
        if (isProduction && !isVercel) {
          // For Digital Ocean and other traditional hosting
          // Check if uploads is within public directory for proper URL mapping
          const publicUploadsPath = path.join(process.cwd(), 'public', 'uploads');
          if (uploadsDir === publicUploadsPath || uploadsDir.includes('/public/uploads')) {
            fileUrl = `/uploads/${uniqueFileName}`;
          } else {
            // If uploads directory is outside public, we need to serve it differently
            fileUrl = `/api/files/${uniqueFileName}`;
            console.log('Using API file serving for uploads outside public directory');
          }
        } else {
          fileUrl = `/uploads/${uniqueFileName}`;
        }
        
        fileName = file.originalFilename;
        
        console.log('File uploaded successfully:', { fileUrl, uploadsDir, uniqueFileName });
      } catch (error) {
        console.error('Failed to move file:', error);
        return res.status(500).json({ error: 'Failed to save file to uploads directory' });
      }
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