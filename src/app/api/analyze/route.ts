/**
 * POST /api/analyze
 * 개별 규제 AI 분석 (캐시 활용)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { analyzeWithCache, getMonthlyUsage, isOverLimit } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { regulationId } = await req.json();
  if (!regulationId) {
    return NextResponse.json({ error: 'regulationId 필요' }, { status: 400 });
  }

  // 월 한도 체크
  if (await isOverLimit()) {
    const { cost } = await getMonthlyUsage();
    return NextResponse.json({
      error: 'LIMIT_EXCEEDED',
      message: `이번 달 API 비용 한도에 도달했습니다. (현재: $${cost.toFixed(2)})`,
    }, { status: 429 });
  }

  // 규제 정보 조회
  const db = getSupabaseAdmin();
  const { data: reg } = await db
    .from('regulations')
    .select('*, regulation_departments(department)')
    .eq('id', regulationId)
    .single();

  if (!reg) {
    return NextResponse.json({ error: '규제를 찾을 수 없음' }, { status: 404 });
  }

  const SOURCE_NAMES: Record<string, string> = {
    fss: '금융감독원', fsc: '금융위원회', bok: '한국은행', na: '국회'
  };

  const prompt = `아래 금융규제를 은행 리스크관리부 실무자 관점에서 분석하라. 마크다운이나 부연설명 없이 JSON만 출력하라.

[규제 정보]
건명: ${reg.title}
발령기관: ${SOURCE_NAMES[reg.source] || reg.source}
분류: ${reg.category} / 상태: ${reg.status} / 일자: ${reg.published_at}
관련부서: ${reg.regulation_departments?.map((d: any) => d.department).join(', ')}
규제 내용: ${reg.context || '(내용 없음)'}

[출력 형식 — JSON only]
{"summary":"2~3문장. ~임, ~됨, ~예정 어미. 감탄사 배제.","impact":"실무 영향. 구체적 업무 언급. ~필요함, ~검토 요망 어미.","changes":["변경1: 조항/기준 명시","변경2","변경3"],"actions":["조치1: 담당팀/기한 포함","조치2"],"deadline":"기한","related":"관련 규정명","risk":"미이행시 리스크"}`;

  try {
    const analysis = await analyzeWithCache(regulationId, prompt);
    return NextResponse.json(analysis);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 월간 사용량 조회
export async function GET() {
  const usage = await getMonthlyUsage();
  const over = await isOverLimit();
  return NextResponse.json({ ...usage, isOverLimit: over });
}
