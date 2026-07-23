const fs = require('fs');
const path = require('path');

const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * "Azeu AI" chatbot service.
 *
 * Knowledge source: the role-specific system prompt files in /server/prompts.
 * The model is given ONLY that prompt plus the conversation — no tools, no file
 * access, no database access. The Groq API key never leaves the server.
 */

const PROMPT_DIR = path.join(__dirname, '..', 'ai', 'prompts');
const VALID_ROLES = ['user', 'staff', 'admin'];

// Guard rails on what we forward to the model.
const MAX_HISTORY = 12; // most recent turns kept (system prompt is always added)
const MAX_CONTENT_CHARS = 2000; // per message cap

// Prompt files are small and static — read once, then cache in memory.
const promptCache = new Map();

function loadPrompt(role) {
  const key = VALID_ROLES.includes(role) ? role : 'user';
  if (promptCache.has(key)) return promptCache.get(key);

  const file = path.join(PROMPT_DIR, `${key}.txt`);
  const text = fs.readFileSync(file, 'utf8').trim();
  promptCache.set(key, text);
  return text;
}

/**
 * Normalize the client-supplied conversation into a safe messages array.
 * Only user/assistant turns with non-empty string content survive; content is
 * trimmed and length-capped, and we keep only the most recent MAX_HISTORY turns.
 */
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CONTENT_CHARS) }));
}

/**
 * Send a conversation to Groq and return the assistant's reply text.
 * @param {object} args
 * @param {'user'|'staff'|'admin'} args.role  which guide the assistant should use
 * @param {Array<{role,content}>} args.messages  prior conversation (client-supplied)
 * @returns {Promise<string>} the assistant reply
 */
async function chat({ role = 'user', messages = [] }) {
  if (!env.GROQ_API_KEY) {
    // Configured off / key missing — fail soft with a clear message.
    throw new ApiError(503, 'Azeu AI is not available right now. Please try again later.');
  }

  const history = sanitizeMessages(messages);
  if (history.length === 0) {
    throw ApiError.badRequest('Please include a message for Azeu AI.');
  }

  const payload = {
    model: env.GROQ_MODEL,
    messages: [{ role: 'system', content: loadPrompt(role) }, ...history],
    temperature: 0.6,
    max_completion_tokens: 2048,
    top_p: 0.95,
    stream: false,
    reasoning_effort: 'none', // qwen3: skip visible chain-of-thought, answer directly
    stop: null,
    tools: [], // no tools — the model cannot act on the system, only answer
  };

  // Abort the upstream call if Groq is slow so we never hang the request.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(env.GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'Azeu AI took too long to respond. Please try again.');
    }
    logger.error?.('[chatbot] Groq request failed:', err.message);
    throw new ApiError(502, 'Azeu AI is temporarily unreachable. Please try again.');
  }
  clearTimeout(timeout);

  if (!res.ok) {
    // Log the upstream detail server-side but return a generic message to the client.
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    logger.error?.(`[chatbot] Groq responded ${res.status}: ${detail.slice(0, 500)}`);
    throw new ApiError(502, 'Azeu AI could not answer that right now. Please try again.');
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new ApiError(502, 'Azeu AI returned an empty response. Please try again.');
  }

  return reply;
}

module.exports = { chat, sanitizeMessages, VALID_ROLES };
