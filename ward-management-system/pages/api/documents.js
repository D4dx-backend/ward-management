import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Document from '../../models/Document';
import User from '../../models/User';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { category, search, page = 1, limit = 10 } = req.query;
      
      let query = { isActive: true };
      
      // Enhanced filtering based on user role and specific targeting
      if (session.user.role === 'coordinator') {
        const user = await User.findById(session.user.id);
        query.$or = [
          { targetAudience: 'all' },
          { targetAudience: 'coordinators' },
          { targetCoordinators: session.user.id },
          { targetWards: { $in: await Ward.find({ coordinator: session.user.id }).distinct('_id') } }
        ];
      } else if (session.user.role === 'wardAdmin') {
        const user = await User.findById(session.user.id);
        const ward = await Ward.findOne({ wardAdmin: session.user.id });
        query.$or = [
          { targetAudience: 'all' },
          { targetAudience: 'ward_admins' },
          { targetWards: ward ? ward._id : null }
        ].filter(condition => condition.targetWards !== null);
      } else if (category && category !== 'all') {
        query.category = category;
      }
      
      // Category filter
      if (category && category !== 'all') {
        query.category = category;
      }
      
      // Search functionality
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Sort by creation date (newest first)
      const documents = await Document.find(query)
        .populate('createdBy', 'name email')
        .populate('targetWards', 'name wardNumber panchayath district')
        .populate('targetCoordinators', 'name email district')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Clean documents for display
      const cleanDocuments = documents.map((document, index) => {
        const obj = document.toObject();
        
        // Clean title
        let cleanTitle = 'Untitled Document';
        if (obj.title && typeof obj.title === 'string' && !obj.title.includes('�')) {
          cleanTitle = obj.title.substring(0, 100);
        }
        
        // Clean description
        let cleanDescription = '';
        if (obj.description && typeof obj.description === 'string') {
          const testClean = obj.description
            .replace(/[^\x20-\x7E\s]/g, '')
            .replace(/�/g, '')
            .trim();
          
          if (testClean && testClean.length > 0) {
            cleanDescription = testClean;
          }
        }
        
        return {
          _id: obj._id || `fallback-${index}`,
          title: cleanTitle,
          description: cleanDescription,
          category: ['policy', 'procedure', 'form', 'guideline'].includes(obj.category) ? obj.category : 'guideline',
          targetAudience: ['all', 'coordinators', 'ward_admins'].includes(obj.targetAudience) ? obj.targetAudience : 'all',
          fileUrl: obj.fileUrl || null,
          fileName: obj.fileName || null,
          fileSize: obj.fileSize || null,
          fileType: obj.fileType || null,
          createdAt: obj.createdAt || new Date(),
          createdBy: obj.createdBy || null
        };
      });

      const total = await Document.countDocuments(query);

      res.status(200).json({
        documents: cleanDocuments,
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
      const { 
        title, 
        description, 
        category,
        fileUrl, 
        fileName, 
        fileSize, 
        fileType,
        targetAudience, 
        targetWards, 
        targetCoordinators
      } = req.body;

      // Validate required fields
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Validate and sanitize input
      const sanitizedTitle = typeof title === 'string' ? title.trim() : '';
      const sanitizedDescription = typeof description === 'string' ? description.trim() : '';

      if (!sanitizedTitle) {
        return res.status(400).json({ error: 'Title must be a valid string' });
      }

      // Validate category
      const validCategories = ['policy', 'procedure', 'form', 'guideline'];
      const validatedCategory = validCategories.includes(category) ? category : 'guideline';

      // Validate target audience
      const validAudiences = ['all', 'coordinators', 'ward_admins', 'specific_wards', 'specific_coordinators'];
      const validatedAudience = validAudiences.includes(targetAudience) ? targetAudience : 'all';

      const document = new Document({
        title: sanitizedTitle,
        description: sanitizedDescription,
        category: validatedCategory,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize ? parseInt(fileSize) : null,
        fileType: fileType || null,
        targetAudience: validatedAudience,
        targetWards: targetWards || [],
        targetCoordinators: targetCoordinators || [],
        createdBy: session.user.id
      });

      await document.save();
      await document.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'targetWards', select: 'name wardNumber panchayath district' },
        { path: 'targetCoordinators', select: 'name email district' }
      ]);

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