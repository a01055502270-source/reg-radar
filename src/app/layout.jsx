export const metadata = {
  title: '규제레이더 | RegRadar',
  description: '금융기관 규제 추적 서비스',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
