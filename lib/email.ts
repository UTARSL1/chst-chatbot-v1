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
