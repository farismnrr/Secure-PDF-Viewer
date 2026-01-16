import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL;
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!ssoUrl) {
        return NextResponse.json({ error: 'NEXT_PUBLIC_SSO_URL is not configured' }, { status: 500 });
    }
    if (!tenantId) {
        return NextResponse.json({ error: 'NEXT_PUBLIC_TENANT_ID is not configured' }, { status: 500 });
    }

    return NextResponse.json({
        ssoUrl,
        tenantId,
    });
}
