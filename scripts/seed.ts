/**
 * 초기 테스트 데이터 시드
 * 실행: npm run seed
 */
import { getSupabaseAdmin } from '../src/lib/supabase';

const SEED_REGULATIONS = [
  {
    external_id: 'seed-001',
    title: '은행업감독규정 시행세칙 일부개정 예고',
    source: 'fss',
    source_url: 'https://www.fss.or.kr/fss/bbs/B0000188/list.do?menuNo=200218',
    category: '감독규정',
    status: '입법예고',
    severity: 'critical',
    context: '자본적정성 산출 기준 중 위험가중자산(RWA) 산정 세부기준 변경. 신용위험 표준방법 및 IRB 접근법 관련 별표3 개정사항 포함.',
    published_at: '2026-03-28T00:00:00Z',
    departments: ['리스크관리부', '경영관리부'],
  },
  {
    external_id: 'seed-002',
    title: '스트레스 완충자본 제도 운영 세부지침 제정안',
    source: 'fss',
    source_url: 'https://www.fss.or.kr/fss/bbs/B0000188/list.do?menuNo=200218',
    category: '감독지침',
    status: '제정',
    severity: 'critical',
    context: '2024년 12월 도입된 SCB 프레임워크의 세부 운영기준. 연 1회 bottom-up 스트레스 테스트 수행기준, 시나리오 설계 방법론, 자본계획 반영 절차.',
    published_at: '2026-03-27T00:00:00Z',
    departments: ['리스크관리부'],
  },
  {
    external_id: 'seed-003',
    title: '금융회사 기후리스크 관리 모범규준(안)',
    source: 'fsc',
    source_url: 'https://www.fsc.go.kr/po040301',
    category: '모범규준',
    status: '의견수렴',
    severity: 'high',
    context: '기후리스크를 금융회사 리스크 관리체계에 통합. 기후 시나리오 분석, 탄소배출 익스포저 관리, 공시 의무화 로드맵.',
    published_at: '2026-03-26T00:00:00Z',
    departments: ['리스크관리부', '경영관리부', '준법감시부'],
  },
  {
    external_id: 'seed-004',
    title: '기준금리 결정 및 통화정책방향 (2026년 4월)',
    source: 'bok',
    source_url: 'https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200643',
    category: '통화정책',
    status: '공표',
    severity: 'medium',
    context: '금통위 기준금리 결정사항 및 향후 통화정책 방향. 물가안정·경기회복 간 균형, 가계부채 관리 방향.',
    published_at: '2026-03-24T00:00:00Z',
    departments: ['자금운용부', '리스크관리부', '경영관리부'],
  },
];

async function seed() {
  const db = getSupabaseAdmin();
  console.log('시드 데이터 삽입 시작...');

  for (const reg of SEED_REGULATIONS) {
    const { departments, ...regData } = reg;

    const { data: saved, error } = await db
      .from('regulations')
      .upsert(regData, { onConflict: 'external_id' })
      .select()
      .single();

    if (error) {
      console.error(`실패: ${reg.title} - ${error.message}`);
      continue;
    }

    // 부서 매핑
    if (saved) {
      await db.from('regulation_departments')
        .delete()
        .eq('regulation_id', saved.id);

      await db.from('regulation_departments')
        .insert(departments.map(d => ({
          regulation_id: saved.id,
          department: d,
        })));
    }

    console.log(`저장: ${reg.title}`);
  }

  console.log('시드 완료');
}

seed().catch(console.error);
