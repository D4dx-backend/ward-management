import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
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
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    console.log('Uploads directory:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Check directory permissions
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      console.log('Uploads directory is writable');
    } catch (permError) {
      console.error('Uploads directory is not writable:', permError);
      return res.status(500).json({ error: 'Server upload directory is not writable' });
    }

    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB
      filename: (name, ext, part, form) => {
        // Generate unique filename immediately
        const timestamp = Date.now();
        const originalName = part.originalFilename || 'file';
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        return `${baseName}_${timestamp}${extension}`;
      }
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

    // Verify file exists and is readable
    if (!fs.existsSync(file.filepath)) {
      console.error('Uploaded file does not exist at:', file.filepath);
      return res.status(500).json({ error: 'File upload failed - file not found' });
    }

    // Return the public URL (file is already in the right location with unique name)
    const fileName = path.basename(file.filepath);
    const fileUrl = `/uploads/${fileName}`;

    console.log('File uploaded successfully:', fileUrl);

    res.status(200).json({
      url: fileUrl,
      filename: file.originalFilename || fileName,
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
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}