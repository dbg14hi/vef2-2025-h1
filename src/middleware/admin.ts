import { MiddlewareHandler } from 'hono';

export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  const role = c.get('userRole');

  if (role !== 'admin') {
    return c.json({ error: 'Forbidden: Admins only' }, 403);
  }

  await next();
};
