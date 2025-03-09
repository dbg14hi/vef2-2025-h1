import { app } from '../server';
import { expect, test } from 'vitest';

const fetchJSON = async (url: string, options: RequestInit = {}) => {
  const response = await app.request(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return {
    status: response.status,
    body: response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null,
  };
};

// 🔍 Test: Signup should create a new user
test('Signup should create a new user', async () => {
  const randomEmail = `user-${Date.now()}@example.com`;
  const res = await fetchJSON('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: randomEmail,
      password: 'testpassword123',
    }),
  });

  expect(res.status).toBe(201); 
  expect(res.body).toHaveProperty('message', 'User created successfully!');
});

// 🔍 Test: Login with incorrect credentials should fail
test('Login should fail with incorrect credentials', async () => {
  const res = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'wrong@email.com',
      password: 'wrongpassword',
    }),
  });

  expect(res.status).toBe(401);
  expect(res.body).toHaveProperty('error', 'Invalid email or password');
});

// 🔍 Test: Login with correct credentials
test('Login should succeed with correct credentials', async () => {
  const randomEmail = `user-${Date.now()}@example.com`;
  await fetchJSON('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: randomEmail,
      password: 'testpassword123',
    }),
  });

  const res = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'validuser@example.com',
      password: 'validpassword123',
    }),
  });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('message', 'Login successful');
  expect(res.body).toHaveProperty('token');
});

// 🔍 Test: Signup should fail if email is already taken
test('Signup should fail if email is already in use', async () => {
  await fetchJSON('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'testuser@example.com',
      password: 'testpassword123',
    }),
  });

  const res = await fetchJSON('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'testuser@example.com',
      password: 'newpassword',
    }),
  });

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error', 'User already exists');
});
