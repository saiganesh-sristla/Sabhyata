// utils/qrEncryption.js
import CryptoJS from 'crypto-js';

// ⚠️ KEEP THIS SECRET! Store in .env
const SECRET_KEY = import.meta.env.VITE_QR_SECRET_KEY || 'your-super-secret-key-change-this-12345';

// Encrypt QR data
export const encryptQRData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Decrypt QR data
export const decryptQRData = (encryptedData) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};
