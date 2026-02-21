import { NextResponse } from 'next/server';

const APP_VERSION = 'v0.1.x';

export async function GET() {
    const isPublicDemo = process.env.PUBLIC_DEMO === 'true';
    const hasKey = !!process.env.OPENAI_API_KEY;
    const polishFlag = process.env.ENABLE_POLISH === 'true';

    // Polish is enabled ONLY when: not public demo, key present, and flag on
    const polishEnabled = !isPublicDemo && hasKey && polishFlag;

    return NextResponse.json({
        polishEnabled,
        publicDemo: isPublicDemo,
        version: APP_VERSION,
    });
}
