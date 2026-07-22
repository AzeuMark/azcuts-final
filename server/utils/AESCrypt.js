// AESCrypt — reversible symmetric encryption for sensitive fields the system
// must read back later (see SERVER_PLAN.md 6.1).
//
// IMPORTANT: this is NOT for passwords. Passwords stay bcrypt-hashed (one-way).
// AESCrypt is two-way, for data we need to decrypt again.
//
// Signature (2 params each):  encrypt(text, key) / decrypt(text, key)
// The key defaults to AES_SECRET_KEY from env (placeholder "azeumark", change later),
// but callers may also pass a key explicitly:
//   AESCrypt.encrypt(value, process.env.AES_SECRET_KEY)
const CryptoJS = require('crypto-js');
const env = require('../config/env');

const DEFAULT_KEY = env.AES_SECRET_KEY;

/** Encrypt a value into a cipher string. */
function encrypt(text, key = DEFAULT_KEY) {
  if (text === undefined || text === null) return text;
  return CryptoJS.AES.encrypt(String(text), key).toString();
}

/** Decrypt a cipher string back into the original plaintext. */
function decrypt(cipher, key = DEFAULT_KEY) {
  if (!cipher) return cipher;
  const bytes = CryptoJS.AES.decrypt(cipher, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };
