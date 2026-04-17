const nodemailer = require('nodemailer');

/**
 * Creates a nodemailer transporter using Gmail SMTP.
 * Set SMTP_USER and SMTP_PASS in your .env file.
 *
 * Gmail tip: use an App Password (not your account password) if 2-Step Verification is on.
 * https://support.google.com/accounts/answer/185833
 */
function createTransporter() {
    const pass = process.env.SMTP_PASS.replace(/\s+/g, ''); // Remove all whitespace
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: pass,
        },
    });
}

/**
 * Send a 6-digit OTP email to the given address.
 * @param {string} toEmail  - recipient email
 * @param {string} otp      - 6-digit OTP string
 * @param {string} role     - 'patient' | 'doctor' (optional, defaults to generic)
 */
async function sendOtpEmail(toEmail, otp, role = '') {
    const transporter = createTransporter();

    const roleLabel = role === 'doctor' ? 'Doctor' : role === 'patient' ? 'Patient' : '';
    const accountType = roleLabel ? `${roleLabel} account` : 'account';

    const mailOptions = {
        from: `"FDFED Health" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Your FDFED signup OTP code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px;
                        border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">
                <h2 style="color: #2c7a7b; margin-bottom: 8px;">Verify your email</h2>
                <p style="color: #444; font-size: 15px;">
                    Use the OTP below to complete your FDFED ${accountType} registration.
                </p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px;
                            color: #2c7a7b; text-align: center; padding: 20px 0;">
                    ${otp}
                </div>
                <p style="color: #888; font-size: 13px;">
                    This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
                </p>
                <p style="color: #888; font-size: 13px;">
                    If you did not create an account, please ignore this email.
                </p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✓ Email sent successfully:', info.response);
    } catch (error) {
        console.error('✗ Failed to send email:', error.message);
        throw error;
    }
}

module.exports = { sendOtpEmail };
