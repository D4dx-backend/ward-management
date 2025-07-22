import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Document from '../../../../models/Document';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;

  await dbConnect();

  try {
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

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

    // Increment download count
    await Document.findByIdAndUpdate(id, { 
      $inc: { downloadCount: 1 } 
    });

    res.status(200).json({ 
      message: 'Download tracked successfully',
      fileUrl: document.fileUrl 
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
}