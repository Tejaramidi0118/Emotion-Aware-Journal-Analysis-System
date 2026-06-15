import axios from 'axios';

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8001';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default API;

// Auth
export const signup = (data) => API.post('/auth/signup', data);

export const login = (data) => API.post('/auth/login', data);


// Journal
export const submitTextJournal = (data) =>
  API.post('/journal/text', data);

export const submitVoiceJournal = (data) =>
  API.post('/journal/voice', data);

// Feedback
export const getPendingFeedback = (userId) =>
  API.get(`/journal/feedback/pending/${userId}`);

export const submitFeedback = (data) =>
  API.post('/journal/feedback', data);

export const getJournalPrompts = (userId) =>
  API.get(`/journal/prompts/${userId}`);