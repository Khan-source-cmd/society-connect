import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, get } from '../config/database.js';
import dotenv from 'dotenv';
import { sendOTP } from '../services/emailService.cjs';

dotenv.config();

/**
 * Authentication Controller
 * Handles user registration, login, and OTP verification
 */

/**
 * Register a new user
 * Creates user account and sends OTP for email verification
 */
const register = async (req, res) => {
  try {
    const { name, email, phone, flatNumber, wing, password, role } = req.body;

    console.log('Register request body:', { name, email, phone, flatNumber, wing, password, role });
    console.log('Field values:', {
      name: !!name,
      email: !!email,
      phone: !!phone,
      password: !!password,
      role: !!role
    });

    // Validate role
    const validRoles = ['resident', 'admin', 'security'];
    const userRole = role || 'resident'; // Default to resident if no role provided
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role",
        message: "Role must be one of: resident, admin, security"
      });
    }

    // Validate required fields
    if (!name || !email || !phone || !password) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        error: "All fields are required",
        message: "Please fill in all required fields"
      });
    }

    // Note: For residents, flat will be auto-linked after email verification
    // based on matching owner_email in flats table

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
        message: "Please enter a valid email address"
      });
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number",
        message: "Please enter a valid 10-digit phone number"
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password too weak",
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT * FROM users WHERE email = $1 OR phone = $2';
    const existingUser = await get(existingUserQuery, [email, phone]);
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists",
        message: "An account with this email or phone number already exists"
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate username
    const username = `USR-${name.toUpperCase().slice(0, 3)}${Math.floor(1000 + Math.random() * 9000)}`;

    // Insert user into database
    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash, name, phone, flat_number, wing, role, otp, otp_expiry) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `;
    
    const userValues = [username, email, hashedPassword, name, phone, flatNumber, wing, userRole, otp, otpExpiry];
    const result = await query(insertUserQuery, userValues);
    const newUser = result.rows[0];

    // Send OTP email
    try {
      await sendOTP(email, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Don't fail registration if email fails, but log it
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          flatNumber: newUser.flat_number,
          wing: newUser.wing,
          role: newUser.role
        },
        message: "Registration successful. Please verify your email with the OTP sent to you."
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Registration failed. Please try again."
    });
  }
};

/**
 * Verify OTP and complete registration
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Email and OTP are required",
        message: "Please provide both email and OTP"
      });
    }

    // Find user with valid OTP
    const userQuery = `SELECT * FROM users WHERE email = $1 AND otp = $2 AND otp_expiry > CURRENT_TIMESTAMP`;
    const user = await get(userQuery, [email, otp]);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
        message: "The OTP is invalid or has expired. Please request a new one."
      });
    }

    // Clear OTP and mark as verified
    const updateUserQuery = `UPDATE users SET otp = NULL, otp_expiry = NULL, email_verified = true WHERE user_id = $1`;
    await query(updateUserQuery, [user.user_id]);

    // Auto-link resident to flat based on matching email in flats or tenants table
    if (user.role === 'resident') {
      let linkedFlat = null;
      
      // First, check if user is an OWNER (check owner_email in flats table)
      const ownerFlatQuery = `SELECT id, wing, flat_number FROM flats WHERE LOWER(owner_email) = LOWER($1)`;
      const ownerFlatResult = await query(ownerFlatQuery, [email]);
      
      if (ownerFlatResult.rows.length > 0) {
        linkedFlat = ownerFlatResult.rows[0];
        console.log(`✅ Found owner flat: ${linkedFlat.wing}-${linkedFlat.flat_number}`);
      } else {
        // Second, check if user is a TENANT (check tenant_email in tenants table)
        const tenantQuery = `
          SELECT t.flat_id, f.wing, f.flat_number 
          FROM tenants t 
          JOIN flats f ON t.flat_id = f.id 
          WHERE LOWER(t.tenant_email) = LOWER($1) AND (t.status = 'Active' OR t.status IS NULL)
        `;
        const tenantResult = await query(tenantQuery, [email]);
        
        if (tenantResult.rows.length > 0) {
          linkedFlat = tenantResult.rows[0];
          console.log(`✅ Found tenant flat: ${linkedFlat.wing}-${linkedFlat.flat_number}`);
        }
      }
      
      // If flat found (either owner or tenant), link the user
      if (linkedFlat) {
        const linkFlatQuery = `UPDATE users SET flat_number = $1, wing = $2 WHERE user_id = $3`;
        await query(linkFlatQuery, [linkedFlat.flat_number, linkedFlat.wing, user.user_id]);
        console.log(`✅ Auto-linked user ${email} to flat ${linkedFlat.wing}-${linkedFlat.flat_number}`);
      } else {
        console.log(`⚠️ No flat found for email: ${email}. User will need manual linking.`);
      }
    }

    res.json({
      success: true,
      data: {
        message: "Email verified successfully. You can now login."
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "OTP verification failed. Please try again."
    });
  }
};

/**
 * Login user
 * Validates credentials and returns JWT token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
        message: "Please provide both email and password"
      });
    }

    // Find user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const user = await get(userQuery, [email]);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Email or password is incorrect"
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: "Email not verified",
        message: "Please verify your email before logging in"
      });
    }

    // Check if account is active
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        error: "Account inactive",
        message: "Your account has been deactivated. Please contact support."
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Email or password is incorrect"
      });
    }

    // Generate JWT token - INCLUDES WING NOW
    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
        email: user.email,
        name: user.name,
        flatNumber: user.flat_number,
        wing: user.wing
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token: token,
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          flatNumber: user.flat_number,
          wing: user.wing,
          role: user.role
        },
        message: "Login successful"
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Login failed. Please try again."
    });
  }
};

/**
 * Resend OTP for email verification
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
        message: "Please provide your email address"
      });
    }

    // Find user
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const user = await get(userQuery, [email]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "No user found with this email address"
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: "Already verified",
        message: "Your email is already verified"
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update user with new OTP
    const updateUserQuery = `UPDATE users SET otp = $1, otp_expiry = $2 WHERE user_id = $3`;
    await query(updateUserQuery, [otp, otpExpiry, user.user_id]);

    // Send OTP email
    try {
      await sendOTP(email, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP",
        message: "Failed to send OTP. Please try again later."
      });
    }

    res.json({
      success: true,
      data: {
        message: "OTP sent successfully. Please check your email."
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to resend OTP. Please try again."
    });
  }
};

export { register, verifyOTP, login, resendOTP };
