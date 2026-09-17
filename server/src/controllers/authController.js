import { Owner } from '../models/Owner.js';
import { generateToken } from '../middleware/auth.js';

export async function signup(req, res, next) {
  try {
    const { name, email, password, businessName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const existingOwner = await Owner.findOne({ email: email.toLowerCase().trim() });
    if (existingOwner) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    const owner = new Owner({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      businessName: businessName ? businessName.trim() : 'Home-Style Tiffin'
    });

    await owner.save();
    const token = generateToken(owner._id);

    res.status(201).json({
      success: true,
      message: 'Owner account created successfully',
      token,
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        createdAt: owner.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const owner = await Owner.findOne({ email: email.toLowerCase().trim() });
    if (!owner) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = generateToken(owner._id);

    res.json({
      success: true,
      token,
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        createdAt: owner.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res) {
  res.json({
    success: true,
    owner: req.owner
  });
}
