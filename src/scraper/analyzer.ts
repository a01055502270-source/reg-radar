/**
 * 규제 분석기
 * 수집된 규제의 심각도 분류 + 부서 매핑을 AI로 수행
 */
import { callClaude } from '../lib/claude';

export interface AnalyzedMeta {
  severity: 'critical' | 'high' | 'medium' | 'low';
  departments: string[];
  context: string; // context가 비었을 경우 AI가 보강
}

export async function classifyRegulation(
  title: string,
  source: string,
  category: string,
  rawContext: string
): Promise<AnalyzedMeta> {
  const prompt = `금융규제를 분류하라. JSON만 출력.

건명: ${title}
출처: ${source}
분류: ${category}
내용: ${rawContext || '(없음)'}

출력:
{"severity":"critical|high|medium|low","departments":["해당부서1","해당부서2"],"context":"규제 핵심 내용 2~3문장 요약"}

심각도 기준:
- critical: BIS/RWA/자본적정성 직접 영향, 검사 지적 가능성
- high: 업무 프로세스 변경 필요, 의견제출 기한 있음
- medium: 참고 수준, 간접 영향
- low: 단순 안내, 기존 체계 유지

부서 목록: 리스크관리부, 여신심사부, 준법감시부, 경영관리부, 자금운용부, IT기획부, 감사부, 신탁부, 외환부, 소비자보호부`;

  try {
    const text = await callClaude(prompt, 'scrape_analyze');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('파싱 실패');
    return JSON.parse(match[0]);
  } catch {
    // AI 분류 실패 시 기본값
    return {
      severity: 'medium',
      departments: ['준법감시부'],
      context: rawContext || title,
    };
  }
}
