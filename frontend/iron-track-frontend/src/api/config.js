import axios from 'axios';

// Get base URL and API key from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Warn if API key is missing
if (!API_KEY) {
  console.warn('Warning: VITE_API_KEY is not set. API requests will fail authentication.');
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Add Authorization header with Bearer token for API authentication
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export { apiClient, API_BASE_URL, API_KEY };
