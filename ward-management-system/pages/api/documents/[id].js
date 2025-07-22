import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Document from '../../../models/Document';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const document = await Document.findById(id)
        .populate('createdBy', 'name email');

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.status(200).json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  } else if (req.method === 'PUT') {
    // Only state admins can update documents
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const { title, description, category, fileUrl, fileName, fileSize, fileType, targetAudience, isActive } = req.body;

      const document = await Document.findByIdAndUpdate(
        id,
        {
          title,
          description,
          category,
          fileUrl,
          fileName,
          fileSize,
          fileType,
          targetAudience,
          isActive,
          updatedAt: Date.now()
        },
        { new: true }
      ).populate('createdBy', 'name email');

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.status(200).json(document);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  } else if (req.method === 'DELETE') {
    // Only state admins can delete documents
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const document = await Document.findByIdAndDelete(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}