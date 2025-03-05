import { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import { prisma} from '../utils/prisma';

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
    const authHeader = c.req.header('Authorization');
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  
    const token = authHeader.split(' ')[1];
  
    try {
      const decoded = jwt.verify(token, SECRET_KEY || 'supersecretkey') as { userId: string };
  
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true }, 
      });
  
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }
  
      c.set('userId', user.id);
      c.set('userRole', user.role);
  
      await next();
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
  