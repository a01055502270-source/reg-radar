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

  return new NextResponse(
    '<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#F5F6F8"><form style="text-align:center"><h2>규제레이더</h2><p style="color:#666">접근 비밀번호를 입력하세요</p><input name="pw" type="password" style="padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:200px" placeholder="비밀번호"/><br/><br/><button style="padding:8px 24px;background:#1A56DB;color:white;border:none;border-radius:6px;cursor:pointer">입장</button></form></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
