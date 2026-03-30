/**
 * 규제 스캔 메인 엔트리포인트
 * GitHub Actions Cron 또는 `npm run scrape`로 실행
 *
 * 흐름:
 * 1. 4개 출처(금감원/금융위/한은/국회) 병렬 스캔
 * 2. DB에서 external_id로 중복 체크
 * 3. 신규 규제만 AI 분류 (심각도 + 부서 매핑)
 * 4. DB 저장
 * 5. 긴급(critical) 규제는 즉시 알림 발송
 */

import { getSupabaseAdmin } from '../lib/supabase';
import { isOverLimit } from '../lib/claude';
import { notifyCriticalRegulation } from '../lib/notify';
import { scrapeFSS } from './sources/fss';
import { scrapeFSC, scrapeBOK, scrapeAssembly } from './sources/others';
import { classifyRegulation } from './analyzer';

const SOURCE_NAMES: Record<string, string> = {
  fss: '금감원', fsc: '금융위', bok: '한은', na: '국회'
};

async function main() {
  console.log(`[${new Date().toISOString()}] 규제 스캔 시작`);

  const db = getSupabaseAdmin();

  // 1. 병렬 수집
  const [fssRegs, fscRegs, bokRegs, naRegs] = await Promise.allSettled([
    scrapeFSS(),
    scrapeFSC(),
    scrapeBOK(),
    scrapeAssembly(),
  ]);

  const allRegs = [
    ...(fssRegs.status === 'fulfilled' ? fssRegs.value : []),
    ...(fscRegs.status === 'fulfilled' ? fscRegs.value : []),
    ...(bokRegs.status === 'fulfilled' ? bokRegs.value : []),
    ...(naRegs.status === 'fulfilled' ? naRegs.value : []),
  ];

  console.log(`[수집] 총 ${allRegs.length}건 (FSS: ${fssRegs.status === 'fulfilled' ? fssRegs.value.length : 'ERR'}, FSC: ${fscRegs.status === 'fulfilled' ? fscRegs.value.length : 'ERR'}, BOK: ${bokRegs.status === 'fulfilled' ? bokRegs.value.length : 'ERR'}, 국회: ${naRegs.status === 'fulfilled' ? naRegs.value.length : 'ERR'})`);

  if (allRegs.length === 0) {
    console.log('[완료] 수집된 규제 없음');
    return;
  }

  // 2. 중복 체크
  const externalIds = allRegs.map(r => r.externalId);
  const { data: existing } = await db
    .from('regulations')
    .select('external_id')
    .in('external_id', externalIds);

  const existingIds = new Set((existing || []).map(r => r.external_id));
  const newRegs = allRegs.filter(r => !existingIds.has(r.externalId));

  console.log(`[필터] 신규 ${newRegs.length}건 (기존 ${existingIds.size}건 제외)`);

  if (newRegs.length === 0) {
    console.log('[완료] 신규 규제 없음');
    return;
  }

  // 3. AI 분류 (한도 체크)
  const overLimit = await isOverLimit();

  for (const reg of newRegs) {
    let severity = 'medium';
    let departments: string[] = ['준법감시부'];
    let context = reg.context;

    if (!overLimit) {
      try {
        const classified = await classifyRegulation(
          reg.title,
          SOURCE_NAMES[reg.source] || reg.source,
          reg.category,
          reg.context
        );
        severity = classified.severity;
        departments = classified.departments;
        if (classified.context) context = classified.context;
      } catch (e) {
        console.warn(`[AI 분류 실패] ${reg.title}: ${e}`);
      }
    } else {
      console.warn('[AI 한도 초과] 기본 분류 적용');
    }

    // 4. DB 저장
    const { data: saved, error } = await db
      .from('regulations')
      .insert({
        external_id: reg.externalId,
        title: reg.title,
        source: reg.source,
        source_url: reg.sourceUrl,
        category: reg.category,
        status: reg.status,
        severity,
        context,
        published_at: reg.publishedAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`[DB 저장 실패] ${reg.title}: ${error.message}`);
      continue;
    }

    // 부서 매핑 저장
    if (saved) {
      const deptRows = departments.map(d => ({
        regulation_id: saved.id,
        department: d,
      }));
      await db.from('regulation_departments').insert(deptRows);
    }

    // 5. 긴급 규제 알림
    if (severity === 'critical') {
      await notifyCriticalRegulation({
        title: reg.title,
        source: SOURCE_NAMES[reg.source] || reg.source,
        url: reg.sourceUrl,
        context,
      });
      console.log(`[알림 발송] 긴급: ${reg.title}`);
    }

    console.log(`[저장] [${severity}] ${reg.title} → ${departments.join(', ')}`);
  }

  console.log(`[${new Date().toISOString()}] 스캔 완료: ${newRegs.length}건 저장`);
}

main().catch(e => {
  console.error('[치명적 오류]', e);
  process.exit(1);
});
