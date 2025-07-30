import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Instruction from '../../models/Instruction';
import Document from '../../models/Document';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(403).json({ error: 'Access denied. Only state admins can seed data.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  try {
    // Sample Instructions
    const sampleInstructions = [
      {
        title: 'Weekly Report Submission Guidelines',
        description: 'All coordinators and ward admins must submit their weekly reports by Friday 5 PM. Please ensure all required fields are completed and data is accurate. Late submissions will be flagged and may require explanation.',
        priority: 'high',
        targetAudience: 'all',
        isHighlighted: true,
        allowReplies: true,
        createdBy: session.user.id
      },
      {
        title: 'New Form Validation Process',
        description: 'Starting this week, all form submissions will go through an automated validation process. Forms with missing required fields will be automatically rejected and returned to the submitter with specific error messages.',
        priority: 'medium',
        targetAudience: 'coordinators',
        isHighlighted: false,
        allowReplies: true,
        createdBy: session.user.id
      },
      {
        title: 'System Maintenance Schedule',
        description: 'The system will undergo routine maintenance every Sunday from 2 AM to 4 AM. During this time, the system may be temporarily unavailable. Please plan your submissions accordingly.',
        priority: 'low',
        targetAudience: 'all',
        isHighlighted: false,
        allowReplies: true,
        createdBy: session.user.id
      },
      {
        title: 'Data Security and Privacy Guidelines',
        description: 'All users must follow strict data security protocols. Do not share login credentials, always log out after use, and report any suspicious activity immediately. Personal data must be handled according to privacy regulations.',
        priority: 'high',
        targetAudience: 'all',
        isHighlighted: true,
        allowReplies: true,
        createdBy: session.user.id
      }
    ];

    // Sample Documents
    const sampleDocuments = [
      {
        title: 'Ward Management System User Manual',
        description: 'Comprehensive guide covering all features and functions of the Ward Management System. Includes step-by-step instructions for common tasks, troubleshooting tips, and best practices.',
        category: 'guideline',
        targetAudience: 'all',
        createdBy: session.user.id
      },
      {
        title: 'Report Submission Policy',
        description: 'Official policy document outlining the requirements, deadlines, and procedures for submitting various types of reports in the Ward Management System.',
        category: 'policy',
        targetAudience: 'all',
        createdBy: session.user.id
      },
      {
        title: 'Ward Creation Procedure',
        description: 'Step-by-step procedure for creating new wards in the system, including required information, validation rules, and approval processes.',
        category: 'procedure',
        targetAudience: 'coordinators',
        createdBy: session.user.id
      },
      {
        title: 'Monthly Report Template',
        description: 'Standard template for monthly reports. Download and use this template to ensure consistency across all monthly submissions.',
        category: 'form',
        targetAudience: 'all',
        createdBy: session.user.id
      }
    ];

    // Insert sample instructions
    const insertedInstructions = await Instruction.insertMany(sampleInstructions);
    
    // Insert sample documents
    const insertedDocuments = await Document.insertMany(sampleDocuments);

    res.status(200).json({
      message: 'Sample data seeded successfully',
      instructions: insertedInstructions.length,
      documents: insertedDocuments.length
    });

  } catch (error) {
    console.error('Error seeding sample data:', error);
    res.status(500).json({ error: 'Failed to seed sample data' });
  }
}