import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Document from '../../../../models/Document';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;

  await dbConnect();

  try {
    console.log('Document download request:', { id, method: req.method });
    
    const document = await Document.findById(id);

    if (!document) {
      console.log('Document not found:', id);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log('Document found:', { 
      title: document.title, 
      fileUrl: document.fileUrl, 
      fileName: document.fileName 
    });

    // Check if user has access to this document
    const roleMapping = {
      'coordinator': 'coordinators',
      'wardAdmin': 'ward_admins'
    };
    const userTargetAudience = roleMapping[session.user.role] || session.user.role;
    
    if (document.targetAudience !== 'all' && 
        document.targetAudience !== userTargetAudience &&
        session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Handle POST request (tracking only)
    if (req.method === 'POST') {
      // Increment download count
      await Document.findByIdAndUpdate(id, { 
        $inc: { downloadCount: 1 } 
      });

      res.status(200).json({ 
        message: 'Download tracked successfully',
        fileUrl: document.fileUrl 
      });
      return;
    }

    // Handle GET request (actual file download)
    if (req.method === 'GET') {
      if (!document.fileUrl) {
        return res.status(404).json({ error: 'No file attached to this document' });
      }

      // Import required modules for file serving
      const fs = require('fs');
      const path = require('path');

      // Handle both absolute URLs and relative paths
      let filePath;
      if (document.fileUrl.startsWith('/uploads/')) {
        // Relative path from public directory
        filePath = path.join(process.cwd(), 'public', document.fileUrl);
      } else if (document.fileUrl.startsWith('http')) {
        // External URL - redirect to it
        return res.redirect(document.fileUrl);
      } else if (document.fileUrl.startsWith('uploads/')) {
        // Path without leading slash
        filePath = path.join(process.cwd(), 'public', document.fileUrl);
      } else {
        // Assume it's just a filename in uploads directory
        filePath = path.join(process.cwd(), 'public', 'uploads', document.fileUrl);
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
      const fileName = document.fileName || path.basename(filePath);
      
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

      // Increment download count
      await Document.findByIdAndUpdate(id, { 
        $inc: { downloadCount: 1 } 
      });

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      return;
    }
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
}