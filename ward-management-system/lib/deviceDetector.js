export const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      deviceType: 'Unknown',
      browser: 'Unknown',
      operatingSystem: 'Unknown'
    };
  }

  // Device Type Detection
  let deviceType = 'Desktop';
  if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = 'Mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    deviceType = 'Tablet';
  }

  // Browser Detection
  let browser = 'Unknown';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  } else if (userAgent.includes('Trident') || userAgent.includes('MSIE')) {
    browser = 'Internet Explorer';
  }

  // Operating System Detection
  let operatingSystem = 'Unknown';
  if (userAgent.includes('Windows NT')) {
    operatingSystem = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    operatingSystem = 'macOS';
  } else if (userAgent.includes('Linux')) {
    operatingSystem = 'Linux';
  } else if (userAgent.includes('Android')) {
    operatingSystem = 'Android';
  } else if (userAgent.includes('iPhone OS') || userAgent.includes('iOS')) {
    operatingSystem = 'iOS';
  }

  return {
    deviceType,
    browser,
    operatingSystem
  };
};

export const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
};