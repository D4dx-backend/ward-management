import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  await dbConnect();

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get user info
    const user = await User.findById(session.user.id);
    console.log('User found:', user);

    // Get ward info
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    console.log('Ward found:', ward);

    // Get all wards to see if user is assigned elsewhere
    const allWards = await Ward.find({}).populate('wardAdmin', 'name email');
    const userWards = allWards.filter(w => w.wardAdmin && w.wardAdmin._id.toString() === session.user.id);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      assignedWard: ward,
      allUserWards: userWards,
      sessionUserId: session.user.id,
      totalWards: allWards.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}