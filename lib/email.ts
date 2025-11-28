import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    // Check if Resend API key is provided
    const hasApiKey = !!process.env.RESEND_API_KEY;

    console.log('📬 Email send attempt:');
    console.log('  - To:', to);
    console.log('  - Has API Key:', hasApiKey);
    console.log('  - API Key starts with re_:', process.env.RESEND_API_KEY?.startsWith('re_'));
    console.log('  - From:', process.env.EMAIL_FROM || 'onboarding@resend.dev');

    if (hasApiKey) {
        try {
            console.log('  - Calling Resend API...');
            const data = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: to,
                subject: subject,
                html: html,
            });

            console.log('  - Resend response:', JSON.stringify(data, null, 2));

            if (data.error) {
                console.error('❌ Resend API Error:', JSON.stringify(data.error, null, 2));
                // In development, show the actual error for debugging
                if (process.env.NODE_ENV === 'development') {
                    console.error('💡 Tip: If you see a 403 error, you can only send to your Resend signup email in testing mode.');
                    console.error('💡 Your Resend signup email can send to itself, or verify a domain at resend.com/domains');
                }
                return false;
            }

            console.log(`📧 Email sent successfully to ${to} (ID: ${data.data?.id})`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email via Resend:', error);
            // Fallback to console log in development
            if (process.env.NODE_ENV === 'development') {
                logEmailToConsole(to, subject, html);
                return true;
            }
            return false;
        }
    } else {
        // No API Key - Log to console (Development Mode)
        console.warn('⚠️ No RESEND_API_KEY found. Simulating email send.');
        logEmailToConsole(to, subject, html);
        return true;
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
