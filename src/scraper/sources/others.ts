import Parser from 'rss-parser';

// ── 금융위원회 (korea.kr RSS 경유 — 안정적) ──
export async function scrapeFSC() {
  var results = [];
  var parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  try {
    // korea.kr 정책브리핑 금융위 RSS — 정부 공식 RSS라 안정적
    var feed = await parser.parseURL('https://www.korea.kr/rss/dept_fsc.xml');
    for (var item of (feed.items || []).slice(0, 20)) {
      var title = (item.title || '').trim();
      if (!title) continue;

      // 규제 관련 키워드 필터
      var regKw = ['규정','고시','지침','시행령','법률','개정','제정','예고','감독','모범규준','자본시장','금융소비자','전자금융','여신'];
      if (!regKw.some(function(kw){return title.indexOf(kw)>=0;})) continue;

      results.push({
        externalId: 'fsc-' + Buffer.from(title).toString('base64').slice(0,40),
        title: title,
        source: 'fsc',
        sourceUrl: item.link || 'https://www.fsc.go.kr/no010101',
        category: title.indexOf('시행령')>=0||title.indexOf('법률')>=0?'법률':title.indexOf('모범규준')>=0?'모범규준':'감독규정',
        status: title.indexOf('예고')>=0?'입법예고':title.indexOf('제정')>=0?'제정':title.indexOf('개정')>=0?'개정고시':'공표',
        context: (item.contentSnippet || item.content || '').slice(0,500),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      });
    }
  } catch(e: any) {
    console.error('[FSC] korea.kr RSS 실패:', e.message);

    // fallback: 금융위 직접 RSS
    try {
      var feed2 = await parser.parseURL('https://www.fsc.go.kr/po040301/rss');
      for (var item2 of (feed2.items || []).slice(0,10)) {
        var title2 = (item2.title || '').trim();
        if (!title2) continue;
        results.push({
          externalId: 'fsc-d-' + Buffer.from(title2).toString('base64').slice(0,40),
          title: title2, source: 'fsc',
          sourceUrl: item2.link || 'https://www.fsc.go.kr/po040301',
          category: '감독규정', status: '공표',
          context: (item2.contentSnippet || '').slice(0,500),
          publishedAt: item2.pubDate ? new Date(item2.pubDate) : new Date(),
        });
      }
    } catch(e2: any) { console.error('[FSC] 직접 RSS도 실패:', e2.message); }
  }

  console.log('[FSC] ' + results.length + '건');
  return results;
}

// ── 한국은행 ──
export async function scrapeBOK() {
  var results = [];
  var parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  // 한은 보도자료 RSS
  var urls = [
    'https://www.bok.or.kr/portal/bbs/B0000338/atrclList.do?menuNo=201263&rss=Y',
    'https://www.bok.or.kr/rss/press.xml',
  ];

  for (var url of urls) {
    try {
      var feed = await parser.parseURL(url);
      for (var item of (feed.items || []).slice(0, 10)) {
        var title = (item.title || '').trim();
        if (!title) continue;
        var kw = ['기준금리','통화정책','금융안정','거시건전성','스트레스','바젤','은행','여신'];
        if (!kw.some(function(k){return title.indexOf(k)>=0;})) continue;
        results.push({
          externalId: 'bok-' + Buffer.from(title).toString('base64').slice(0,40),
          title: title, source: 'bok',
          sourceUrl: item.link || 'https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200643',
          category: '통화정책', status: '공표',
          context: (item.contentSnippet || '').slice(0,500),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
      if (results.length > 0) break;
    } catch(e: any) { console.log('[BOK] RSS 실패 (' + url.slice(-20) + '): ' + e.message); }
  }

  // fallback: 웹 크롤링
  if (results.length === 0) {
    try {
      var res = await fetch('https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200643', {
        headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
        signal: AbortSignal.timeout(10000),
      });
      var html = await res.text();
      // 기준금리 관련 텍스트 추출
      var dateMatch = html.match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
      if (dateMatch) {
        results.push({
          externalId: 'bok-rate-' + dateMatch[1].replace(/\./g,''),
          title: '기준금리 결정 (' + dateMatch[1] + ')',
          source: 'bok',
          sourceUrl: 'https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200643',
          category: '통화정책', status: '공표', context: '',
          publishedAt: new Date(),
        });
      }
    } catch(e: any) { console.error('[BOK] 웹 fallback 실패:', e.message); }
  }

  console.log('[BOK] ' + results.length + '건');
  return results;
}

// ── 국회 입법예고 ──
export async function scrapeAssembly() {
  var results = [];

  try {
    // 국회 입법예고 페이지
    var res = await fetch('https://opinion.lawmaking.go.kr/gcom/gcomList', {
      headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
      signal: AbortSignal.timeout(10000),
    });
    var html = await res.text();

    // 금융 관련 입법예고 제목 추출
    var titles = html.match(/title="([^"]{10,})"/g) || [];
    for (var m of titles.slice(0, 20)) {
      var t = m.match(/title="([^"]+)"/);
      if (!t) continue;
      var title = t[1].trim();

      var finKw = ['금융','은행','보험','증권','여신','전자금융','자본시장','신용','예금','저축'];
      if (!finKw.some(function(k){return title.indexOf(k)>=0;})) continue;

      results.push({
        externalId: 'na-' + Buffer.from(title).toString('base64').slice(0,40),
        title: title, source: 'na',
        sourceUrl: 'https://opinion.lawmaking.go.kr/gcom/gcomList',
        category: '법률', status: '입법예고', context: '',
        publishedAt: new Date(),
      });
    }
  } catch(e: any) {
    console.error('[국회] 스크래핑 실패:', e.message);
  }

  console.log('[국회] ' + results.length + '건');
  return results;
}
