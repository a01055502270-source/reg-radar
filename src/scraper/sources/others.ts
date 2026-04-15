import Parser from 'rss-parser';

export async function scrapeFSC() {
  var results: any[] = [];
  var parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RegRadar/1.0)' },
  });

  var feeds = [
    'https://www.korea.kr/rss/dept_fsc.xml',
    'https://www.mk.co.kr/rss/30100041/',
  ];

  for (var url of feeds) {
    try {
      var feed = await parser.parseURL(url);
      for (var item of (feed.items || []).slice(0, 20)) {
        var title = (item.title || '').trim();
        if (!title) continue;
        var kw = ['은행','규정','고시','지침','시행령','법률','개정','제정','예고','감독','모범규준','자본시장','금융소비자','전자금융','여신','금융위'];
        if (!kw.some(function(k: string){return title.indexOf(k)>=0;})) continue;
        var eid = 'fsc-' + Buffer.from(title + (item.pubDate||'')).toString('base64').slice(0,40);
        if (results.some(function(r: any){return r.externalId===eid;})) continue;
        results.push({
          externalId: eid, title: title, source: 'fsc' as const,
          sourceUrl: item.link || 'https://www.fsc.go.kr',
          category: title.indexOf('시행령')>=0||title.indexOf('법률')>=0?'법률':title.indexOf('모범규준')>=0?'모범규준':'감독규정',
          status: title.indexOf('예고')>=0?'입법예고':title.indexOf('제정')>=0?'제정':title.indexOf('개정')>=0?'개정고시':'공표',
          context: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g,'').slice(0,500),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch(e: any) { console.log('[FSC] ' + url.slice(-30) + ' 실패: ' + e.message); }
  }
  console.log('[FSC] ' + results.length + '건');
  return results;
}

export async function scrapeBOK() {
  var results: any[] = [];
  var parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RegRadar/1.0)' },
  });

  var feeds = [
    'https://www.korea.kr/rss/dept_bok.xml',
    'https://www.mk.co.kr/rss/30100041/',
  ];

  for (var url of feeds) {
    try {
      var feed = await parser.parseURL(url);
      for (var item of (feed.items || []).slice(0, 20)) {
        var title = (item.title || '').trim();
        if (!title) continue;
        var kw = ['기준금리','통화정책','금융안정','거시건전성','한국은행','한은','금통위'];
        if (!kw.some(function(k: string){return title.indexOf(k)>=0;})) continue;
        var eid = 'bok-' + Buffer.from(title + (item.pubDate||'')).toString('base64').slice(0,40);
        if (results.some(function(r: any){return r.externalId===eid;})) continue;
        results.push({
          externalId: eid, title: title, source: 'bok' as const,
          sourceUrl: item.link || 'https://www.bok.or.kr',
          category: '통화정책', status: '공표',
          context: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g,'').slice(0,500),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch(e: any) { console.log('[BOK] ' + url.slice(-30) + ' 실패: ' + e.message); }
  }
  console.log('[BOK] ' + results.length + '건');
  return results;
}

export async function scrapeAssembly() {
  var results: any[] = [];
  var parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RegRadar/1.0)' },
  });

  try {
    var feed = await parser.parseURL('https://www.korea.kr/rss/press.xml');
    for (var item of (feed.items || []).slice(0, 30)) {
      var title = (item.title || '').trim();
      if (!title) continue;
      var kw = ['금융','은행','보험','증권','여신','전자금융','자본시장','입법예고'];
      if (!kw.some(function(k: string){return title.indexOf(k)>=0;})) continue;
      if (title.indexOf('입법') < 0 && title.indexOf('예고') < 0 && title.indexOf('시행령') < 0) continue;
      var eid = 'na-' + Buffer.from(title + (item.pubDate||'')).toString('base64').slice(0,40);
      results.push({
        externalId: eid, title: title, source: 'na' as const,
        sourceUrl: item.link || 'https://opinion.lawmaking.go.kr',
        category: '법률', status: '입법예고',
        context: (item.contentSnippet || '').replace(/<[^>]*>/g,'').slice(0,500),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      });
    }
  } catch(e: any) { console.log('[국회] 실패: ' + e.message); }
  console.log('[국회] ' + results.length + '건');
  return results;
}
