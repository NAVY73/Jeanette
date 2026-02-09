const users = require('../data/users.json');

// In-memory session store (prototype only)
const sessions = new Map();

function makeToken(user) {
  const raw = `${user.id}:${user.email}:${Date.now()}`;
  return Buffer.from(raw).toString('base64');
}

function createSessionForUser(user) {
  const token = makeToken(user);
  sessions.set(token, { userId: user.id, createdAt: new Date().toISOString() });
  return token;
}

function getUserFromToken(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  const user = users.find(u => u.id === session.userId);
  if (!user) return null;
  if (user.status !== 'active') return null;

  return user;
}

// Middleware: requires a valid Bearer token
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    marinaId: user.marinaId ?? null
  };

  next();
}

// Middleware: role gate
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = {
  createSessionForUser,
  getUserFromToken,
  requireAuth,
  requireRole
};
