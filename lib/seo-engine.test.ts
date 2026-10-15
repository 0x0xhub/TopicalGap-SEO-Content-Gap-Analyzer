import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAndValidateCsv,
  classifySiteArchitecture,
  detectFrame,
  detectBuyerType,
  calculateBucketBaselines,
  runPhase1Analysis,
  parseGscBundle
} from './seo-engine.ts';
import type { RawQueryRow, RawPageRow, Phase0Answers } from './types.ts';

test('detectAndValidateCsv identifies Arabic GSC Queries file correctly (أهم طلبات البحث, موضع)', () => {
  const sampleArabicQueriesRows = [
    {
      'أهم طلبات البحث': 'المكيف يطلع صوت غريب',
      'النقرات': '7',
      'عدد الظهور': '569',
      'نسبة النقر إلى الظهور': '1.23%',
      'موضع': '7.4'
    },
    {
      'أهم طلبات البحث': 'صيانة غسالات اتوماتيك ابو عريش',
      'النقرات': '6',
      'عدد الظهور': '30',
      'نسبة النقر إلى الظهور': '20%',
      'موضع': '2.23'
    }
  ];

  const result = detectAndValidateCsv(sampleArabicQueriesRows, 'طلبات البحث.csv');
  assert.equal(result.type, 'queries');
  assert.equal(result.valid, true);
  const rows = result.mappedRows as RawQueryRow[];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].query, 'المكيف يطلع صوت غريب');
  assert.equal(rows[0].clicks, 7);
  assert.equal(rows[0].impressions, 569);
  assert.equal(rows[0].position, 7.4);
});

test('detectAndValidateCsv identifies Arabic GSC Pages file correctly (أهم الصفحات, موضع)', () => {
  const sampleArabicPagesRows = [
    {
      'أهم الصفحات': 'https://gc-cleaning.co/ar/blog/ac-weird-noise-causes/',
      'النقرات': '46',
      'عدد الظهور': '6221',
      'نسبة النقر إلى الظهور': '0.74%',
      'موضع': '6.96'
    },
    {
      'أهم الصفحات': 'https://gc-cleaning.co/ar/sharurah/ac-services/',
      'النقرات': '38',
      'عدد الظهور': '808',
      'نسبة النقر إلى الظهور': '4.7%',
      'موضع': '16.99'
    }
  ];

  const result = detectAndValidateCsv(sampleArabicPagesRows, 'الصفحات.csv');
  assert.equal(result.type, 'pages');
  assert.equal(result.valid, true);
  const rows = result.mappedRows as RawPageRow[];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].page, 'https://gc-cleaning.co/ar/blog/ac-weird-noise-causes/');
  assert.equal(rows[0].clicks, 46);
  assert.equal(rows[0].impressions, 6221);
});

test('parseGscBundle handles multi-file bundle and extracts date range from filters', () => {
  const files = [
    {
      name: 'طلبات البحث.csv',
      data: [{ 'أهم طلبات البحث': 'تصليح ثلاجات', 'النقرات': '10', 'عدد الظهور': '200', 'نسبة النقر إلى الظهور': '5%', 'موضع': '4.1' }]
    },
    {
      name: 'الصفحات.csv',
      data: [{ 'أهم الصفحات': 'https://example.com/refrigerator-services', 'النقرات': '50', 'عدد الظهور': '1000', 'نسبة النقر إلى الظهور': '5%', 'موضع': '3.5' }]
    },
    {
      name: 'الفلاتر.csv',
      data: [
        { 'عنصر تصفية': 'تاريخ البدء', 'قيمة عنصر التصفية': '2024-07-15' },
        { 'عنصر تصفية': 'تاريخ الانتهاء', 'قيمة عنصر التصفية': '2024-10-15' }
      ]
    }
  ];

  const bundle = parseGscBundle(files);
  assert.equal(bundle.detectedFilesCount, 3);
  assert.equal(bundle.queries.length, 1);
  assert.equal(bundle.pages.length, 1);
  assert.equal(bundle.dateRange?.startDate, '2024-07-15');
  assert.equal(bundle.dateRange?.endDate, '2024-10-15');
});

test('classifySiteArchitecture categorizes Model 4 (multi services, multi cities)', () => {
  const pages: RawPageRow[] = [
    { page: 'https://example.com/riyadh/cleaning/', clicks: 100, impressions: 2000, ctr: 0.05, position: 3 },
    { page: 'https://example.com/jeddah/cleaning/', clicks: 90, impressions: 1800, ctr: 0.05, position: 4 },
    { page: 'https://example.com/riyadh/pest-control/', clicks: 50, impressions: 1200, ctr: 0.04, position: 5 },
    { page: 'https://example.com/jeddah/pest-control/', clicks: 40, impressions: 1000, ctr: 0.04, position: 6 },
    { page: 'https://example.com/blog/tips-for-cleaning', clicks: 10, impressions: 300, ctr: 0.03, position: 12 }
  ];

  const profile = classifySiteArchitecture(pages);
  assert.equal(profile.architectureModel, 'Model 4: multiple services, multiple cities');
  assert.equal(profile.isConfirmed, false);
});

test('detectFrame and detectBuyerType classify intents accurately', () => {
  assert.equal(detectFrame('شركة صيانة ثلاجات بحفر الباطن'), 'transactional');
  assert.equal(detectFrame('المكيف يطلع صوت صرير'), 'diagnostic');
  assert.equal(detectFrame('الفرق بين تنظيف البخار والتنظيف الجاف'), 'comparative');
  assert.equal(detectFrame('طريقة التخلص من النمل الابيض'), 'procedural');

  assert.equal(detectBuyerType('تنظيف منازل فوري الآن 24 ساعة'), 'urgent');
  assert.equal(detectBuyerType('اسعار تنظيف الكنب بكم خصم'), 'price-led');
  assert.equal(detectBuyerType('افضل شركة تنظيف ومقارنة الاسعار'), 'planned');
});

test('calculateBucketBaselines computes impression-weighted CTR baselines', () => {
  const queries: RawQueryRow[] = [
    { query: 'q1', clicks: 20, impressions: 100, ctr: 0.20, position: 2.1 },
    { query: 'q2', clicks: 30, impressions: 200, ctr: 0.15, position: 2.5 },
    { query: 'q3', clicks: 10, impressions: 200, ctr: 0.05, position: 5.5 }
  ];

  const baselines = calculateBucketBaselines(queries);
  const b13 = baselines.get('1-3');
  assert.ok(b13);
  assert.ok(Math.abs(b13.baselineCtr - 0.1666) < 0.01);
});

test('runPhase1Analysis produces Koray Tuğberk Gübür blueprints for Top 5 pieces', () => {
  const queries: RawQueryRow[] = [
    { query: 'شركة المجد كلين لتنظيف الخزانات', clicks: 50, impressions: 400, ctr: 0.125, position: 1.2 },
    { query: 'اسعار المجد كلين', clicks: 10, impressions: 200, ctr: 0.05, position: 2.0 },
    { query: 'شركة تنظيف خزانات بالرياض', clicks: 40, impressions: 1200, ctr: 0.033, position: 4.5 },
    { query: 'اسعار غسيل الخزانات', clicks: 25, impressions: 800, ctr: 0.031, position: 9.2 },
    { query: 'كيف يتم عزل الخزان الارضي', clicks: 15, impressions: 600, ctr: 0.025, position: 11.0 }
  ];

  const pages: RawPageRow[] = [
    { page: 'https://example.com/riyadh/water-tank-cleaning', clicks: 120, impressions: 3000, ctr: 0.04, position: 5.0 },
    { page: 'https://example.com/riyadh/water-tank-insulation', clicks: 80, impressions: 2000, ctr: 0.04, position: 8.0 }
  ];

  const profile = classifySiteArchitecture(pages);
  const answers: Phase0Answers = {
    q1_brandTerms: ['المجد كلين'],
    q2_confirmedServicesAndCities: 'تنظيف وعزل الخزانات في الرياض',
    q4_knownFacts: 'خصم 20%، ضمان 3 سنوات'
  };

  const analysis = runPhase1Analysis(queries, pages, profile, answers);

  assert.ok(analysis.topNewContentPieces.length > 0);
  const firstPiece = analysis.topNewContentPieces[0];
  assert.ok(firstPiece.korayBlueprint);
  assert.ok(firstPiece.korayBlueprint.proseSection1.heading.length > 0);
  assert.ok(firstPiece.korayBlueprint.proseSection2.heading.length > 0);
  assert.ok(firstPiece.korayBlueprint.comparisonTable.columns.length >= 3);
  assert.ok(firstPiece.korayBlueprint.uniqueAnchorTexts.length >= 2);
  assert.ok(firstPiece.korayBlueprint.originalityScoreEstimate.score > 0);
});
