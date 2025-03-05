import { Hono } from 'hono';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const authRoutes = new Hono();

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey'; // Replace this in production!

// Signup Route
authRoutes.post('/signup', async (c) => {
  const { email, password } = await c.req.json();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return c.json({ error: 'User already exists' }, 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  return c.json({ message: 'User created successfully!', userId: newUser.id });
});

authRoutes.post('/login', async (c) => {
    try {
      const { email, password } = await c.req.json();
  
      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }
  
      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }
  
      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '7d' }
      );
  
      return c.json({ message: 'Login successful', token });
    } catch (error) {
      console.error('Login error:', error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });
  