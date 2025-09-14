import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('Cloudinary Upload API called:', req.method);
  
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    console.log('No session found for upload');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      keepExtensions: true,
    });

    console.log('Parsing form data...');
    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath
    });

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
      folder: 'ward-management',
      resource_type: 'auto', // Automatically detect file type
      public_id: `${Date.now()}_${file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
    });

    console.log('File uploaded to Cloudinary:', uploadResult.secure_url);

    res.status(200).json({
      url: uploadResult.secure_url,
      filename: file.originalFilename,
      size: file.size,
      type: file.mimetype,
      cloudinary_id: uploadResult.public_id
    });
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    
    let errorMessage = 'Failed to upload file';
    if (error.message.includes('File size too large')) {
      errorMessage = 'File too large - maximum size is 20MB';
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'File type not supported';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}