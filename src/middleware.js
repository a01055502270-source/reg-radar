import { NextResponse } from 'next/server';

const PASSWORD = process.env.SITE_PASSWORD || 'regradar2026';

export function middleware(request) {
  const authCookie = request.cookies.get('rr_auth');
  
  if (authCookie && authCookie.value === PASSWORD) {
    return NextResponse.next();
  }

  const url = request.nextUrl;
  const pw = url.searchParams.get('pw');

  if (pw === PASSWORD) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('rr_auth', PASSWORD, { 
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true 
    });
    return response;
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RegRadar</title></head>
<body style="font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#F5F6F8;margin:0">
<form style="text-align:center">
<h2 style="color:#162240">RegRadar</h2>
<p style="color:#666;font-size:14px">Access password required</p>
<input name="pw" type="password" style="padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:200px" placeholder="Password"/>
<br/><br/>
<button style="padding:8px 24px;background:#1A56DB;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">Enter</button>
</form>
</body></html>`;

  return new NextResponse(html, { 
    status: 200, 
    headers: { 'Content-Type': 'text/html; charset=utf-8' } 
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
