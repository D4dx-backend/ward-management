import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { PANCHAYATHS_BY_DISTRICT } from '../../data/kerala-districts';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { district } = req.query;

      if (!district) {
        return res.status(400).json({ message: 'District parameter is required' });
      }

      const panchayaths = PANCHAYATHS_BY_DISTRICT[district] || [];

      // If no panchayaths found, return test panchayath
      if (panchayaths.length === 0) {
        return res.status(200).json(['test panchayath']);
      }

      return res.status(200).json(panchayaths);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching panchayaths', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}