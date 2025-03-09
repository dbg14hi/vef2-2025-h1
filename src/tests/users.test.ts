import { test, expect } from 'vitest';
import { fetchJSON } from '../utils/fetchJSON';

// Test: Get User Profile
test('Get user profile', async () => {

  const loginRes = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
    }),
  });

  const res = await fetchJSON('/users/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${loginRes.body.token}` },
  });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('email', 'user@example.com');
});

// Test: User can log a workout
test('User logs a workout', async () => {
  // Log in user to get token
  const loginRes = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
    }),
  });

  expect(loginRes.status).toBe(200);
  expect(loginRes.body).toHaveProperty('token');

  // Send workout log request
  const workoutRes = await fetchJSON('/users/workouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginRes.body.token}` },
    body: JSON.stringify({
      date: "2025-03-03T08:30:00.000Z",
      exercises: [
        {
          exerciseId: 'c26c7249-7102-4643-9523-677d6134e5a2',
          sets: 4,
          reps: 10,
          weight: 50,
        },
      ],
    }),
  });

  expect(workoutRes.status).toBe(201);
  expect(workoutRes.body).toHaveProperty('id');
});


// User should be able to get their workouts
test('User gets workouts', async () => {
  const loginRes = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
    }),
  });

  const res = await fetchJSON('/users/workouts', {
    method: 'GET',
    headers: { Authorization: `Bearer ${loginRes.body.token}` },
  });

  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});
