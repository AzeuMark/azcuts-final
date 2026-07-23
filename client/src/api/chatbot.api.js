import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const chatbotApi = {
  // Send the running conversation to "Azeu AI".
  // messages: [{ role: 'user' | 'assistant', content: string }]
  // The server decides which role guide to use (from the auth token), so we
  // never send a role from the client. Response data: { reply, role }.
  send: (messages) => unwrap(api.post('/chatbot/message', { messages })),
};

export default chatbotApi;
