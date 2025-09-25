import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[Session Test] Request received');
    console.log('[Session Test] Headers:', {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie ? 'Present' : 'Missing',
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer
    });

    const session = await getSession({ req });
    
    console.log('[Session Test] Session result:', {
      hasSession: !!session,
      userRole: session?.user?.role,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionExpires: session?.expires
    });

    if (!session) {
      return res.status(200).json({
        success: false,
        message: 'No session found',
        hasSession: false,
        debug: {
          cookies: req.headers.cookie,
          headers: {
            authorization: req.headers.authorization,
            cookie: req.headers.cookie
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Session found',
      hasSession: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        district: session.user.district
      },
      session: {
        expires: session.expires
      },
      debug: {
        cookies: req.headers.cookie,
        headers: {
          authorization: req.headers.authorization,
          cookie: req.headers.cookie
        }
      }
    });

  } catch (error) {
    console.error('[Session Test] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Session test failed',
      error: error.message,
      debug: {
        cookies: req.headers.cookie,
        headers: {
          authorization: req.headers.authorization,
          cookie: req.headers.cookie
        }
      }
    });
  }
}
