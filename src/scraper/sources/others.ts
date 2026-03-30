/**
 * 금융위원회 규제 수집기
 * 입법예고 / 규정고시 페이지 크롤링
 */
import * as cheerio from 'cheerio';

export interface ScrapedRegulation {
  externalId: string;
  title: string;
  source: 'fsc' | 'bok' | 'na';
  sourceUrl: string;
  category: string;
  status: string;
  context: string;
  publishedAt: Date;
}

export async function scrapeFSC(): Promise<ScrapedRegulation[]> {
  const results: ScrapedRegulation[] = [];

  try {
    // 금융위 입법예고 목록
    const res = await fetch('https://www.fsc.go.kr/po040301');
    const html = await res.text();
    const $ = cheerio.load(html);

    // 게시판 목록 파싱 (실제 HTML 구조에 맞게 조정 필요)
    $('table tbody tr, .board_list li').each((i, el) => {
      if (i >= 10) return; // 최근 10건만
      const titleEl = $(el).find('a, .title');
      const title = titleEl.text().trim();
      const href = titleEl.attr('href');
      if (!title) return;

      const regKeywords = ['규정', '고시', '지침', '시행령', '법률', '개정', '제정'];
      if (!regKeywords.some(kw => title.includes(kw))) return;

      results.push({
        externalId: `fsc-${title.slice(0, 50)}-${i}`,
        title,
        source: 'fsc',
        sourceUrl: href ? `https://www.fsc.go.kr${href}` : 'https://www.fsc.go.kr/po040301',
        category: title.includes('법률') || title.includes('시행령') ? '법률' : '감독규정',
        status: title.includes('예고') ? '입법예고' : '개정고시',
        context: '',
        publishedAt: new Date(),
      });
    });
  } catch (error) {
    console.error('[FSC] 스크래핑 실패:', error);
  }

  return results;
}

/**
 * 한국은행 통화정책 수집기
 */
export async function scrapeBOK(): Promise<ScrapedRegulation[]> {
  const results: ScrapedRegulation[] = [];

  try {
    const res = await fetch('https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200643');
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table tbody tr, .board_list li').each((i, el) => {
      if (i >= 5) return;
      const title = $(el).find('a, .title').text().trim();
      const href = $(el).find('a').attr('href');
      if (!title) return;

      results.push({
        externalId: `bok-${title.slice(0, 50)}-${i}`,
        title,
        source: 'bok',
        sourceUrl: href ? `https://www.bok.or.kr${href}` : 'https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200643',
        category: '통화정책',
        status: '공표',
        context: '',
        publishedAt: new Date(),
      });
    });
  } catch (error) {
    console.error('[BOK] 스크래핑 실패:', error);
  }

  return results;
}

/**
 * 국회 입법예고 수집기
 */
export async function scrapeAssembly(): Promise<ScrapedRegulation[]> {
  const results: ScrapedRegulation[] = [];

  try {
    const res = await fetch('https://opinion.lawmaking.go.kr/gcom/gcomList');
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table tbody tr, .list_item').each((i, el) => {
      if (i >= 10) return;
      const title = $(el).find('a, .title').text().trim();
      const href = $(el).find('a').attr('href');
      if (!title) return;

      // 금융 관련 키워드 필터
      const finKeywords = ['금융', '은행', '보험', '증권', '여신', '전자금융', '자본시장'];
      if (!finKeywords.some(kw => title.includes(kw))) return;

      results.push({
        externalId: `na-${title.slice(0, 50)}-${i}`,
        title,
        source: 'na',
        sourceUrl: href || 'https://opinion.lawmaking.go.kr/gcom/gcomList',
        category: '법률',
        status: '입법예고',
        context: '',
        publishedAt: new Date(),
      });
    });
  } catch (error) {
    console.error('[국회] 스크래핑 실패:', error);
  }

  return results;
}
