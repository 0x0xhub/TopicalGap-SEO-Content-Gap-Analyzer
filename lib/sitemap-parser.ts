import { ParsedSitemap, SitemapUrlEntry, HybridSitemapAudit, RawPageRow, RawQueryRow } from './types';
import { cleanText } from './seo-engine';

/**
 * Universal XML Sitemap Parser
 * Handles:
 * - Standard <urlset> with <url><loc>...
 * - <sitemapindex> with nested <sitemap><loc>...
 * - XML namespaces (<xmlns:image>, <xhtml:link>, etc.)
 * - Path depth and category inference
 */
export function parseSitemapXml(xmlContent: string, fileName?: string): ParsedSitemap {
  const urls: SitemapUrlEntry[] = [];
  const categoriesMap = new Map<string, number>();
  const depthDistribution: Record<number, number> = {};
  let latestLastmod: string | undefined;
  let oldestLastmod: string | undefined;

  // Clean XML BOM and normalize whitespace
  const cleanXml = xmlContent.replace(/^\uFEFF/, '').trim();

  // 1. Check if this is a sitemapindex
  const isSitemapIndex = /<sitemapindex[\s>]/i.test(cleanXml);

  // Extract <loc> blocks using regex robust to xml namespaces and formatting
  // Matches both <url> blocks and <sitemap> blocks
  const blockRegex = /<(url|sitemap)[\s\S]*?<\/\1>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(cleanXml)) !== null) {
    const block = blockMatch[0];

    // Extract <loc>
    const locMatch = /<loc>(.*?)<\/loc>/i.exec(block);
    if (!locMatch || !locMatch[1]) continue;

    const loc = locMatch[1].trim();
    if (!loc.startsWith('http://') && !loc.startsWith('https://')) continue;

    // Extract <lastmod>
    const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/i.exec(block);
    const lastmod = lastmodMatch ? lastmodMatch[1].trim() : undefined;

    // Extract <changefreq>
    const changefreqMatch = /<changefreq>(.*?)<\/changefreq>/i.exec(block);
    const changefreq = changefreqMatch ? changefreqMatch[1].trim() : undefined;

    // Extract <priority>
    const priorityMatch = /<priority>(.*?)<\/priority>/i.exec(block);
    const priority = priorityMatch ? parseFloat(priorityMatch[1].trim()) : undefined;

    // Path analysis
    let pathSegments: string[] = [];
    let depth = 0;
    let category = 'Root / Homepage';

    try {
      const parsedUrl = new URL(loc);
      pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      depth = pathSegments.length;

      if (depth === 0) {
        category = 'Homepage';
      } else if (depth >= 1) {
        const firstSegment = decodeURIComponent(pathSegments[0]).toLowerCase();
        // Common directory normalizations
        if (['services', 'service', 'خدمات', 'خدمة'].includes(firstSegment)) {
          category = 'Services';
        } else if (['blog', 'articles', 'news', 'posts', 'مدونة', 'مقالات'].includes(firstSegment)) {
          category = 'Blog / Content';
        } else if (['products', 'product', 'shop', 'منتجات', 'متجر'].includes(firstSegment)) {
          category = 'E-Commerce';
        } else if (['locations', 'cities', 'city', 'مناطق', 'مدن', 'فروع'].includes(firstSegment)) {
          category = 'Local / Cities';
        } else if (['about', 'contact', 'privacy', 'terms', 'من-نحن', 'اتصل-بنا'].includes(firstSegment)) {
          category = 'Institutional / Legal';
        } else {
          category = `Category: /${firstSegment}/`;
        }
      }
    } catch {
      depth = 1;
      category = 'General';
    }

    // Tally categories
    categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);

    // Tally depth
    depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;

    // Track dates
    if (lastmod) {
      if (!latestLastmod || lastmod > latestLastmod) latestLastmod = lastmod;
      if (!oldestLastmod || lastmod < oldestLastmod) oldestLastmod = lastmod;
    }

    urls.push({
      loc,
      lastmod,
      changefreq,
      priority,
      pathSegments,
      depth,
      category
    });
  }

  // Fallback if no <url> or <sitemap> wrapper was found (raw loc listing)
  if (urls.length === 0) {
    const rawLocMatches = cleanXml.matchAll(/<loc>(.*?)<\/loc>/gi);
    for (const m of rawLocMatches) {
      const loc = m[1].trim();
      if (!loc.startsWith('http')) continue;
      urls.push({
        loc,
        pathSegments: [],
        depth: 1,
        category: 'General'
      });
      categoriesMap.set('General', (categoriesMap.get('General') || 0) + 1);
    }
  }

  const categories = Array.from(categoriesMap.entries()).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count);

  return {
    fileName: fileName || (isSitemapIndex ? 'sitemap_index.xml' : 'sitemap.xml'),
    totalUrls: urls.length,
    urls,
    categories,
    depthDistribution,
    latestLastmod,
    oldestLastmod
  };
}

/**
 * Perform Hybrid Sitemap + Google Search Console Synthesis
 * Correlates sitemap URLs with GSC pages to find orphan pages,
 * unindexed gap queries, and category penetration.
 */
export function generateHybridSitemapAudit(
  sitemap: ParsedSitemap,
  rawPages: RawPageRow[],
  rawQueries: RawQueryRow[]
): HybridSitemapAudit {
  // Normalize GSC pages set
  const gscPageMap = new Map<string, { impressions: number; clicks: number }>();
  for (const p of rawPages) {
    const cleanP = normalizeUrlKey(p.page);
    gscPageMap.set(cleanP, { impressions: p.impressions, clicks: p.clicks });
  }

  const orphanSitemapUrls: SitemapUrlEntry[] = [];
  let indexedAndRanking = 0;

  // Category tracking
  const categoryStats = new Map<string, { count: number; impressions: number; clicks: number }>();

  for (const entry of sitemap.urls) {
    const cleanEntryUrl = normalizeUrlKey(entry.loc);
    const gscData = gscPageMap.get(cleanEntryUrl);

    if (gscData && gscData.impressions > 0) {
      indexedAndRanking++;
      const cat = categoryStats.get(entry.category) || { count: 0, impressions: 0, clicks: 0 };
      cat.count++;
      cat.impressions += gscData.impressions;
      cat.clicks += gscData.clicks;
      categoryStats.set(entry.category, cat);
    } else {
      // In sitemap but 0 impressions in GSC!
      orphanSitemapUrls.push(entry);
      const cat = categoryStats.get(entry.category) || { count: 0, impressions: 0, clicks: 0 };
      cat.count++;
      categoryStats.set(entry.category, cat);
    }
  }

  // Detect unindexed gap queries (queries with high impressions that don't match any sitemap page)
  const unindexedGapQueries: string[] = [];
  const sitemapUrlSlugs = sitemap.urls.map(u => cleanText(u.loc));

  for (const q of rawQueries.slice(0, 100)) {
    const cleanQ = cleanText(q.query);
    const hasSitemapMatch = sitemapUrlSlugs.some(slug => slug.includes(cleanQ) || cleanQ.split(' ').some(w => w.length > 3 && slug.includes(w)));
    if (!hasSitemapMatch && q.impressions >= 20) {
      unindexedGapQueries.push(q.query);
    }
  }

  const categoryBreakdown = Array.from(categoryStats.entries()).map(([category, stats]) => ({
    category,
    sitemapCount: stats.count,
    gscImpressions: stats.impressions,
    gscClicks: stats.clicks
  })).sort((a, b) => b.gscImpressions - a.gscImpressions);

  const orphanRate = sitemap.totalUrls > 0 ? ((orphanSitemapUrls.length / sitemap.totalUrls) * 100).toFixed(1) : '0';
  let siteHealthSummary = '';

  if (parseFloat(orphanRate) > 40) {
    siteHealthSummary = `تنبيه تدقيق الفهرسة: هناك ${orphanSitemapUrls.length} صفحة في خريطة الموقع (${orphanRate}%) لا تحقق أي ظهور في جوجل، مما يشير إلى وجود صفحات ضعيفة الجودة (Thin Content) أو صفحات مهجورة بحاجة لإعادة هيكلة.`;
  } else if (parseFloat(orphanRate) > 15) {
    siteHealthSummary = `حالة الفهرسة معتدلة: ${orphanRate}% من صفحات الخريطة في مرحلة الحضانة أو تعاني من ضعف الروابط الداخلية.`;
  } else {
    siteHealthSummary = `كفاءة فهرسة ممتازة: معظم صفحات خريطة الموقع نشطة وتحقق ظهوراً دورياً في نتائج البحث.`;
  }

  return {
    totalSitemapUrls: sitemap.totalUrls,
    totalGscActivePages: rawPages.length,
    indexedAndRankingUrls: indexedAndRanking,
    orphanSitemapUrls: orphanSitemapUrls.slice(0, 50), // top 50 orphans for review
    unindexedGapQueries: unindexedGapQueries.slice(0, 20),
    categoryBreakdown,
    siteHealthSummary
  };
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    // remove protocol, www, trailing slash and query params
    return (u.host.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
  }
}
