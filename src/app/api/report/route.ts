/**
 * POST /api/report
 * 월간 규제동향 보고서 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { callClaude, isOverLimit, getMonthlyUsage } from '@/lib/claude';

const SOURCE_NAMES: Record<string, string> = {
  fss: '금감원', fsc: '금융위', bok: '한은', na: '국회'
};
const SEV_LABELS: Record<string, string> = {
  critical: '긴급', high: '중요', medium: '참고', low: '일반'
};

export async function POST(req: NextRequest) {
  const { department, period } = await req.json();
  if (!department || !period) {
    return NextResponse.json({ error: 'department, period 필요' }, { status: 400 });
  }

  if (await isOverLimit()) {
    const { cost } = await getMonthlyUsage();
    return NextResponse.json({
      error: 'LIMIT_EXCEEDED',
      message: `이번 달 API 한도 도달 ($${cost.toFixed(2)})`,
    }, { status: 429 });
  }

  const db = getSupabaseAdmin();

  // 해당 부서 규제 조회
  const { data: deptRegs } = await db
    .from('regulation_departments')
    .select('regulation_id')
    .eq('department', department);

  const regIds = (deptRegs || []).map(d => d.regulation_id);
  if (regIds.length === 0) {
    return NextResponse.json({ error: '해당 부서 관련 규제 없음' }, { status: 404 });
  }

  const { data: regulations } = await db
    .from('regulations')
    .select('*')
    .in('id', regIds)
    .order('published_at', { ascending: false });

  if (!regulations || regulations.length === 0) {
    return NextResponse.json({ error: '규제 데이터 없음' }, { status: 404 });
  }

  // 보고서 프롬프트
  const items = regulations.map(r =>
    `- [${SEV_LABELS[r.severity] || r.severity}] ${r.title} | ${SOURCE_NAMES[r.source] || r.source} | ${r.published_at?.slice(0, 10)} | ${r.status}\n  내용: ${r.context || '(없음)'}`
  ).join('\n');

  const prompt = `당신은 ${department} 팀장이 부서장에게 올리는 월간 규제동향 보고를 대필하는 직원이다.

아래 규제 목록을 바탕으로 "${period} ${department} 규제동향 보고" 문서를 작성하라.

[규제 목록]
${items}

[작성 규칙]
1. 문체: 은행 내부 보고서 문체. ~임, ~됨, ~바람, ~요망. 감탄사, 수식어, "중요합니다", "주목할 만합니다" 같은 AI투 표현 절대 금지.
2. 구조:
   ■ 총괄 (3줄 이내)
   ■ 긴급/중요 규제 (건별: 건명 → 주요내용 → 영향 → 조치사항)
   ■ 일반/참고 규제 (1~2줄 요약)
   ■ 조치 필요사항 (번호. 담당/기한 포함)
   ■ 차월 예상 이슈
3. 분량: A4 1~1.5매.
4. 숫자, 조항, 규정명 구체적 명시.`;

  try {
    const content = await callClaude(prompt, 'report');

    // DB에 보고서 저장
    const { data: saved } = await db
      .from('reports')
      .insert({ department, period, content })
      .select()
      .single();

    return NextResponse.json({
      id: saved?.id,
      content,
      department,
      period,
      regulationCount: regulations.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
