-- ═══════════════════════════════════════
-- 규제레이더 DB 스키마
-- Supabase SQL Editor에서 실행
-- ═══════════════════════════════════════

-- 규제 원문 테이블
CREATE TABLE regulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,        -- 출처별 고유 ID (중복 수집 방지)
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('fss','fsc','bok','na')),
  source_url TEXT,                          -- 원문 직접 URL
  category TEXT,                            -- 감독규정, 감독지침, 모범규준, 법률, 통화정책 등
  status TEXT,                              -- 입법예고, 제정, 개정고시, 공표, 안내 등
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  context TEXT,                             -- 규제 내용 요약 (스크래퍼가 추출)
  raw_content TEXT,                         -- 원문 전체 텍스트 (가능한 경우)
  published_at TIMESTAMPTZ,                 -- 규제 공표일
  deadline TIMESTAMPTZ,                     -- 의견제출 기한 / 시행일
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 부서 매핑 테이블
CREATE TABLE regulation_departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  regulation_id UUID REFERENCES regulations(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 분석 결과 캐시
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  regulation_id UUID REFERENCES regulations(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  impact TEXT,
  changes JSONB DEFAULT '[]',               -- ["변경사항1", "변경사항2"]
  actions JSONB DEFAULT '[]',               -- ["조치사항1", "조치사항2"]
  deadline_text TEXT,
  related_regulations TEXT,
  risk TEXT,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보고서 저장
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  period TEXT NOT NULL,                     -- "2026년 3월"
  content TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 사용량 추적 (비용 제어)
CREATE TABLE api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,                     -- 'analyze', 'report', 'scrape_analyze'
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 설정
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  department TEXT DEFAULT '리스크관리부',
  alert_critical BOOLEAN DEFAULT TRUE,
  alert_department BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  monthly_report BOOLEAN DEFAULT FALSE,
  email TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_regulations_source ON regulations(source);
CREATE INDEX idx_regulations_severity ON regulations(severity);
CREATE INDEX idx_regulations_published ON regulations(published_at DESC);
CREATE INDEX idx_regulation_departments_dept ON regulation_departments(department);
CREATE INDEX idx_regulation_departments_reg ON regulation_departments(regulation_id);
CREATE INDEX idx_api_usage_date ON api_usage(created_at);
CREATE INDEX idx_api_usage_month ON api_usage(DATE_TRUNC('month', created_at));

-- 월간 API 비용 집계 뷰
CREATE VIEW monthly_api_cost AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  SUM(cost_usd) AS total_cost,
  COUNT(*) AS call_count,
  SUM(input_tokens) AS total_input,
  SUM(output_tokens) AS total_output
FROM api_usage
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- RLS (Row Level Security) 활성화
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (규제 데이터는 모든 인증 사용자가 조회 가능)
CREATE POLICY "regulations_read" ON regulations FOR SELECT USING (true);
CREATE POLICY "analyses_read" ON analyses FOR SELECT USING (true);
CREATE POLICY "departments_read" ON regulation_departments FOR SELECT USING (true);

-- 서비스 키로만 쓰기 가능 (스크래퍼용)
CREATE POLICY "regulations_insert" ON regulations FOR INSERT WITH CHECK (true);
CREATE POLICY "analyses_insert" ON analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "analyses_update" ON analyses FOR UPDATE USING (true);
