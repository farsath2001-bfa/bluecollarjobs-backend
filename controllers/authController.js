const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role });
    res.status(201).json({ 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      token: generateToken(user._id) 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  console.log("1. Email received:", email);
  console.log("2. Password received:", password);

  try {
    const user = await User.findOne({ email });
    console.log("3. User found:", user ? "YES" : "NO");

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("4. Password match:", isMatch);

      if (isMatch) {
        res.json({ 
          _id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          token: generateToken(user._id) 
        });
      } else {
        res.status(401).json({ message: 'Invalid email or password' });
      }
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/profile (protected)
const getProfile = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, getProfile };