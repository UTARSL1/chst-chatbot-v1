import nodemailer from 'nodemailer';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

// Create reusable transporter
const createTransporter = () => {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
        console.warn('⚠️ Gmail credentials not configured. Email will be logged to console.');
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    });
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    console.log('📬 Email send attempt:');
    console.log('  - To:', to);
    console.log('  - Subject:', subject);
    console.log('  - Gmail User:', process.env.GMAIL_USER || 'Not configured');

    const transporter = createTransporter();

    if (!transporter) {
        // No Gmail credentials - Log to console (Development Mode)
        console.warn('⚠️ Gmail credentials not found. Simulating email send.');
        logEmailToConsole(to, subject, html);
        return true;
    }

    try {
        console.log('  - Sending via Gmail SMTP...');

        const info = await transporter.sendMail({
            from: `"CHST Chatbot" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log(`📧 Email sent successfully to ${to}`);
        console.log('  - Message ID:', info.messageId);
        return true;

    } catch (error: any) {
        console.error('❌ Failed to send email via Gmail:', error.message);

        // Fallback to console log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('💡 Falling back to console logging...');
            logEmailToConsole(to, subject, html);
            return true;
        }

        return false;
    }
}

export async function sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to CHST Chatbot!</h2>
            <p>Thank you for signing up. Please verify your email address to activate your account.</p>
            <p>Click the button below to verify:</p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
            <p style="margin-top: 20px;">This link will expire in 24 hours.</p>
            <p>If you didn't sign up for this account, you can safely ignore this email.</p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: 'Verify your CHST Chatbot Account',
        html,
    });
}

export async function sendApprovalEmail(email: string, name: string) {
    const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Account Approved!</h2>
            <p>Dear ${name},</p>
            <p>Great news! Your account has been approved by the administrator.</p>
            <p>You can now log in to CHST Chatbot and start using the system.</p>
            <p>Click the button below to log in:</p>
            <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Log In</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${loginUrl}">${loginUrl}</a></p>
            <p>Welcome aboard!</p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: 'Your CHST Chatbot Account has been Approved',
        html,
    });
}

export async function sendExpiredTokenEmail(email: string, name: string) {
    const signupUrl = `${process.env.NEXTAUTH_URL}/auth/signup`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Verification Link Expired</h2>
            <p>Dear ${name},</p>
            <p>Your email verification link has expired after 24 hours.</p>
            <p>For security reasons, we've removed your pending registration from our system.</p>
            <p>To continue, please sign up again with the same email address:</p>
            <a href="${signupUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Sign Up Again</a>
            <p>If you didn't attempt to sign up, you can safely ignore this email.</p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: 'CHST Chatbot - Verification Link Expired',
        html,
    });
}

function logEmailToConsole(to: string, subject: string, html: string) {
    console.log('\n================ EMAIL SIMULATION ================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------');
    console.log('HTML Content (Preview):');
    console.log(html.replace(/<[^>]*>/g, '')); // Strip HTML for readable console log
    console.log('--------------------------------------------------');

    // Extract link if present for easy clicking
    const linkMatch = html.match(/href="(http[^"]+)"/);
    if (linkMatch) {
        console.log('🔗 CLICKABLE LINK:', linkMatch[1]);
    }
    console.log('==================================================\n');
}
