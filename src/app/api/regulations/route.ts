/**
 * GET /api/regulations
 * 규제 목록 조회 (부서/출처/심각도 필터)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const db = getSupabaseAdmin();
  const params = req.nextUrl.searchParams;
  const department = params.get('department');
  const source = params.get('source');
  const severity = params.get('severity');
  const limit = parseInt(params.get('limit') || '50');

  let query = db
    .from('regulations')
    .select(`
      *,
      regulation_departments(department),
      analyses(id)
    `)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (source) query = query.eq('source', source);
  if (severity) query = query.eq('severity', severity);

  const { data: regulations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 부서 필터 (join 후 필터)
  let filtered = regulations || [];
  if (department) {
    filtered = filtered.filter(r =>
      r.regulation_departments?.some((d: any) => d.department === department)
    );
  }

  // 응답 정리
  const result = filtered.map(r => ({
    id: r.id,
    title: r.title,
    source: r.source,
    sourceUrl: r.source_url,
    category: r.category,
    status: r.status,
    severity: r.severity,
    context: r.context,
    publishedAt: r.published_at,
    departments: r.regulation_departments?.map((d: any) => d.department) || [],
    hasAnalysis: (r.analyses?.length || 0) > 0,
  }));

  return NextResponse.json(result);
}
