require('dotenv').config();
const { Resend } = require('resend');

console.log('Testing Resend configuration...');
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('RESEND_API_KEY starts with re_:', process.env.RESEND_API_KEY?.startsWith('re_'));
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in .env file!');
    process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    try {
        const result = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: 'humyc@utar.edu.my', // Change this to your Resend signup email
            subject: 'Test Email from CHST Chatbot',
            html: '<p>This is a test email. If you receive this, Resend is working!</p>',
        });

        console.log('✅ Email sent successfully!');
        console.log('Result:', result);
    } catch (error) {
        console.error('❌ Failed to send email:');
        console.error(error);
    }
}

testEmail();
