const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Attaches req.user if a valid token is present, but never blocks the request.
module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (_) {
    // ignore invalid token for public routes
  }
  next();
};
