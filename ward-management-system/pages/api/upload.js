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
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename || 'file';
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const newFileName = `${baseName}_${timestamp}${extension}`;
    const newFilePath = path.join(uploadsDir, newFileName);

    // Move file to new location with unique name
    fs.renameSync(file.filepath, newFilePath);

    // Return the public URL
    const fileUrl = `/uploads/${newFileName}`;

    res.status(200).json({
      url: fileUrl,
      filename: originalName,
      size: file.size,
      type: file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}