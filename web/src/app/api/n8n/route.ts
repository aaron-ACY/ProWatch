import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Thử gọi Test Webhook n8n (khi người dùng đang mở Canvas n8n ở chế độ Test)
    const testUrl = 'http://localhost:3636/webhook-test/trigger-training';
    // 2. Gọi Production Webhook n8n
    const prodUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:3636/webhook/trigger-training';
    // 3. Fallback trực tiếp Python Task Runner nếu n8n container không phản hồi
    const directRunnerUrl = 'http://localhost:5005/train';

    let triggeredUrl = testUrl;
    let response: Response | null = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (!response || !response.ok) {
      triggeredUrl = prodUrl;
      response = await fetch(prodUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null);
    }

    if (!response || !response.ok) {
      console.log('[n8n Bridge] n8n webhook không sẵn sàng, gọi trực tiếp Task Runner 5005...');
      triggeredUrl = directRunnerUrl;
      response = await fetch(directRunnerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null);
    }

    if (!response || !response.ok) {
      throw new Error(`Cả n8n (${prodUrl}) và Python Runner (${directRunnerUrl}) đều không phản hồi.`);
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      triggeredUrl,
      status: 'SUCCESS'
    });
  } catch (error: any) {
    console.error('n8n API handler error:', error?.message);
    return NextResponse.json({
      status: 'ERROR',
      message: error?.message || 'Lỗi kết nối n8n/Python runner',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
