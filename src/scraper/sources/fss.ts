import * as cheerio from 'cheerio';

export async function scrapeFSS() {
  var results: any[] = [];

  try {
    var res = await fetch('https://www.fss.or.kr/fss/bbs/B0000188/atrclList.do?menuNo=200218', {
      headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
      signal: AbortSignal.timeout(15000),
    });
    var html = await res.text();
    var $ = cheerio.load(html);

    $('a[title]').each(function(i: number) {
      if (i >= 15) return;
      var title = ($(this).attr('title') || '').trim();
      if (!title || title.length < 5) return;

      var regKw = ['감독규정','시행세칙','모범규준','지침','고시','입법예고','개정','제정','시행령','규정변경','완충자본','스트레스','건전성'];
      if (!regKw.some(function(kw: string){return title.indexOf(kw)>=0;})) return;

      var href = $(this).attr('href') || '';
      var fullUrl = href.startsWith('http') ? href : 'https://www.fss.or.kr' + href;

      results.push({
        externalId: 'fss-' + Buffer.from(title).toString('base64').slice(0,40),
        title: title,
        source: 'fss' as const,
        sourceUrl: fullUrl,
        category: title.indexOf('지침')>=0?'감독지침':title.indexOf('모범규준')>=0?'모범규준':'감독규정',
        status: title.indexOf('예고')>=0?'입법예고':title.indexOf('제정')>=0?'제정':title.indexOf('개정')>=0?'개정고시':'공표',
        context: '',
        publishedAt: new Date(),
      });
    });
  } catch(e: any) {
    console.error('[FSS] 스크래핑 실패:', e.message);
  }

  console.log('[FSS] ' + results.length + '건');
  return results;
}
