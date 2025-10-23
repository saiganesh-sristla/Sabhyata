// utils/qrEncryption.js
import CryptoJS from 'crypto-js';

// ⚠️ KEEP THIS SECRET! Store in .env
const SECRET_KEY = import.meta.env.VITE_QR_SECRET_KEY || 'MySuper$ecretK3y2025!SabhyataFoundation#XYZ789';

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
    console.log('🔑 Using SECRET_KEY:', SECRET_KEY ? `${SECRET_KEY.substring(0, 10)}...` : 'MISSING');
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Check if decryption produced valid UTF-8
    if (!jsonString || jsonString.length === 0) {
      console.error('❌ Decryption produced empty string - wrong key?');
      return null;
    }
    
    const parsed = JSON.parse(jsonString);
    console.log('✅ Successfully decrypted and parsed QR data');
    return parsed;
  } catch (error) {
    console.error('Decryption error:', error);
    console.error('This usually means:');
    console.error('1. Wrong SECRET_KEY (check VITE_QR_SECRET_KEY in .env)');
    console.error('2. QR code was generated with a different key');
    console.error('3. QR code data is corrupted');
    return null;
  }
};
