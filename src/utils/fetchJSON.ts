import { app } from '../server.js'; // Ensure correct import path

export const fetchJSON = async (url: string, options: RequestInit = {}) => {
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
