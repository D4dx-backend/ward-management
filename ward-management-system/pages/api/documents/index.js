import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Document from '../../../models/Document';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { category, targetAudience, search, page = 1, limit = 10 } = req.query;
      
      let query = { isActive: true };
      
      // Filter by target audience based on user role
      if (session.user.role === 'coordinator' || session.user.role === 'wardAdmin') {
        const roleMapping = {
          'coordinator': 'coordinators',
          'wardAdmin': 'ward_admins'
        };
        query.targetAudience = { $in: ['all', roleMapping[session.user.role]] };
      } else if (targetAudience && targetAudience !== 'all') {
        query.targetAudience = targetAudience;
      }
      
      // Filter by category
      if (category && category !== 'all') {
        query.category = category;
      }
      
      // Search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const documents = await Document.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Document.countDocuments(query);

      res.status(200).json({
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  } else if (req.method === 'POST') {
    // Only state admins can create documents
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const { title, description, category, fileUrl, fileName, fileSize, fileType, targetAudience } = req.body;

      if (!title || !description || !fileUrl || !fileName) {
        return res.status(400).json({ error: 'Title, description, and file are required' });
      }

      const document = new Document({
        title,
        description,
        category,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        targetAudience,
        createdBy: session.user.id
      });

      await document.save();
      await document.populate('createdBy', 'name email');

      res.status(201).json(document);
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}