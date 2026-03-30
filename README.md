# 규제레이더 (RegRadar) — Production Backend

금융기관 규제 추적 B2B SaaS

## 아키텍처

```
GitHub Actions (30분 Cron)  →  금감원/금융위/한은/국회 스캔
                            →  Supabase DB 저장
                            →  신규 규제 시 알림 발송

Next.js (Vercel)            →  프론트엔드 + API Routes
                            →  Supabase에서 데이터 읽기
                            →  Claude API로 실시간 분석 (API Route 경유)
```

## 무료 인프라 구성

| 서비스 | 플랜 | 용도 | 제한 |
|--------|------|------|------|
| Vercel | Hobby (무료) | Next.js 호스팅 + API | 월 100GB 대역폭 |
| Supabase | Free | PostgreSQL DB | 500MB, 5만 API/월 |
| GitHub Actions | Free | 규제 스캔 Cron | 2,000분/월 |
| Claude API | 종량제 | 규제 분석 | 월 한도 설정 가능 ($10~30) |

## 빠른 시작

### 1. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 편집:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MONTHLY_LIMIT=30   # 월 API 비용 한도 ($)
TELEGRAM_BOT_TOKEN=           # 선택
NOTIFICATION_EMAIL=           # 선택
```

### 2. Supabase DB 셋업

Supabase 대시보드 → SQL Editor에서 `sql/schema.sql` 실행

### 3. 로컬 개발

```bash
npm install
npm run dev
```

### 4. 배포

```bash
# Vercel 배포
vercel

# GitHub Actions 시크릿 설정 (Settings → Secrets → Actions)
# SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY 추가
```

### 5. 스크래퍼 로컬 테스트

```bash
npm run scrape
```

## 프로젝트 구조

```
reg-radar/
├── .github/workflows/
│   └── scrape.yml          # 30분 Cron - 규제 스캔
├── src/
│   ├── scraper/
│   │   ├── index.ts        # 스크래퍼 엔트리포인트
│   │   ├── sources/
│   │   │   ├── fss.ts      # 금감원 RSS 파서
│   │   │   ├── fsc.ts      # 금융위 크롤러
│   │   │   ├── bok.ts      # 한은 크롤러
│   │   │   └── assembly.ts # 국회 입법예고
│   │   └── analyzer.ts     # Claude API 분석기
│   ├── lib/
│   │   ├── supabase.ts     # Supabase 클라이언트
│   │   ├── claude.ts       # Claude API 래퍼 (비용 제어 포함)
│   │   └── notify.ts       # 알림 (이메일/텔레그램)
│   └── app/                # Next.js App Router
│       ├── api/
│       │   ├── analyze/    # 규제 분석 API Route
│       │   ├── report/     # 보고서 생성 API Route
│       │   └── regulations/# 규제 목록 API Route
│       ├── dashboard/
│       ├── feed/
│       ├── reports/
│       └── settings/
├── sql/
│   └── schema.sql          # DB 스키마
├── scripts/
│   └── seed.ts             # 초기 데이터 시드
└── package.json
```

## 비용 제어

1. **Anthropic Console**: 월 사용 한도 설정
2. **앱 레벨**: `api_usage` 테이블로 일일/월간 사용량 추적
3. **캐시**: 동일 규제 반복 분석 시 DB 캐시 반환
4. **한도 초과 시**: 분석 버튼 비활성화 + "이번 달 분석 한도 소진" 안내
