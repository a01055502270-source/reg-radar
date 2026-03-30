import { NextResponse } from 'next/server';

var PASSWORD = process.env.SITE_PASSWORD || 'wbfh1207!!';

export function middleware(request) {
  var authCookie = request.cookies.get('rr_auth');
  if (authCookie && authCookie.value === PASSWORD) {
    return NextResponse.next();
  }
  var url = request.nextUrl;
  var pw = url.searchParams.get('pw');
  if (pw === PASSWORD) {
    var response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('rr_auth', PASSWORD, { maxAge: 2592000, httpOnly: true });
    return response;
  }
  return new NextResponse(
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#F5F6F8;margin:0"><form style="text-align:center"><h2>RegRadar</h2><p style="color:#666">Enter password</p><input name="pw" type="password" style="padding:10px;border:1px solid #ddd;border-radius:6px;width:200px"/><br><br><button style="padding:8px 24px;background:#1A56DB;color:white;border:none;border-radius:6px;cursor:pointer">Login</button></form></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export var config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'] };
