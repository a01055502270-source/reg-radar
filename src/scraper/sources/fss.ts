/**
 * 금융감독원 규제 수집기
 * RSS 피드 + 법규정보 페이지 크롤링
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const RSS_URL = 'https://www.fss.or.kr/fss/bbs/B0000188/atrclList.do?menuNo=200218&bbsId=B0000188&rss=true';
const BASE_URL = 'https://www.fss.or.kr';

export interface ScrapedRegulation {
  externalId: string;
  title: string;
  source: 'fss';
  sourceUrl: string;
  category: string;
  status: string;
  context: string;
  publishedAt: Date;
}

export async function scrapeFSS(): Promise<ScrapedRegulation[]> {
  const results: ScrapedRegulation[] = [];

  try {
    // 1. RSS 피드 파싱
    const parser = new Parser();
    const feed = await parser.parseURL(RSS_URL);

    for (const item of feed.items.slice(0, 20)) {
      // 규제 관련 키워드 필터 (모든 공시가 아닌 규제만)
      const regKeywords = ['감독규정', '시행세칙', '모범규준', '지침', '고시', '입법예고', '개정', '제정'];
      const isRegulation = regKeywords.some(kw => (item.title || '').includes(kw));
      if (!isRegulation) continue;

      const externalId = `fss-${item.guid || item.link || item.title}`;
      const sourceUrl = item.link || `${BASE_URL}/fss/bbs/B0000188/list.do?menuNo=200218`;

      // 2. 상세 페이지에서 내용 추출 (가능한 경우)
      let context = item.contentSnippet || item.content || '';
      if (item.link) {
        try {
          const detailRes = await fetch(item.link);
          const html = await detailRes.text();
          const $ = cheerio.load(html);
          // 금감원 상세 페이지 본문 영역
          const bodyText = $('.bbs_view_con, .view_con, .board_view').text().trim();
          if (bodyText.length > context.length) {
            context = bodyText.slice(0, 1000); // 최대 1000자
          }
        } catch {
          // 상세 페이지 접근 실패 시 RSS 요약 사용
        }
      }

      // 분류/상태 추론
      const category = inferCategory(item.title || '');
      const status = inferStatus(item.title || '');

      results.push({
        externalId,
        title: (item.title || '').trim(),
        source: 'fss',
        sourceUrl,
        category,
        status,
        context: context.slice(0, 1000),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      });
    }
  } catch (error) {
    console.error('[FSS] 스크래핑 실패:', error);
  }

  return results;
}

function inferCategory(title: string): string {
  if (title.includes('감독규정')) return '감독규정';
  if (title.includes('시행세칙')) return '감독규정';
  if (title.includes('모범규준')) return '모범규준';
  if (title.includes('지침')) return '감독지침';
  if (title.includes('고시')) return '감독규정';
  return '감독행정';
}

function inferStatus(title: string): string {
  if (title.includes('입법예고') || title.includes('예고')) return '입법예고';
  if (title.includes('제정')) return '제정';
  if (title.includes('개정')) return '개정고시';
  if (title.includes('안내')) return '안내';
  return '공표';
}
