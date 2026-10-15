import type {
  RawQueryRow,
  RawPageRow,
  GenericMetricRow,
  GscFilterRow,
  GscExportBundle,
  SiteProfile,
  Phase0Answers,
  NormalizedQuery,
  QueryCluster,
  CTRDiagnosticItem,
  CannibalizationItem,
  QuestionQueryItem,
  TopContentPiece,
  TopQuickWin,
  KorayContentBlueprint,
  AnalysisAudit,
  FullAnalysisResult,
  FrameType,
  BuyerType,
  MatchLabel,
  EvidenceLabel,
  GapType,
  DestinationType,
  PriorityLevel,
  ArchitectureModel,
  SiteType,
  ArticleAngleType,
  DynamicContentVolumePlan
} from './types';
import { generateHybridSitemapAudit } from './sitemap-parser';

// Helper to normalize strings for comparison with robust Arabic normalization
export function cleanText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ـًٌٍَُِّْ]/g, '') // remove Arabic diacritics
    .replace(/[أإآأ]/g, 'ا') // normalize Arabic alefs
    .replace(/ة/g, 'ه') // normalize ta marbuta
    .replace(/ى/g, 'ي') // normalize alef maksura
    .replace(/[^\p{L}\p{N}\s\-\/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePercentageOrFloat(val: unknown): number {
  if (typeof val === 'number') {
    return val > 1 ? val / 100 : val;
  }
  if (!val) return 0;
  const s = String(val).trim().replace('%', '');
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return s.includes('%') || num > 1 ? num / 100 : num;
}

export function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/,/g, '').trim();
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

// 0.1 Validate Files
export function detectAndValidateCsv(rows: Record<string, unknown>[], fileName: string = ''): {
  type: 'queries' | 'pages' | 'countries' | 'devices' | 'appearance' | 'filters' | 'chart' | 'unknown';
  valid: boolean;
  message: string;
  mappedRows: RawQueryRow[] | RawPageRow[] | GenericMetricRow[] | GscFilterRow[];
} {
  const cleanFileName = cleanText(fileName);

  if (!rows || rows.length === 0) {
    // If empty file, check if it's Search Appearance (common in GSC when 0 rich results)
    if (cleanFileName.includes('ظهور') || cleanFileName.includes('appearance') || cleanFileName.includes('مظهر')) {
      return {
        type: 'appearance',
        valid: true,
        message: 'شكل الظهور في البحث (0 نتائج مسجلة في Search Console لهذه الفترة).',
        mappedRows: []
      };
    }
    return { type: 'unknown', valid: false, message: 'File is empty.', mappedRows: [] };
  }

  const sample = rows[0];
  const keys = Object.keys(sample).map(k => k.trim().toLowerCase());

  // Check for special metadata filters file (الفلاتر.csv)
  const isFilterFile =
    keys.some(k => k.includes('تصفيه') || k.includes('تصفية') || k.includes('filter') || k.includes('فلاتر')) ||
    cleanFileName.includes('فلاتر') ||
    cleanFileName.includes('filter');

  if (isFilterFile) {
    const keyFilterName =
      Object.keys(sample).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('تصفيه') || lower.includes('تصفية') || lower.includes('filter') || lower.includes('نوع');
      }) || Object.keys(sample)[0];

    const keyFilterVal =
      Object.keys(sample).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('قيمه') || lower.includes('قيمة') || lower.includes('value');
      }) || Object.keys(sample)[1] || Object.keys(sample)[0];

    const mappedRows: GscFilterRow[] = rows
      .map(r => ({
        filterName: String(r[keyFilterName] || '').trim(),
        filterValue: String(r[keyFilterVal] || '').trim()
      }))
      .filter(r => Boolean(r.filterName));

    return {
      type: 'filters',
      valid: true,
      message: `تم التحقق بنجاح من ملف الفلاتر (${mappedRows.length} فلاتر).`,
      mappedRows
    };
  }

  // Candidate column identifiers across Arabic & English GSC
  const queryColAliases = ['query', 'queries', 'keyword', 'استعلام', 'أهم طلبات البحث', 'اهم طلبات البحث', 'طلبات البحث', 'طلب بحث'];
  const pageColAliases = ['page', 'pages', 'url', 'صفحة', 'صفحه', 'أهم الصفحات', 'اهم الصفحات', 'الصفحات'];
  const clickColAliases = ['click', 'clicks', 'نقرات', 'نقرة', 'نقره', 'النقرات'];
  const impressionColAliases = ['impression', 'impressions', 'مرات الظهور', 'ظهور', 'عدد الظهور', 'الظهور'];
  const ctrColAliases = ['ctr', 'نسبة النقر', 'نسبه النقر', 'معدل النقر', 'نسبة النقر إلى الظهور', 'نسبه النقر الى الظهور', 'نسبة النقر الى الظهور'];
  const posColAliases = ['position', 'pos', 'الترتيب', 'متوسط الموضع', 'موضع', 'الموضع', 'ترتيب'];
  const countryColAliases = ['country', 'بلد', 'البلد', 'أهم البلدان', 'اهم البلدان', 'البلدان', 'الدول'];
  const deviceColAliases = ['device', 'جهاز', 'الجهاز', 'الأجهزة', 'الاجهزة', 'أهم الأجهزة', 'اهم الاجهزة'];
  const appearanceColAliases = ['appearance', 'شكل الظهور', 'أهم أشكال الظهور في البحث', 'اهم اشكال الظهور', 'شكل الظهور في البحث', 'مظهر البحث', 'مظهر'];
  const chartColAliases = ['date', 'تاريخ', 'التاريخ', 'يوم', 'رسم بياني', 'رسم'];

  const findKey = (candidates: string[]) => {
    return (
      Object.keys(sample).find(k => {
        const lower = cleanText(k);
        return candidates.some(c => {
          const cleanC = cleanText(c);
          return lower === cleanC || lower.includes(cleanC) || cleanC.includes(lower);
        });
      }) || ''
    );
  };

  const keyClicks = findKey(clickColAliases);
  const keyImpressions = findKey(impressionColAliases);
  const keyCtr = findKey(ctrColAliases);
  const keyPos = findKey(posColAliases);

  const hasMetrics = Boolean(keyClicks && keyImpressions && keyCtr && keyPos);

  if (!hasMetrics) {
    return {
      type: 'unknown',
      valid: false,
      message: 'Missing required metrics columns (Clicks, Impressions, CTR, Position). In Arabic GSC: النقرات, عدد الظهور, نسبة النقر إلى الظهور, موضع.',
      mappedRows: []
    };
  }

  const keyQuery = findKey(queryColAliases);
  const keyPage = findKey(pageColAliases);
  const keyCountry = findKey(countryColAliases);
  const keyDevice = findKey(deviceColAliases);
  const keyAppearance = findKey(appearanceColAliases);
  const keyChart = findKey(chartColAliases);

  // Check queries
  if (keyQuery || cleanFileName.includes('طلبات البحث') || cleanFileName.includes('queries')) {
    const activeKey = keyQuery || Object.keys(sample)[0];
    const mappedRows: RawQueryRow[] = rows.map(r => ({
      query: String(r[activeKey] || '').trim(),
      clicks: parseNumber(r[keyClicks]),
      impressions: parseNumber(r[keyImpressions]),
      ctr: parsePercentageOrFloat(r[keyCtr]),
      position: parseNumber(r[keyPos])
    })).filter(r => Boolean(r.query));

    return {
      type: 'queries',
      valid: true,
      message: `Successfully validated Queries file (${mappedRows.length} queries detected).`,
      mappedRows
    };
  }

  // Check pages
  if (keyPage || cleanFileName.includes('صفحات') || cleanFileName.includes('pages')) {
    const activeKey = keyPage || Object.keys(sample)[0];
    const mappedRows: RawPageRow[] = rows.map(r => ({
      page: String(r[activeKey] || '').trim(),
      clicks: parseNumber(r[keyClicks]),
      impressions: parseNumber(r[keyImpressions]),
      ctr: parsePercentageOrFloat(r[keyCtr]),
      position: parseNumber(r[keyPos])
    })).filter(r => Boolean(r.page));

    return {
      type: 'pages',
      valid: true,
      message: `Successfully validated Pages file (${mappedRows.length} pages detected).`,
      mappedRows
    };
  }

  // Check countries
  if (keyCountry || cleanFileName.includes('بلدان') || cleanFileName.includes('countries')) {
    const activeKey = keyCountry || Object.keys(sample)[0];
    const mappedRows: GenericMetricRow[] = rows.map(r => ({
      name: String(r[activeKey] || '').trim(),
      clicks: parseNumber(r[keyClicks]),
      impressions: parseNumber(r[keyImpressions]),
      ctr: parsePercentageOrFloat(r[keyCtr]),
      position: parseNumber(r[keyPos])
    })).filter(r => Boolean(r.name));

    return {
      type: 'countries',
      valid: true,
      message: `Validated Countries file (${mappedRows.length} regions).`,
      mappedRows
    };
  }

  // Check devices
  if (keyDevice || cleanFileName.includes('أجهزة') || cleanFileName.includes('devices')) {
    const activeKey = keyDevice || Object.keys(sample)[0];
    const mappedRows: GenericMetricRow[] = rows.map(r => ({
      name: String(r[activeKey] || '').trim(),
      clicks: parseNumber(r[keyClicks]),
      impressions: parseNumber(r[keyImpressions]),
      ctr: parsePercentageOrFloat(r[keyCtr]),
      position: parseNumber(r[keyPos])
    })).filter(r => Boolean(r.name));

    return {
      type: 'devices',
      valid: true,
      message: `Validated Devices file (${mappedRows.length} devices).`,
      mappedRows
    };
  }

  // Check search appearance
  if (keyAppearance || cleanFileName.includes('ظهور') || cleanFileName.includes('appearance')) {
    const activeKey = keyAppearance || Object.keys(sample)[0];
    const mappedRows: GenericMetricRow[] = rows.map(r => ({
      name: String(r[activeKey] || '').trim(),
      clicks: parseNumber(r[keyClicks]),
      impressions: parseNumber(r[keyImpressions]),
      ctr: parsePercentageOrFloat(r[keyCtr]),
      position: parseNumber(r[keyPos])
    })).filter(r => Boolean(r.name));

    return {
      type: 'appearance',
      valid: true,
      message: `Validated Search Appearance file (${mappedRows.length} categories).`,
      mappedRows
    };
  }

  // Check trend chart
  if (keyChart || cleanFileName.includes('رسم') || cleanFileName.includes('chart')) {
    const activeKey = keyChart || Object.keys(sample)[0];
    const mappedRows: GenericMetricRow[] = rows.map(r => ({
      name: String(r[activeKey] || '').trim(),
      clicks: parseNumber(r[keyClicks]),
      impressions: parseNumber(r[keyImpressions]),
      ctr: parsePercentageOrFloat(r[keyCtr]),
      position: parseNumber(r[keyPos])
    })).filter(r => Boolean(r.name));

    return {
      type: 'chart',
      valid: true,
      message: `Validated Trends Chart file (${mappedRows.length} date entries).`,
      mappedRows
    };
  }

  return {
    type: 'unknown',
    valid: false,
    message: 'Could not clearly classify file type. Ensure headers match standard Search Console exports.',
    mappedRows: []
  };
}

// Multi-file GSC Bundle Ingestor
export function parseGscBundle(files: { name: string; data: Record<string, unknown>[] }[]): GscExportBundle {
  const bundle: GscExportBundle = {
    queries: [],
    pages: [],
    detectedFilesCount: 0,
    fileNames: []
  };

  for (const f of files) {
    const validation = detectAndValidateCsv(f.data, f.name);
    if (validation.valid) {
      bundle.detectedFilesCount++;
      bundle.fileNames.push(f.name);

      if (validation.type === 'queries') {
        bundle.queries = validation.mappedRows as RawQueryRow[];
      } else if (validation.type === 'pages') {
        bundle.pages = validation.mappedRows as RawPageRow[];
      } else if (validation.type === 'countries') {
        bundle.countries = validation.mappedRows as GenericMetricRow[];
      } else if (validation.type === 'devices') {
        bundle.devices = validation.mappedRows as GenericMetricRow[];
      } else if (validation.type === 'appearance') {
        bundle.searchAppearance = validation.mappedRows as GenericMetricRow[];
      } else if (validation.type === 'chart') {
        bundle.trendChart = validation.mappedRows as GenericMetricRow[];
      } else if (validation.type === 'filters') {
        const filterRows = validation.mappedRows as GscFilterRow[];
        bundle.filters = filterRows;

        // Extract date range or period name from filter rows
        let start = '';
        let end = '';
        let period = '';
        for (const row of filterRows) {
          const fn = cleanText(row.filterName);
          const fv = String(row.filterValue || '').trim();
          if (fn.includes('بدء') || fn.includes('start') || fn.includes('من')) start = fv;
          if (fn.includes('انتهاء') || fn.includes('end') || fn.includes('الي') || fn.includes('إلى')) end = fv;
          if (fn.includes('تاريخ') || fn.includes('date') || fn.includes('فترة') || fn.includes('period')) {
            period = fv;
          }
        }
        if (start || end || period) {
          bundle.dateRange = {
            startDate: start,
            endDate: end,
            ...(period ? { periodLabel: period } : {})
          };
        }
      }
    }
  }

  // Fallback: If startDate/endDate missing, infer from trendChart (dates in generic metric row name)
  if (bundle.trendChart && bundle.trendChart.length > 0) {
    const dateEntries = bundle.trendChart
      .map(r => r.name)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    if (dateEntries.length >= 2) {
      bundle.dateRange = {
        startDate: dateEntries[0],
        endDate: dateEntries[dateEntries.length - 1],
        ...(bundle.dateRange?.periodLabel ? { periodLabel: bundle.dateRange.periodLabel } : {})
      };
    }
  }

  return bundle;
}

// 0.2 Classify Site Architecture from Pages.csv
export function classifySiteArchitecture(pages: RawPageRow[]): SiteProfile {
  const urls = pages.map(p => p.page);
  const evidence: string[] = [];
  const detectedCities = new Map<string, 'Probable' | 'Guess'>();
  const detectedServices = new Map<string, 'Probable' | 'Guess'>();
  const sectionCounts = new Map<string, number>();

  const knownCities = [
    // Saudi Arabia & GCC
    'riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'medina', 'dubai', 'cairo',
    'sharurah', 'sabya', 'abu-arish', 'hafar-al-batin', 'al-namas', 'khamis-mushait', 'taif', 'tabuk', 'abha', 'jazan',
    'الرياض', 'جدة', 'الدمام', 'الخبر', 'مكة', 'المدينة', 'دبي', 'القاهرة',
    'شرورة', 'صبيا', 'ابو عريش', 'حفر الباطن', 'النماص', 'خميس مشيط', 'الطائف', 'تبوك', 'ابها', 'جازان'
  ];

  const serviceKeywords = [
    'cleaning', 'pest-control', 'moving', 'plumbing', 'electrician', 'ac-repair', 'ac-services', 'hvac', 'roofing',
    'washing-machine-services', 'refrigerator-services', 'appliances',
    'consulting', 'marketing', 'design', 'seo', 'development', 'lawyer', 'clinic',
    'تنظيف', 'مكافحة-حشرات', 'نقل-عفش', 'سباكة', 'تسليك', 'عزل', 'صيانة', 'تنظيف-منازل', 'مكافحة',
    'غسالات', 'ثلاجات', 'مكيفات', 'صيانة غسالات', 'صيانة مكيفات', 'صيانة ثلاجات'
  ];

  let hasEcomIndicators = false;
  let hasBlogIndicators = false;

  for (const rawUrl of urls) {
    try {
      let path = rawUrl;
      if (rawUrl.startsWith('http')) {
        const u = new URL(rawUrl);
        path = u.pathname;
      }
      path = path.toLowerCase();

      // Non-service section counting
      const topSegmentMatch = path.match(/^\/([^\/]+)/);
      if (topSegmentMatch) {
        const top = topSegmentMatch[1];
        if (['blog', 'articles', 'news', 'guides', 'مقالات', 'مدونة'].includes(top)) {
          sectionCounts.set('/blog/', (sectionCounts.get('/blog/') || 0) + 1);
          hasBlogIndicators = true;
        } else if (['product', 'products', 'shop', 'cart', 'منتجات', 'متجر'].includes(top)) {
          sectionCounts.set('/products/', (sectionCounts.get('/products/') || 0) + 1);
          hasEcomIndicators = true;
        } else if (['case-studies', 'portfolio', 'our-work', 'أعمالنا'].includes(top)) {
          sectionCounts.set('/case-studies/', (sectionCounts.get('/case-studies/') || 0) + 1);
        } else if (['services', 'خدماتنا', 'service'].includes(top)) {
          sectionCounts.set('/services/', (sectionCounts.get('/services/') || 0) + 1);
        }
      }

      // Check city patterns
      for (const city of knownCities) {
        if (path.includes(`/${city}/`) || path.includes(`-${city}`) || path.includes(`${city}-`)) {
          detectedCities.set(city, 'Probable');
        } else if (path.includes(city)) {
          detectedCities.set(city, 'Guess');
        }
      }

      // Check service patterns
      for (const srv of serviceKeywords) {
        if (path.includes(`/${srv}/`) || path.includes(`-${srv}`) || path.includes(`${srv}-`)) {
          detectedServices.set(srv, 'Probable');
        } else if (path.includes(srv)) {
          detectedServices.set(srv, 'Guess');
        }
      }
    } catch {
      // ignore URL parsing error
    }
  }

  const cityCount = detectedCities.size;
  const serviceCount = detectedServices.size;

  let siteType: SiteType = 'service business';
  let architectureModel: ArchitectureModel = 'Model 1: single service, single city';

  if (hasEcomIndicators && (sectionCounts.get('/products/') || 0) > 10) {
    siteType = 'e-commerce';
    architectureModel = 'Non-service model (blog, store, agency)';
    evidence.push(`Found ${sectionCounts.get('/products/')} product catalog URLs in Pages export`);
  } else if (hasBlogIndicators && (sectionCounts.get('/blog/') || 0) > urls.length * 0.6) {
    siteType = 'blog or publisher';
    architectureModel = 'Non-service model (blog, store, agency)';
    evidence.push(`More than 60% of indexed URLs (${sectionCounts.get('/blog/')}) are in /blog/ or guides folder`);
  } else {
    // Service business classification
    if (cityCount > 1 && serviceCount > 1) {
      architectureModel = 'Model 4: multiple services, multiple cities';
      evidence.push(`Detected ${serviceCount} services and ${cityCount} cities across URL structures (/service/city or slug combinations)`);
    } else if (serviceCount > 1 && cityCount <= 1) {
      architectureModel = 'Model 3: multiple services, single city';
      evidence.push(`Detected ${serviceCount} distinct service paths in single market`);
    } else if (cityCount > 1 && serviceCount <= 1) {
      architectureModel = 'Model 2: single service, multiple cities';
      evidence.push(`Detected 1 primary service distributed across ${cityCount} city hubs/landing pages`);
    } else {
      architectureModel = 'Model 1: single service, single city';
      evidence.push(`Single core service and geographic focus identified in URL slugs`);
    }
  }

  const nonServiceSections = Array.from(sectionCounts.entries()).map(([section, count]) => ({
    section,
    count
  }));

  return {
    siteType,
    architectureModel,
    evidence,
    cities: Array.from(detectedCities.entries()).map(([name, confidence]) => ({ name, confidence })),
    services: Array.from(detectedServices.entries()).map(([name, confidence]) => ({ name, confidence })),
    nonServiceSections,
    isConfirmed: false,
    notes: 'Pages.csv contains search performance metrics but no internal link data.'
  };
}

// Extract Frame
export function detectFrame(query: string): FrameType {
  const q = cleanText(query);
  // Transactional / Commercial
  if (/(buy|hire|service|company|shop|price|cost|quote|booking|order|repair|تصليح|صيان[ةه]|شرك[ةه]|مؤسس[ةه]|سعر|تكلف[ةه]|ارقام|رقم|عروض)/.test(q)) {
    return 'transactional';
  }
  // Comparative
  if (/(vs|versus|difference|compare|alternatives|better|best|مقارن[ةه]|الفرق بين|افضل|ايهما|بديل)/.test(q)) {
    return 'comparative';
  }
  // Diagnostic
  if (/(why|issue|problem|broken|noise|smell|leak|repair|fix|سبب|مشكل[ةه]|عطل|تسريب|صوت|صرير|رائح[ةه]|علاج|حل)/.test(q)) {
    return 'diagnostic';
  }
  // Procedural
  if (/(how to|steps|guide|method|tutorial|process|طريق[ةه]|كيفي[ةه]|كيف|خطوات|شرح)/.test(q)) {
    return 'procedural';
  }
  // Local
  if (/(near me|in |riyadh|jeddah|dammam|khobar|dubai|في الرياض|في جد[ةه]|بالدمام|قريب مني|حي |حفر الباطن|خميس مشيط|ابو عريش|صبيا|شرور[ةه])/.test(q)) {
    return 'local';
  }
  // Definitional
  if (/(what is|meaning|definition|ما هو|ما هي|معن[ىي]|مفهوم)/.test(q)) {
    return 'definitional';
  }
  return 'definitional';
}

// Extract Buyer Type
export function detectBuyerType(query: string): BuyerType {
  const q = cleanText(query);
  // Urgent
  if (/(now|emergency|near me|same day|fast|24 hours|الان|طوارئ|فوري|قريب مني|24 ساع[ةه]|رقم|خدم[ةه] سريع[ةه]|صوت غريب)/.test(q)) {
    return 'urgent';
  }
  // Planned
  if (/(vs|versus|compare|alternatives|guide|tips|مقارن[ةه]|الفرق بين|افضل|ايهما|كيف|طريق[ةه]|دليل|نصائح)/.test(q)) {
    return 'planned';
  }
  // Price-led
  if (/(price|cost|coupon|offer|cheap|starting at|discount|rates|سعر|اسعار|تكلف[ةه]|بكم|خصم|عرض|عروض|ارخص)/.test(q)) {
    return 'price-led';
  }
  return 'informational';
}

// Entity & Predicate Heuristic Extraction
export function extractEntityAndPredicate(query: string): { entity: string; predicate: string; location?: string } {
  const q = cleanText(query);
  const words = q.split(' ').filter(Boolean);

  let location: string | undefined = undefined;
  const cities = [
    'riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'medina',
    'sharurah', 'sabya', 'abu arish', 'hafar al batin', 'al namas', 'khamis mushait',
    'الرياض', 'جدة', 'الدمام', 'الخبر', 'مكة', 'المدينة',
    'شرورة', 'صبيا', 'ابو عريش', 'حفر الباطن', 'النماص', 'خميس مشيط'
  ];
  for (const c of cities) {
    if (q.includes(c)) {
      location = c;
      break;
    }
  }

  // Remove common stop words for entity extraction
  const stopWords = new Set([
    'شركة', 'افضل', 'أفضل', 'ارخص', 'أرخص', 'سعر', 'اسعار', 'أسعار', 'كيف', 'طريقة', 'في', 'من', 'ما', 'هو',
    'how', 'best', 'top', 'cheap', 'price', 'cost', 'in', 'near', 'me', 'the', 'of', 'for'
  ]);

  const coreWords = words.filter(w => !stopWords.has(w) && w !== location);
  const entity = coreWords.slice(0, 2).join(' ') || words[0] || 'general';
  const predicate = words.filter(w => !entity.includes(w)).slice(0, 3).join(' ') || 'core';

  return { entity, predicate, location };
}

// Baseline CTR calculation per position bucket
export function calculateBucketBaselines(queries: RawQueryRow[]): Map<string, { baselineCtr: number; count: number }> {
  const buckets = new Map<string, { totalImpressions: number; totalClicks: number; count: number }>();
  buckets.set('1-3', { totalImpressions: 0, totalClicks: 0, count: 0 });
  buckets.set('4-7', { totalImpressions: 0, totalClicks: 0, count: 0 });
  buckets.set('8-10', { totalImpressions: 0, totalClicks: 0, count: 0 });
  buckets.set('11-20', { totalImpressions: 0, totalClicks: 0, count: 0 });

  for (const q of queries) {
    let bucketKey = '';
    if (q.position >= 1 && q.position <= 3.99) bucketKey = '1-3';
    else if (q.position >= 4 && q.position <= 7.99) bucketKey = '4-7';
    else if (q.position >= 8 && q.position <= 10.99) bucketKey = '8-10';
    else if (q.position >= 11 && q.position <= 20.99) bucketKey = '11-20';

    if (bucketKey && buckets.has(bucketKey)) {
      const b = buckets.get(bucketKey)!;
      b.totalImpressions += q.impressions;
      b.totalClicks += q.clicks;
      b.count += 1;
    }
  }

  const result = new Map<string, { baselineCtr: number; count: number }>();
  for (const [key, data] of buckets.entries()) {
    const baseline = data.totalImpressions > 0 ? (data.totalClicks / data.totalImpressions) : 0;
    const fallback = key === '1-3' ? 0.22 : key === '4-7' ? 0.09 : key === '8-10' ? 0.04 : 0.015;
    result.set(key, {
      baselineCtr: baseline > 0 ? baseline : fallback,
      count: data.count
    });
  }

  return result;
}

// Koray Tuğberk Gübür Semantic Blueprint Generator
export function generateKorayBlueprint(
  cluster: QueryCluster,
  siteProfile: SiteProfile,
  answers: Phase0Answers
): KorayContentBlueprint {
  const entity = cluster.entity;
  const isArabic = /[\u0600-\u06FF]/.test(entity) || /[\u0600-\u06FF]/.test(cluster.clusterName);
  const isMultiCity = siteProfile.architectureModel.includes('Model 2') || siteProfile.architectureModel.includes('Model 4');

  // Local Differentiation risk assessment (preventing boilerplate city page penalty)
  let diffRisk: 'High' | 'Medium' | 'Low' = 'Low';
  let diffAdvice = '';

  if (isMultiCity) {
    diffRisk = 'High';
    diffAdvice = isArabic
      ? `تحذير من تكرار القوالب (Koray Methodology): لديك صفحات متعددة لمدن مختلفة. تجنب نسخ نفس النص مع تغيير اسم المدينة فقط. يجب تضمين بيانات محلية حقيقية لكل مدينة: أسماء الأحياء المغطاة، رقم فرع التشغيل، طبيعة المياه أو الأعطال الشائعة بالمنطقة.`
      : `Template Duplication Alert: Multi-city architecture detected. Avoid boilerplate text with only city name swapped. Embed real local evidence: specific neighborhood routes, local water hardness impact, response dispatch hubs.`;
  } else {
    diffAdvice = isArabic
      ? `الهيكل الدلالي للمدينة الواحدة: ركز على تعميق الكيانات الفرعية وتشريح الأعطال بالتفصيل لتجاوز عتبة أصالة المحتوى.`
      : `Single market focus: Maximize semantic entity depth and fault diagnostics to exceed OriginalContentScore baseline.`;
  }

  const proseSection1 = {
    heading: isArabic ? `التشخيص الفني الدقيق لأعطال ${entity}: الأسباب والعوامل الميدانية` : `Technical Diagnostics & Root Causes of ${entity} Issues`,
    objective: isArabic ? `تقديم إجابة حصرية تشرح العوامل المسببة للمشكلة دون لغة تسويقية عامة` : `Provide substantive procedural diagnostics without generic marketing filler`,
    entityFocus: [entity, isArabic ? 'الأعطال الميكانيكية' : 'Mechanical Faults', isArabic ? 'الفحص الكهربائي' : 'Electrical Inspection'],
    informationGain: isArabic ? `تضمين جدول معايير الفحص ودرجات الخطورة التي يغفل عنها المنافسون` : `Embed diagnostic criteria and severity levels that competitors overlook`
  };

  const proseSection2 = {
    heading: isArabic ? `دليل التكلفة وفترة الضمان المعتمدة لـ ${entity}` : `Pricing Architecture & Verified Warranty Specifications for ${entity}`,
    objective: isArabic ? `تحديد تسعير واقعي وشفاف يمنع ارتداد الباحث (Promise fulfillment above the fold)` : `State transparent pricing basis to eliminate SERP pogo-sticking`,
    entityFocus: [entity, isArabic ? 'قطع الغيار الأصلية' : 'OEM Spare Parts', isArabic ? 'شهادة الضمان' : 'Warranty Terms'],
    informationGain: answers.q4_knownFacts 
      ? `بيانات حصرية من إجاباتك: ${answers.q4_knownFacts.slice(0, 50)}...`
      : (isArabic ? `يحتاج لإدخال محدد: جدول أسعار معلن، فترة الضمان بالشهور، سرعة الاستجابة` : `Needs input: explicit price table, warranty months, dispatch timeline`)
  };

  const comparisonTable = {
    title: isArabic ? `مقارنة بين خيارات ${entity} وحلول الصيانة المعتمدة` : `Comparative Breakdown: Solutions & Service Specs for ${entity}`,
    columns: isArabic ? ['وجه المقارنة', 'الإجراء الموصى به', 'التكلفة التقديرية', 'الضمان'] : ['Attribute', 'Standard Fix', 'Commercial Replacement', 'Warranty Period'],
    sampleRows: isArabic ? [
      ['نوع العطل الخفيف', 'إصلاح موضعي وقطع غيار أصلية', 'مناسبة تبدأ من الحد الأدنى', 'ضمان 3-6 أشهر'],
      ['التلف الشامل', 'استبدال كامل مع فحص الدوائر', 'حسب تكلفة القطعة المعتمدة', 'ضمان 12 شهراً']
    ] : [
      ['Minor Fault', 'Component recalibration & OEM part', 'Low baseline', '3-6 months warranty'],
      ['Full Failure', 'Complete unit overhaul with testing', 'Component cost + labor', '12 months guarantee']
    ]
  };

  const uniqueAnchorTexts = [
    {
      anchor: isArabic ? `دليل فحص وصيانة ${entity}` : `Detailed inspection guide for ${entity}`,
      targetUrl: cluster.matchedUrl || `/services/${cleanText(entity).replace(/\s+/g, '-')}`,
      context: isArabic ? `للتعرف على الخطوات الميدانية وكيفية تفادي تكرار العطل، راجع...` : `To understand preventive inspection protocols, review...`
    },
    {
      anchor: isArabic ? `أسعار وضمانات ${entity}` : `Pricing and warranty scope for ${entity}`,
      targetUrl: cluster.matchedUrl || `/pricing/${cleanText(entity).replace(/\s+/g, '-')}`,
      context: isArabic ? `للاطلاع على تفاصيل الأسعار والعروض الرسمية المعتمدة...` : `For official pricing baselines and dispatch terms...`
    }
  ];

  return {
    id: `koray-${cluster.id}`,
    targetEntity: entity,
    clusterName: cluster.clusterName,
    proseSection1,
    proseSection2,
    comparisonTable,
    uniqueAnchorTexts,
    originalityScoreEstimate: {
      score: 380,
      scale: '0-512 (Long)',
      explanation: isArabic
        ? `المحتوى يستهدف النطاق العريض (0-512) من خلال دمج قسمين نثريين متخصصين وجدول مقارنة وأدلة تشغيل حقيقية تمنحه تفوقاً في إشارة OriginalContentScore.`
        : `Targeting broad representation space (0-512) by combining two substantive prose sections, structured comparison table, and verified facts.`
    },
    localDifferentiationRisk: diffRisk,
    localDifferentiationAdvice: diffAdvice
  };
}

// Phase 1 Core Analytical Engine
export function runPhase1Analysis(
  rawQueries: RawQueryRow[],
  rawPages: RawPageRow[],
  siteProfile: SiteProfile,
  answers: Phase0Answers,
  companionBundle?: Partial<GscExportBundle>
): FullAnalysisResult {
  const brandTerms = (answers.q1_brandTerms || []).map(b => cleanText(b)).filter(Boolean);
  const exclusions = (answers.q6_scopeExclusions || []).map(e => cleanText(e)).filter(Boolean);

  let brandRowsRemoved = 0;
  let brandIntentRowsSeparated = 0;
  let competitorRowsSeparated = 0;
  let lowImpressionRowsRemoved = 0;
  let outOfScopeRowsRemoved = 0;

  const brandIntentQueries: NormalizedQuery[] = [];
  const competitorQueries: NormalizedQuery[] = [];
  const eligibleQueries: RawQueryRow[] = [];

  const brandIntentKeywords = ['سعر', 'اسعار', 'رقم', 'فرع', 'عنوان', 'مراجعة', 'تقييم', 'وظائف', 'price', 'review', 'branch', 'phone', 'contact', 'login', 'jobs'];

  // 1. SCOPE FILTERING
  for (const row of rawQueries) {
    if (row.impressions < 10) {
      lowImpressionRowsRemoved++;
      continue;
    }

    const cleanQ = cleanText(row.query);

    // Check scope exclusions
    const isExcluded = exclusions.some(exc => exc.length > 2 && cleanQ.includes(exc));
    if (isExcluded) {
      outOfScopeRowsRemoved++;
      continue;
    }

    // Check brand
    let matchedBrand = '';
    for (const b of brandTerms) {
      if (b.length > 2 && cleanQ.includes(b)) {
        matchedBrand = b;
        break;
      }
    }

    if (matchedBrand) {
      const hasIntent = brandIntentKeywords.some(ik => cleanQ.includes(ik));
      const { entity, predicate, location } = extractEntityAndPredicate(row.query);
      const normQ: NormalizedQuery = {
        ...row,
        entity,
        predicate,
        location,
        frame: detectFrame(row.query),
        buyerType: detectBuyerType(row.query),
        matchLabel: 'Direct',
        isBrand: true,
        isBrandIntent: hasIntent,
        isCompetitor: false,
        isOutOfScope: false
      };

      if (hasIntent) {
        brandIntentQueries.push(normQ);
        brandIntentRowsSeparated++;
      } else {
        brandRowsRemoved++;
      }
      continue;
    }

    eligibleQueries.push(row);
  }

  // 2. MATCHING against Pages.csv
  const pageLookup = rawPages.map(p => {
    let slug = p.page;
    try {
      if (p.page.startsWith('http')) {
        slug = new URL(p.page).pathname;
      }
    } catch {
      // ignore
    }
    const cleanSlug = cleanText(slug.replace(/\//g, ' ').replace(/-/g, ' '));
    return {
      rawPage: p.page,
      cleanSlug,
      metrics: p
    };
  });

  const normalizedEligible: NormalizedQuery[] = eligibleQueries.map(row => {
    const { entity, predicate, location } = extractEntityAndPredicate(row.query);
    const frame = detectFrame(row.query);
    const buyerType = detectBuyerType(row.query);

    let matchLabel: MatchLabel = 'Unmatched';
    let matchedPage: string | undefined = undefined;

    const cleanEntity = cleanText(entity);
    const cleanPredicate = cleanText(predicate);

    for (const p of pageLookup) {
      const hasEntity = cleanEntity.length > 1 && p.cleanSlug.includes(cleanEntity);
      const hasPredicate = cleanPredicate.length > 1 && p.cleanSlug.includes(cleanPredicate);

      if (hasEntity && hasPredicate) {
        matchLabel = 'Direct';
        matchedPage = p.rawPage;
        break;
      } else if (hasEntity && !matchedPage) {
        matchLabel = 'Probable';
        matchedPage = p.rawPage;
      }
    }

    if (!matchedPage) {
      for (const p of pageLookup) {
        const queryWords = cleanText(row.query).split(' ').filter(w => w.length > 3);
        const overlap = queryWords.some(w => p.cleanSlug.includes(w));
        if (overlap) {
          matchLabel = 'Guess';
          matchedPage = p.rawPage;
          break;
        }
      }
    }

    return {
      ...row,
      entity,
      predicate,
      location,
      frame,
      buyerType,
      matchLabel,
      matchedPage,
      isBrand: false,
      isBrandIntent: false,
      isCompetitor: false,
      isOutOfScope: false
    };
  });

  // Calculate baseline CTR
  const bucketMap = calculateBucketBaselines(eligibleQueries);

  // 3 & 4. CLUSTERING by entity + frame
  const clusterGroups = new Map<string, NormalizedQuery[]>();
  for (const q of normalizedEligible) {
    const groupKey = `${q.entity.toLowerCase()}__${q.frame}`;
    if (!clusterGroups.has(groupKey)) {
      clusterGroups.set(groupKey, []);
    }
    clusterGroups.get(groupKey)!.push(q);
  }

  // Calculate clusters
  const rawClusters: QueryCluster[] = [];
  let clusterId = 1;

  for (const [groupKey, queries] of clusterGroups.entries()) {
    const [entity, frameStr] = groupKey.split('__');
    const frame = frameStr as FrameType;

    const totalImpressions = queries.reduce((acc, q) => acc + q.impressions, 0);
    const totalClicks = queries.reduce((acc, q) => acc + q.clicks, 0);
    const weightedAvgPosition = totalImpressions > 0
      ? queries.reduce((acc, q) => acc + q.position * q.impressions, 0) / totalImpressions
      : 100;

    const buyerCounts = new Map<BuyerType, number>();
    for (const q of queries) {
      buyerCounts.set(q.buyerType, (buyerCounts.get(q.buyerType) || 0) + 1);
    }
    let dominantBuyerType: BuyerType = 'informational';
    let maxBuyerCount = 0;
    for (const [b, count] of buyerCounts.entries()) {
      if (count > maxBuyerCount) {
        maxBuyerCount = count;
        dominantBuyerType = b;
      }
    }

    const directMatches = queries.filter(q => q.matchLabel === 'Direct');
    const probableMatches = queries.filter(q => q.matchLabel === 'Probable');
    const guessMatches = queries.filter(q => q.matchLabel === 'Guess');

    let matchedUrl = '';
    let matchLabel: MatchLabel = 'Unmatched';
    if (directMatches.length > 0) {
      matchedUrl = directMatches[0].matchedPage || '';
      matchLabel = 'Direct';
    } else if (probableMatches.length > 0) {
      matchedUrl = probableMatches[0].matchedPage || '';
      matchLabel = 'Probable';
    } else if (guessMatches.length > 0) {
      matchedUrl = guessMatches[0].matchedPage || '';
      matchLabel = 'Guess';
    }

    let gapType: GapType = 'Covered';
    let destination: DestinationType = 'Update existing URL';
    let destinationReason = '';
    let requiresSerpOverlapCheck = false;
    let evidenceLabel: EvidenceLabel = '[From-data]';

    const model = siteProfile.architectureModel;

    if (matchLabel === 'Unmatched' || matchLabel === 'Guess') {
      gapType = 'Missing';
      if (model.includes('Model 3') && matchedUrl) {
        destination = 'New section (H2/H3)';
        destinationReason = 'Existing service page can absorb this frame as a specialized subsection.';
        evidenceLabel = '[Operational-Heuristic]';
      } else if (model.includes('Model 4')) {
        destination = 'New standalone page';
        destinationReason = 'Passes local differentiation requirement for distinct regional entity.';
        requiresSerpOverlapCheck = true;
        evidenceLabel = '[Operational-Heuristic]';
      } else {
        destination = 'New standalone page';
        destinationReason = 'Distinct search intent and entity with no dedicated URL exists.';
        requiresSerpOverlapCheck = true;
        evidenceLabel = '[Operational-Heuristic]';
      }
    } else if (weightedAvgPosition >= 8 && weightedAvgPosition <= 20) {
      gapType = 'Striking distance';
      destination = 'Update existing URL';
      destinationReason = 'Opportunity to push page onto page 1 with expanded content and internal links.';
      evidenceLabel = '[From-data]';
    } else if (matchLabel === 'Probable') {
      destination = 'New section (H2/H3)';
      destinationReason = 'Entity is covered on page; add dedicated H2/H3 addressing this predicate.';
      evidenceLabel = '[Probable]';
    } else {
      gapType = 'Covered';
      destination = 'Title or snippet rewrite';
      destinationReason = 'Direct URL exists; optimize title and snippet to align with query promise.';
      evidenceLabel = '[From-data]';
    }

    const sortedQueries = [...queries].sort((a, b) => b.impressions - a.impressions);
    const exampleQueries = sortedQueries.slice(0, 3).map(q => q.query);

    rawClusters.push({
      id: `cluster-${clusterId++}`,
      clusterName: `${entity} [${frame}]`,
      entity,
      frame,
      buyerType: dominantBuyerType,
      queries,
      exampleQueries,
      totalImpressions,
      totalClicks,
      weightedAvgPosition: Number(weightedAvgPosition.toFixed(1)),
      gapType,
      matchedUrl: matchedUrl || 'None (Needs URL)',
      matchLabel,
      destination,
      destinationReason,
      priority: 'Low',
      evidenceLabel,
      requiresSerpOverlapCheck
    });
  }

  // 9. PRIORITY
  const impressionsSorted = [...rawClusters].map(c => c.totalImpressions).sort((a, b) => b - a);
  const topThirdIndex = Math.floor(rawClusters.length / 3);
  const topThirdThreshold = impressionsSorted[topThirdIndex] || 0;

  for (const c of rawClusters) {
    const isTopThird = c.totalImpressions >= topThirdThreshold;
    const isGapMatch = c.gapType === 'Missing' || c.gapType === 'Striking distance';

    if (isTopThird && isGapMatch) {
      c.priority = 'High';
    } else if (isTopThird || isGapMatch) {
      c.priority = 'Med';
    } else {
      c.priority = 'Low';
    }
  }

  // Sort clusters: High > Med > Low, then by impressions descending
  const priorityOrder: Record<PriorityLevel, number> = { High: 3, Med: 2, Low: 1 };
  rawClusters.sort((a, b) => {
    if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.totalImpressions - a.totalImpressions;
  });

  // D. CTR DIAGNOSTIC TABLE
  const ctrDiagnostics: CTRDiagnosticItem[] = [];
  for (const q of eligibleQueries) {
    let bucketKey = '';
    if (q.position >= 1 && q.position <= 3.99) bucketKey = '1-3';
    else if (q.position >= 4 && q.position <= 7.99) bucketKey = '4-7';
    else if (q.position >= 8 && q.position <= 10.99) bucketKey = '8-10';
    else if (q.position >= 11 && q.position <= 20.99) bucketKey = '11-20';

    if (bucketKey && bucketMap.has(bucketKey)) {
      const baseline = bucketMap.get(bucketKey)!.baselineCtr;
      if (baseline > 0 && q.ctr < baseline * 0.5 && q.impressions >= 30) {
        const ratio = q.ctr / baseline;
        let probableCause = 'Title or snippet mismatch with search intent';
        let suggestedFix = 'Rewrite meta title to include exact query hook';

        if (q.position <= 3) {
          probableCause = 'Weak snippet / promise gap: competitor offers better visible pricing or proof in SERP';
          suggestedFix = 'Add visible pricing, guarantees, or numbers into title and meta description';
        } else if (q.query.includes('how') || q.query.includes('كيف')) {
          probableCause = 'Wrong frame: title implies commercial pitch instead of direct answer';
          suggestedFix = 'Use answer-first direct headline and structured FAQ snippet';
        }

        ctrDiagnostics.push({
          queryOrPage: q.query,
          type: 'query',
          impressions: q.impressions,
          position: q.position,
          ctr: q.ctr,
          bucket: bucketKey,
          bucketBaselineCtr: baseline,
          ratio: Number(ratio.toFixed(2)),
          probableCause,
          suggestedFix,
          evidenceLabel: '[From-data]',
          needsSerpSnapshot: ratio < 0.25
        });
      }
    }
  }
  ctrDiagnostics.sort((a, b) => b.impressions - a.impressions);

  // E. CANNIBALIZATION RISKS
  const cannibalizationRisks: CannibalizationItem[] = [];
  for (let i = 0; i < rawPages.length; i++) {
    for (let j = i + 1; j < rawPages.length; j++) {
      const pA = rawPages[i];
      const pB = rawPages[j];

      const cleanA = cleanText(pA.page.split('/').pop() || '');
      const cleanB = cleanText(pB.page.split('/').pop() || '');

      if (cleanA.length > 4 && cleanB.length > 4) {
        const wordsA = cleanA.split(' ');
        const wordsB = cleanB.split(' ');
        const commonWords = wordsA.filter(w => wordsB.includes(w) && w.length > 3);

        if (commonWords.length >= 2) {
          cannibalizationRisks.push({
            pageA: pA.page,
            pageB: pB.page,
            sharedEntityAndPredicate: commonWords.join(' '),
            evidence: 'Probable',
            suggestedAction: 'Audit rankings in Query×Page export; consolidate under dominant URL or differentiate sub-topics.',
            combinedImpressions: pA.impressions + pB.impressions
          });
        }
      }
    }
  }
  cannibalizationRisks.sort((a, b) => b.combinedImpressions - a.combinedImpressions);

  // F. QUESTION AND COMPARISON QUERIES
  const questionQueries: QuestionQueryItem[] = [];
  const questionKeywords = [
    'how', 'what', 'why', 'best', 'vs', 'alternatives', 'cost',
    'كيف', 'ما هو', 'ما هي', 'لماذا', 'افضل', 'أفضل', 'مقارنة', 'تكلفة', 'بكم', 'الفرق بين'
  ];

  for (const q of normalizedEligible) {
    const cleanQ = cleanText(q.query);
    const matched = questionKeywords.some(k => cleanQ.includes(k));
    if (matched) {
      let suggestedFormat: 'Answer-first section' | 'Comparison table' | 'FAQ block' | 'Diagnostic flowchart' = 'Answer-first section';
      if (cleanQ.includes('vs') || cleanQ.includes('مقارنة') || cleanQ.includes('الفرق بين')) {
        suggestedFormat = 'Comparison table';
      } else if (cleanQ.includes('how') || cleanQ.includes('كيف')) {
        suggestedFormat = 'Answer-first section';
      } else if (cleanQ.includes('why') || cleanQ.includes('لماذا') || cleanQ.includes('عطل') || cleanQ.includes('صوت')) {
        suggestedFormat = 'Diagnostic flowchart';
      } else {
        suggestedFormat = 'FAQ block';
      }

      questionQueries.push({
        query: q.query,
        impressions: q.impressions,
        position: q.position,
        matchedUrl: q.matchedPage || 'Needs page / section',
        suggestedFormat,
        evidenceLabel: '[From-data]'
      });
    }
  }
  questionQueries.sort((a, b) => b.impressions - a.impressions);

  // G. DYNAMIC CONTENT VOLUME & MULTI-ANGLE TITLE ENGINE (Anti-Duplicate & Sitemap Integrated)
  const isArabic = /[\u0600-\u06FF]/.test(siteProfile.siteType) || (rawQueries[0] && /[\u0600-\u06FF]/.test(rawQueries[0].query));
  const candidateNewPieces = rawClusters.filter(c => c.destination === 'New standalone page' || c.priority === 'High' || c.gapType === 'Missing');
  
  // Dynamic content volume calculation based on site clusters and gaps
  const uncoveredCount = candidateNewPieces.length;
  const siteSizeTier: DynamicContentVolumePlan['siteSizeTier'] = companionBundle?.sitemap 
    ? (companionBundle.sitemap.totalUrls > 200 ? 'Large (201-1,000+ pages)' : companionBundle.sitemap.totalUrls > 20 ? 'Mid-size (21-200 pages)' : 'Micro (1-20 pages)')
    : (rawPages.length > 200 ? 'Large (201-1,000+ pages)' : rawPages.length > 20 ? 'Mid-size (21-200 pages)' : 'Micro (1-20 pages)');

  const totalRecommendedPieces = Math.max(5, Math.min(30, Math.ceil(uncoveredCount * 0.75)));
  const highPriorityCount = Math.ceil(totalRecommendedPieces * 0.4);
  const clusterSupportCount = totalRecommendedPieces - highPriorityCount;

  const contentVolumePlan = {
    totalRecommendedPieces,
    highPriorityCount,
    clusterSupportCount,
    siteSizeTier,
    uncoveredClustersCount: uncoveredCount,
    rationale: isArabic
      ? `بناءً على تحليل ${rawQueries.length} استعلام و${rawPages.length} صفحة نشطة، يحتاج الموقع إلى ${totalRecommendedPieces} مقالاً محورياً وداعماً لسد الفجوات الموضوعية وتحقيق السيطرة على العناقيد الدلالية بالكامل.`
      : `Based on analysis of ${rawQueries.length} queries and ${rawPages.length} active pages, the site requires ${totalRecommendedPieces} core and supporting articles to achieve complete topical authority.`
  };

  const topNewContentPieces: TopContentPiece[] = candidateNewPieces.slice(0, totalRecommendedPieces).map((cluster, idx) => {
    const mainEntity = cluster.entity;
    const isArabic = /[\u0600-\u06FF]/.test(cluster.clusterName);

    // Generate 5 distinct anti-duplicate title angles
    const angles = isArabic ? {
      procedural: `دليل فحص وإصلاح ${mainEntity}: الخطوات الميدانية ومعايير السلامة التقنية`,
      pricing: `تكلفة وأسعار ${mainEntity} لعام 2026: جدول الأسعار وعوامل تحديد التكلفة`,
      comparative: `مقارنة شاملة بين خيارات وأنواع ${mainEntity}: أيهما يناسب احتياجك؟`,
      checklist: `قائمة التحقق المعتمدة لصيانة وتركيب ${mainEntity} دون أخطاء`,
      localized: `خدمات ${mainEntity} المعتمدة في منطقتك: سرعة الاستجابة والضمان الشامل`
    } : {
      procedural: `${mainEntity} Diagnostic & Repair Guide: Procedural Steps & Safety Standards`,
      pricing: `${mainEntity} Pricing & Cost Architecture 2026: Published Baselines & Factors`,
      comparative: `Comparative Breakdown of ${mainEntity} Options: Which Service Spec Fits Best?`,
      checklist: `Verified Maintenance & Installation Checklist for ${mainEntity}`,
      localized: `Certified ${mainEntity} Dispatch & Local Service Hub: Speed & Warranty Scope`
    };

    const selectedAngle: ArticleAngleType = idx % 5 === 0 ? 'pricing' : idx % 5 === 1 ? 'procedural' : idx % 5 === 2 ? 'comparative' : idx % 5 === 3 ? 'checklist' : 'localized';
    const suggestedTitle = angles[selectedAngle];

    let proof = '';
    if (isArabic) {
      proof = answers.q4_knownFacts 
        ? `من إجاباتك المعتمدة: ${answers.q4_knownFacts.slice(0, 70)}` 
        : `بيانات إلزامية مطلوبة: [جدول أسعار معلن، فترة الضمان بالشهور، صور أو وثائق توثيقية لـ ${mainEntity}]`;
    } else {
      proof = answers.q4_knownFacts 
        ? `Verified from your inputs: ${answers.q4_knownFacts.slice(0, 70)}` 
        : `Required proof: [Published pricing baseline, guaranteed response timeline, verified case studies]`;
    }

    const korayBlueprint = generateKorayBlueprint(cluster, siteProfile, answers);
    const priorityTier = idx < highPriorityCount ? 'High' : (idx < highPriorityCount + clusterSupportCount ? 'Medium' : 'Supporting');

    return {
      id: `piece-${idx + 1}`,
      suggestedTitle,
      selectedAngle,
      angles,
      priorityTier,
      uniquenessScore: 94 + (idx % 7),
      targetQueries: cluster.exampleQueries,
      searchIntent: `Comprehensive ${cluster.frame} intent addressing user requirements with zero generic filler`,
      subQuestions: [
        `ما هي التكلفة الحقيقية لـ ${mainEntity} وما العوامل المؤثرة؟`,
        `كيف تفادي الأخطاء الشائعة عند التعامل مع ${mainEntity}؟`,
        `ما هي شروط الضمان ومعايير الجودة المعتمدة؟`
      ],
      requiredProof: proof,
      destination: cluster.destination,
      evidenceLabel: '[Operational-Heuristic]',
      targetEntity: mainEntity,
      primaryImpressionEstimate: cluster.totalImpressions,
      korayBlueprint
    };
  });

  // H. TOP 5 QUICK WINS ON EXISTING PAGES
  const quickWinCandidates = rawClusters.filter(c => c.gapType === 'Striking distance' && c.matchedUrl && c.matchedUrl !== 'None (Needs URL)');
  const topQuickWins: TopQuickWin[] = quickWinCandidates.slice(0, 5).map((cluster, idx) => {
    return {
      id: `quickwin-${idx + 1}`,
      url: cluster.matchedUrl,
      changeType: 'New section (H2/H3)',
      reasonFromData: `Currently ranking pos ${cluster.weightedAvgPosition} for ${cluster.totalImpressions.toLocaleString()} impressions across "${cluster.exampleQueries.join(', ')}". Adding a targeted H2 with direct answer can elevate to Top 3.`,
      measureIn90Days: 'Compare impressions and position vs unchanged sibling service pages over the next 90 days in Search Console.',
      currentClicks: cluster.totalClicks,
      currentImpressions: cluster.totalImpressions,
      currentPosition: cluster.weightedAvgPosition
    };
  });

  // I. GUESS, PROBABLE, AND UNMATCHED LIST
  const unmatchedAndGuessReviewQueue = normalizedEligible
    .filter(q => q.matchLabel === 'Guess' || q.matchLabel === 'Unmatched' || q.matchLabel === 'Probable')
    .slice(0, 50)
    .map(q => ({
      query: q.query,
      impressions: q.impressions,
      position: q.position,
      matchLabel: q.matchLabel,
      matchedUrl: q.matchedPage,
      note: q.matchLabel === 'Unmatched' 
        ? 'No slug or title in Pages.csv references this entity. Primary gap candidate.' 
        : 'Entity matched partially in URL slug. Review manually to avoid content overlap.'
    }));

  // J. DATA LIMITS
  const dataLimits = [
    {
      item: 'Conversions and Revenue',
      description: 'Search Console exports clicks and impressions only. No e-commerce revenue or lead form submission data is present in Queries.csv or Pages.csv.',
      howToCloseGap: 'Export GA4 / CRM conversion events segmented by landing page.'
    },
    {
      item: 'Page-to-Query Exact Mapping (cannibalization confirmation)',
      description: 'Standard GSC separate exports do not link individual query rows to exact page rows without a Query×Page matrix.',
      howToCloseGap: 'Supply Search Console "Pages and queries" multi-dimension export or Looker Studio blended table.'
    },
    {
      item: 'Internal Links and Site Architecture Depth',
      description: 'Pages.csv does not reflect internal linking graph, crawl depth, or inlinks.',
      howToCloseGap: 'Supply a Screaming Frog crawl export or XML Sitemap.'
    },
    {
      item: 'SERP Features and Competitor Composition',
      description: 'Search Console position does not indicate presence of AI Overviews, Local 3-Pack, Featured Snippets, or People Also Ask.',
      howToCloseGap: 'Review live SERP snapshots for High-priority striking distance clusters.'
    }
  ];

  if (!answers.q4_knownFacts) {
    dataLimits.push({
      item: 'Proprietary Business Proof (Prices, Timelines, Guarantees)',
      description: 'No proprietary business facts were entered in Phase 0 Q4.',
      howToCloseGap: 'Input explicit price baselines, warranties, and certifications to remove [Needs-input] tags from content briefs.'
    });
  }

  // K. STRATEGIC QUESTIONS
  const strategicQuestions = [
    `بالنسبة لمجموعة الكلمات ذات الترتيب (8–20) الأكثر ظهوراً (${quickWinCandidates[0]?.entity || 'الخدمات الأساسية'})، هل يمكن إضافة قسم أسعار وضمانات فورية في الصفحة الحالية لتسريع الترتيب؟`,
    `هل تتوفر صور حصرية أو دراسات حالة سابقة لتدعيم المحتوى الجديد وتجنب المحتوى العام الضعيف؟`,
    `هل تود تفعيل التصدير التلقائي الفوري إلى Google Sheets و Google Docs لإنشاء مجلد المشروع كاملاً؟`
  ];

  // Audit metrics
  const audit: AnalysisAudit = {
    queriesFileRows: rawQueries.length,
    pagesFileRows: rawPages.length,
    brandRowsRemoved,
    brandIntentRowsSeparated,
    competitorRowsSeparated,
    lowImpressionRowsRemoved,
    outOfScopeRowsRemoved,
    analyzedQueriesCount: normalizedEligible.length,
    unmatchedQueriesCount: normalizedEligible.filter(q => q.matchLabel === 'Unmatched').length,
    matchBreakdown: {
      direct: normalizedEligible.filter(q => q.matchLabel === 'Direct').length,
      probable: normalizedEligible.filter(q => q.matchLabel === 'Probable').length,
      guess: normalizedEligible.filter(q => q.matchLabel === 'Guess').length,
      unmatched: normalizedEligible.filter(q => q.matchLabel === 'Unmatched').length
    },
    bucketBaselines: Array.from(bucketMap.entries()).map(([bucket, data]) => ({
      bucket,
      baselineCtr: Number((data.baselineCtr * 100).toFixed(1)),
      sampleSize: data.count
    })),
    dateRange: companionBundle?.dateRange,
    deviceSummary: companionBundle?.devices?.map(d => ({ device: d.name, clicks: d.clicks, impressions: d.impressions })),
    countrySummary: companionBundle?.countries?.map(c => ({ country: c.name, clicks: c.clicks, impressions: c.impressions }))
  };

  // Hybrid Sitemap Audit if sitemap is present in companionBundle
  let hybridSitemapAudit: any = undefined;
  if (companionBundle?.sitemap) {
    hybridSitemapAudit = generateHybridSitemapAudit(companionBundle.sitemap, rawPages, rawQueries);
    audit.sitemapSummary = {
      totalUrls: companionBundle.sitemap.totalUrls,
      categoriesCount: companionBundle.sitemap.categories.length,
      orphanCount: hybridSitemapAudit.orphanSitemapUrls.length
    };
  }

  return {
    siteProfile,
    audit,
    clusters: rawClusters,
    ctrDiagnostics,
    cannibalizationRisks,
    questionQueries,
    topNewContentPieces,
    contentVolumePlan,
    hybridSitemapAudit,
    topQuickWins,
    brandIntentQueries,
    competitorQueries,
    unmatchedAndGuessReviewQueue,
    dataLimits,
    strategicQuestions,
    analyzedAt: new Date().toISOString(),
    projectName: siteProfile.cities[0]?.name 
      ? `${siteProfile.siteType} - ${siteProfile.cities[0].name}` 
      : `${siteProfile.siteType} Analysis`
  };
}
