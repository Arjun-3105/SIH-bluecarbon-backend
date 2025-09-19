const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // includes id, role, email, name
    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      // error.expiredAt is a Date object
      return res.status(401).json({
        message: 'Token expired',
        expiredAt: error.expiredAt.toISOString(), // show expiry time in ISO format
      });
    }

    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
