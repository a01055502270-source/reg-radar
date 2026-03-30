import Parser from 'rss-parser';

export async function scrapeFSS() {
  const results = [];
  const parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  // 시도 1: 금감원 보도자료 RSS
  var rssUrls = [
    'https://www.fss.or.kr/fss/bbs/B0000188/atrclList.do?menuNo=200218&bbsId=B0000188&rss=Y',
  ];

  for (var url of rssUrls) {
    try {
      var feed = await parser.parseURL(url);
      for (var item of (feed.items || []).slice(0, 15)) {
        var title = (item.title || '').trim();
        if (!title) continue;
        var regKw = ['감독규정','시행세칙','모범규준','지침','고시','입법예고','개정','제정','시행령','규정변경','완충자본','스트레스'];
        if (!regKw.some(function(kw){return title.indexOf(kw)>=0;})) continue;
        results.push({
          externalId: 'fss-' + Buffer.from(title).toString('base64').slice(0,40),
          title: title,
          source: 'fss',
          sourceUrl: item.link || 'https://www.fss.or.kr/fss/bbs/B0000188/list.do?menuNo=200218',
          category: title.indexOf('지침')>=0?'감독지침':title.indexOf('모범규준')>=0?'모범규준':'감독규정',
          status: title.indexOf('예고')>=0?'입법예고':title.indexOf('제정')>=0?'제정':title.indexOf('개정')>=0?'개정고시':'공표',
          context: (item.contentSnippet || item.content || '').slice(0,500),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
      if (results.length > 0) break;
    } catch(e: any) { console.log('[FSS] RSS 실패: ' + e.message); }
  }

  // 시도 2: 웹 크롤링 fallback
  if (results.length === 0) {
    try {
      var res = await fetch('https://www.fss.or.kr/fss/bbs/B0000188/atrclList.do?menuNo=200218', {
        headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
        signal: AbortSignal.timeout(10000),
      });
      var html = await res.text();
      var matches = html.match(/title="([^"]{10,})"/g) || [];
      for (var m of matches.slice(0,10)) {
        var t = m.match(/title="([^"]+)"/);
        if (!t) continue;
        var tt = t[1].trim();
        var kw2 = ['감독규정','시행세칙','모범규준','지침','고시','입법예고','개정','제정'];
        if (!kw2.some(function(k){return tt.indexOf(k)>=0;})) continue;
        results.push({
          externalId: 'fss-w-' + Buffer.from(tt).toString('base64').slice(0,40),
          title: tt, source: 'fss',
          sourceUrl: 'https://www.fss.or.kr/fss/bbs/B0000188/list.do?menuNo=200218',
          category: '감독규정', status: '공표', context: '', publishedAt: new Date(),
        });
      }
    } catch(e: any) { console.error('[FSS] 웹 fallback 실패:', e.message); }
  }

  console.log('[FSS] ' + results.length + '건');
  return results;
}
