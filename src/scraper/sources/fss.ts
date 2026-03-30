import Parser from 'rss-parser';

export async function scrapeFSS() {
  var results: any[] = [];
  var parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RegRadar/1.0)' },
  });

  // 금융 뉴스 RSS에서 금감원 규제 관련 기사 수집
  var feeds = [
    'https://www.korea.kr/rss/dept_fss.xml',
    'https://www.mk.co.kr/rss/30100041/',
    'https://www.sedaily.com/RSS/Economy',
  ];

  for (var url of feeds) {
    try {
      var feed = await parser.parseURL(url);
      for (var item of (feed.items || []).slice(0, 20)) {
        var title = (item.title || '').trim();
        if (!title) continue;

        var kw = ['감독규정','시행세칙','모범규준','지침','고시','입법예고','개정','제정','시행령','규정변경','완충자본','스트레스','건전성','자본적정','BIS','바젤','금감원'];
        if (!kw.some(function(k: string){return title.indexOf(k)>=0;})) continue;

        var eid = 'fss-' + Buffer.from(title + (item.pubDate||'')).toString('base64').slice(0,40);
        if (results.some(function(r: any){return r.externalId===eid;})) continue;

        results.push({
          externalId: eid,
          title: title,
          source: 'fss' as const,
          sourceUrl: item.link || 'https://www.fss.or.kr',
          category: title.indexOf('지침')>=0?'감독지침':title.indexOf('모범규준')>=0?'모범규준':'감독규정',
          status: title.indexOf('예고')>=0?'입법예고':title.indexOf('제정')>=0?'제정':title.indexOf('개정')>=0?'개정고시':'공표',
          context: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g,'').slice(0,500),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch(e: any) { console.log('[FSS] ' + url.slice(-30) + ' 실패: ' + e.message); }
  }

  console.log('[FSS] ' + results.length + '건');
  return results;
}
