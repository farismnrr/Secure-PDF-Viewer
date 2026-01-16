import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return NextResponse.json({ message: "No authorization header found" }, { status: 401 });
        }

        // Determine SSO URL
        const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL;
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;

        if (!ssoUrl) {
            return NextResponse.json({ message: "NEXT_PUBLIC_SSO_URL is not configured" }, { status: 500 });
        }
        if (!apiKey) {
            return NextResponse.json({ message: "NEXT_PUBLIC_API_KEY is not configured" }, { status: 500 });
        }

        // Using /auth/verify which validates token and returns user data
        const userEndpoint = `${ssoUrl}/auth/verify`;

        // Forward the request to the SSO service
        const backendResponse = await fetch(userEndpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
                "X-API-Key": apiKey,
            },
        });

        if (!backendResponse.ok) {
            const error = await backendResponse.text();
            console.error("SSO user fetch failed:", error);
            return NextResponse.json(
                { message: "Failed to fetch user" },
                { status: backendResponse.status },
            );
        }

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error("User proxy error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
