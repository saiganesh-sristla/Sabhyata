# QR Code Decryption Error Fix - Deployment Issue

## Problem
QR code scanning works on **localhost** but fails on **deployed version** with error:
```
Decryption error: Error: Malformed UTF-8 data
❌ Error processing QR code: Error: Invalid or tampered QR code - Cannot decrypt
```

## Root Cause
The `VITE_QR_SECRET_KEY` environment variable is **different** or **missing** in the deployed environment compared to localhost.

### How QR Encryption Works
1. **Ticket Generation** (Frontend): Encrypts data using `VITE_QR_SECRET_KEY`
2. **QR Scanning** (Admin Panel): Decrypts data using `VITE_QR_SECRET_KEY`
3. **If keys don't match** → Decryption fails with "Malformed UTF-8 data"

---

## Solution

### Step 1: Check Current Secret Key (Localhost)

Open your local `.env` file:
```
AdminPanel/.env
```

Look for:
```env
VITE_QR_SECRET_KEY=your-actual-secret-key-here
```

**Copy this exact key value!**

### Step 2: Set Environment Variable in Deployment

Depending on your deployment platform:

#### **Netlify**
1. Go to: Site Settings → Environment Variables
2. Add new variable:
   - **Key**: `VITE_QR_SECRET_KEY`
   - **Value**: `[paste your secret key]`
3. Click "Save"
4. Redeploy the site

#### **Vercel**
1. Go to: Project Settings → Environment Variables
2. Add new variable:
   - **Name**: `VITE_QR_SECRET_KEY`
   - **Value**: `[paste your secret key]`
   - **Environment**: Production, Preview, Development (select all)
3. Click "Save"
4. Redeploy

#### **Other Platforms**
Set the environment variable `VITE_QR_SECRET_KEY` with your secret key value.

### Step 3: Verify the Key is Set

After deployment, open the deployed admin panel and check the browser console when scanning a QR code. You should see:

```
🔑 Using SECRET_KEY: your-secre... (first 10 chars)
```

If you see:
```
🔑 Using SECRET_KEY: your-super... (fallback key)
```

Then the environment variable is **not set correctly**.

---

## Important Notes

### ⚠️ Security Warning
- **Never commit** `.env` files to Git
- **Never hardcode** the secret key in the code
- **Use strong keys** (at least 32 characters, random)

### 🔄 Key Consistency
The **same secret key** must be used in:
1. **Frontend** (where tickets are generated) - `VITE_QR_SECRET_KEY`
2. **Admin Panel** (where QR codes are scanned) - `VITE_QR_SECRET_KEY`

If you change the key, **all previously generated QR codes will become invalid**.

### 📱 Testing After Fix

1. **Generate a new ticket** on the deployed frontend
2. **Scan the QR code** on the deployed admin panel
3. Check console logs:
   ```
   🔑 Using SECRET_KEY: [your-key]...
   🔓 Attempting to decrypt...
   ✅ Successfully decrypted and parsed QR data
   ✅ Decrypted data: { bookingReference: "...", ... }
   ```

---

## Troubleshooting

### Issue: Still getting "Malformed UTF-8 data"

**Possible causes:**

1. **Environment variable not set**
   - Check deployment platform environment variables
   - Ensure variable name is exactly `VITE_QR_SECRET_KEY`
   - Redeploy after setting

2. **Old QR codes**
   - QR codes generated with old key won't work with new key
   - Generate a fresh ticket after fixing the key

3. **Different keys in Frontend vs Admin Panel**
   - Both must use the **exact same** `VITE_QR_SECRET_KEY`
   - Check both deployments

4. **Vite not picking up env variable**
   - Vite only exposes variables prefixed with `VITE_`
   - Variable must be set **before build time**
   - Rebuild and redeploy after setting variable

### Issue: Console shows "MISSING" for SECRET_KEY

The environment variable is not set. Follow Step 2 above.

### Issue: Console shows fallback key "your-super..."

The environment variable is not set. The code is using the default fallback key.

---

## Quick Fix Checklist

- [ ] Find your local `VITE_QR_SECRET_KEY` value
- [ ] Set `VITE_QR_SECRET_KEY` in deployment environment variables
- [ ] Redeploy both Frontend and Admin Panel
- [ ] Generate a new test ticket
- [ ] Scan the QR code
- [ ] Verify console shows correct key (first 10 chars)
- [ ] Verify successful decryption

---

## Code Changes Made

### `AdminPanel/src/utils/qrEncryption.ts`

Added better logging and error handling:
- Shows first 10 characters of the key being used
- Checks if decryption produced valid UTF-8
- Provides helpful error messages

This helps diagnose key mismatch issues.

---

## Prevention

### For Future Deployments

1. **Document the secret key** in a secure password manager
2. **Set environment variables** before first deployment
3. **Use the same key** across all environments (dev, staging, prod)
4. **Test QR generation and scanning** after each deployment

### Generating a Strong Secret Key

Use this command to generate a secure random key:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or online tool
# https://www.random.org/strings/
```

Then set it as `VITE_QR_SECRET_KEY` in all environments.

---

## Summary

The issue is caused by **mismatched encryption keys** between localhost and deployed environments. Fix by:

1. ✅ Finding your local secret key
2. ✅ Setting `VITE_QR_SECRET_KEY` in deployment environment variables
3. ✅ Redeploying
4. ✅ Testing with a fresh QR code

After this fix, QR code scanning will work on the deployed version!
