import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Instruction from '../../../../models/Instruction';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;

  await dbConnect();

  try {
    const instruction = await Instruction.findById(id);

    if (!instruction) {
      return res.status(404).json({ error: 'Instruction not found' });
    }

    // Check if user has access to this instruction
    const roleMapping = {
      'coordinator': 'coordinators',
      'wardAdmin': 'ward_admins'
    };
    const userTargetAudience = roleMapping[session.user.role] || session.user.role;
    
    if (instruction.targetAudience !== 'all' && 
        instruction.targetAudience !== userTargetAudience &&
        session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!instruction.fileUrl) {
      return res.status(404).json({ error: 'No file attached to this instruction' });
    }

    // Handle both absolute URLs and relative paths
    let filePath;
    if (instruction.fileUrl.startsWith('/uploads/')) {
      // Relative path from public directory
      filePath = path.join(process.cwd(), 'public', instruction.fileUrl);
    } else if (instruction.fileUrl.startsWith('http')) {
      // External URL - redirect to it
      return res.redirect(instruction.fileUrl);
    } else if (instruction.fileUrl.startsWith('uploads/')) {
      // Path without leading slash
      filePath = path.join(process.cwd(), 'public', instruction.fileUrl);
    } else {
      // Assume it's just a filename in uploads directory
      filePath = path.join(process.cwd(), 'public', 'uploads', instruction.fileUrl);
    }

    // Normalize the path to prevent directory traversal attacks
    filePath = path.resolve(filePath);
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    
    // Ensure the file is within the uploads directory for security
    if (!filePath.startsWith(uploadsDir)) {
      console.error('Security violation: Attempted access outside uploads directory:', filePath);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileName = instruction.fileName || path.basename(filePath);
    
    // Determine MIME type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading instruction file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
}