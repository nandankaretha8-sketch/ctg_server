const Visitor = require('../models/Visitor');
const crypto = require('crypto');

// Function to detect device type from user agent
const detectDevice = (userAgent) => {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?=.*Tablet)|Windows NT.*Touch/i;
  
  if (tabletRegex.test(userAgent)) return 'tablet';
  if (mobileRegex.test(userAgent)) return 'mobile';
  return 'desktop';
};

// Function to detect browser from user agent
const detectBrowser = (userAgent) => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Other';
};

// Function to detect OS from user agent
const detectOS = (userAgent) => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Other';
};

// Function to generate session ID
const generateSessionId = (ip, userAgent) => {
  return crypto.createHash('md5').update(ip + userAgent + Date.now()).digest('hex');
};

// Visitor tracking middleware
const trackVisitor = async (req, res, next) => {
  try {
    // Skip tracking for admin routes and API routes that don't need tracking
    if (req.path.startsWith('/api/admin') || 
        req.path.startsWith('/api/auth') ||
        req.path.includes('favicon') ||
        req.path.includes('static')) {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const referrer = req.get('Referer') || '';
    const page = req.originalUrl || req.url;
    
    // Generate session ID
    const sessionId = generateSessionId(ip, userAgent);
    
    // Detect device, browser, and OS
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);
    
    // Check if this is a unique visitor (same IP + User Agent in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingVisitor = await Visitor.findOne({
      ip: ip,
      userAgent: userAgent,
      createdAt: { $gte: oneDayAgo }
    });
    
    const isUnique = !existingVisitor;
    
    // Check if user is registered (if userId exists in request)
    const userId = req.user ? req.user.id : null;
    const isRegistered = !!userId;
    
    // Create visitor record
    const visitorData = {
      ip,
      userAgent,
      referrer,
      device,
      browser,
      os,
      userId,
      isUnique,
      sessionId,
      page,
      isRegistered
    };
    
    // Save visitor data asynchronously (don't block the request)
    Visitor.create(visitorData).catch(err => {
      console.error('Error tracking visitor:', err);
    });
    
  } catch (error) {
    console.error('Visitor tracking error:', error);
  }
  
  next();
};

// Middleware to track page views and session duration
const trackPageView = async (req, res, next) => {
  try {
    if (req.path.startsWith('/api/admin') || 
        req.path.startsWith('/api/auth') ||
        req.path.includes('favicon') ||
        req.path.includes('static')) {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const page = req.originalUrl || req.url;
    
    // Update or create visitor record for this page view
    const sessionId = generateSessionId(ip, userAgent);
    
    await Visitor.findOneAndUpdate(
      { 
        ip: ip, 
        userAgent: userAgent,
        page: page,
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
      },
      {
        $inc: { duration: 1 }, // Increment duration by 1 second
        $set: { 
          updatedAt: new Date(),
          sessionId: sessionId
        }
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
  } catch (error) {
    console.error('Page view tracking error:', error);
  }
  
  next();
};

module.exports = {
  trackVisitor,
  trackPageView
};
