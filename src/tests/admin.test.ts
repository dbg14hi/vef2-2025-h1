import { test, expect } from 'vitest';
import { fetchJSON } from '../utils/fetchJSON';

let adminToken: string;

beforeAll(async () => {
  const loginRes = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@workout.com',
      password: 'admin123',
    }),
  });

  adminToken = loginRes.body.token;

  // Delete test exercises by name before running tests
  await fetchJSON('/admin/exercises', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Test Exercise' }), 
  });
});

// Test: Admin can create a new exercise
test('Admin creates an exercise', async () => {
   await fetchJSON('/admin/exercises/name/Test Exercise', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const res = await fetchJSON('/admin/exercises', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Exercise',
      description: 'A test exercise',
      categoryName: 'Strength', 
    }),
  });

  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('name', 'Test Exercise');
});

// Test: Admin can fetch all exercises
test('Admin fetches all exercises', async () => {
  const res = await fetchJSON('/admin/exercises', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});
