/**
 * In-memory store for pending (unverified) patient signups.
 *
 * Key  : pendingId (UUID-style, returned to frontend after first signup step)
 * Value: { signupData, otpHash, expiresAt }
 *
 * Entries auto-expire after 5 minutes. No patient record is written to MongoDB
 * until the OTP is verified successfully — so no isVerified flag is needed and
 * existing users are completely unaffected.
 */

const crypto = require('crypto');

// Map<pendingId, { signupData, otpHash, expiresAt }>
const pendingStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Generate a cryptographically random 6-digit OTP string */
function generateOtp() {
    // Random number in [100000, 999999]
    const num = 100000 + (crypto.randomInt(900000));
    return String(num);
}

/** SHA-256 hash of the OTP (so we never store plaintext) */
function hashOtp(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Store a pending signup and return the OTP (plaintext, to be emailed) and
 * a pendingId (opaque token to pass back from frontend on verify).
 *
 * @param {object} signupData  - validated signup fields from the request body
 * @returns {{ pendingId: string, otp: string }}
 */
function storePending(signupData) {
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const pendingId = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + OTP_TTL_MS;

    // Remove any old pending entry for same email (avoid stale entries)
    for (const [key, value] of pendingStore.entries()) {
        if (value.signupData.email === signupData.email) {
            pendingStore.delete(key);
        }
    }

    pendingStore.set(pendingId, { signupData, otpHash, expiresAt });

    // Auto-delete after TTL
    setTimeout(() => pendingStore.delete(pendingId), OTP_TTL_MS);

    return { pendingId, otp };
}

/**
 * Verify OTP for a pendingId.
 *
 * @param {string} pendingId
 * @param {string} otp        - plaintext OTP entered by user
 * @returns {{ valid: boolean, signupData?: object, error?: string }}
 */
function verifyPending(pendingId, otp) {
    const entry = pendingStore.get(pendingId);

    if (!entry) {
        return { valid: false, error: 'OTP expired or invalid session. Please sign up again.' };
    }

    if (Date.now() > entry.expiresAt) {
        pendingStore.delete(pendingId);
        return { valid: false, error: 'OTP has expired. Please sign up again.' };
    }

    const inputHash = hashOtp(String(otp).trim());
    if (inputHash !== entry.otpHash) {
        return { valid: false, error: 'Incorrect OTP. Please try again.' };
    }

    // OTP matched — consume the entry (one-time use)
    const { signupData } = entry;
    pendingStore.delete(pendingId);
    return { valid: true, signupData };
}

/**
 * Replace the OTP for an existing pendingId (resend flow).
 * Returns the new OTP or null if the pendingId is not found/expired.
 *
 * @param {string} pendingId
 * @returns {{ otp: string } | null}
 */
function refreshOtp(pendingId) {
    const entry = pendingStore.get(pendingId);
    if (!entry) return null;

    const otp = generateOtp();
    entry.otpHash = hashOtp(otp);
    entry.expiresAt = Date.now() + OTP_TTL_MS;
    pendingStore.set(pendingId, entry);

    // Reset auto-delete timer
    setTimeout(() => pendingStore.delete(pendingId), OTP_TTL_MS);

    return { otp };
}

module.exports = { storePending, verifyPending, refreshOtp };
