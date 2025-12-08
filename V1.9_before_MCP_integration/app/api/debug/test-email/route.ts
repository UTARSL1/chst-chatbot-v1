import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const to = searchParams.get('to');

        if (!to) {
            return NextResponse.json({ error: 'Missing "to" query parameter' }, { status: 400 });
        }

        const gmailUser = process.env.GMAIL_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailAppPassword) {
            return NextResponse.json({
                error: 'Configuration missing',
                details: {
                    hasUser: !!gmailUser,
                    hasPassword: !!gmailAppPassword
                }
            }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailAppPassword,
            },
        });

        const info = await transporter.sendMail({
            from: `"CHST Chatbot Debugger" <${gmailUser}>`,
            to: to,
            subject: 'Test Email from CHST Chatbot Debugger',
            html: '<p>This is a test email to verify the email configuration.</p>'
        });

        return NextResponse.json({
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
