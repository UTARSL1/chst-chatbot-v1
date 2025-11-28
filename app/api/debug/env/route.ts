import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasResendKey: !!process.env.RESEND_API_KEY,
        keyStartsWithRe: process.env.RESEND_API_KEY?.startsWith('re_'),
        keyLength: process.env.RESEND_API_KEY?.length || 0,
        emailFrom: process.env.EMAIL_FROM,
        nodeEnv: process.env.NODE_ENV,
    });
}
