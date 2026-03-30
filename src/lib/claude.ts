import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from './supabase';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MONTHLY_LIMIT = parseFloat(process.env.ANTHROPIC_MONTHLY_LIMIT || '30');

// Sonnet 가격 (2025년 기준, 변동 가능)
const PRICE_PER_INPUT_TOKEN = 3 / 1_000_000;   // $3/MTok
const PRICE_PER_OUTPUT_TOKEN = 15 / 1_000_000;  // $15/MTok

/**
 * 이번 달 누적 API 비용 조회
 */
export async function getMonthlyUsage(): Promise<{ cost: number; calls: number }> {
  const db = getSupabaseAdmin();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data } = await db
    .from('api_usage')
    .select('cost_usd')
    .gte('created_at', startOfMonth.toISOString());

  const totalCost = (data || []).reduce((sum, row) => sum + parseFloat(row.cost_usd || '0'), 0);
  return { cost: totalCost, calls: data?.length || 0 };
}

/**
 * 월 한도 초과 여부 확인
 */
export async function isOverLimit(): Promise<boolean> {
  const { cost } = await getMonthlyUsage();
  return cost >= MONTHLY_LIMIT;
}

/**
 * Claude API 호출 + 비용 추적
 */
export async function callClaude(
  prompt: string,
  action: string = 'analyze',
  userId?: string
): Promise<string> {
  // 한도 체크
  if (await isOverLimit()) {
    throw new Error(`LIMIT_EXCEEDED: 이번 달 API 비용 한도($${MONTHLY_LIMIT})에 도달했습니다.`);
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  // 응답 텍스트 추출
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  // 비용 계산 및 기록
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cost = inputTokens * PRICE_PER_INPUT_TOKEN + outputTokens * PRICE_PER_OUTPUT_TOKEN;

  const db = getSupabaseAdmin();
  await db.from('api_usage').insert({
    action,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: cost,
    user_id: userId,
  });

  return text;
}

/**
 * 캐시된 분석이 있으면 반환, 없으면 새로 분석
 */
export async function analyzeWithCache(
  regulationId: string,
  prompt: string,
  userId?: string
): Promise<any> {
  const db = getSupabaseAdmin();

  // 캐시 확인
  const { data: cached } = await db
    .from('analyses')
    .select('*')
    .eq('regulation_id', regulationId)
    .single();

  if (cached) {
    return cached;
  }

  // 새로 분석
  const text = await callClaude(prompt, 'analyze', userId);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('분석 결과 파싱 실패');

  const parsed = JSON.parse(match[0]);

  // DB에 캐시 저장
  const { data: saved } = await db
    .from('analyses')
    .upsert({
      regulation_id: regulationId,
      summary: parsed.summary,
      impact: parsed.impact,
      changes: parsed.changes || [],
      actions: parsed.actions || [],
      deadline_text: parsed.deadline,
      related_regulations: parsed.related,
      risk: parsed.risk,
    })
    .select()
    .single();

  return saved;
}
