import { RawQueryRow, RawPageRow, Phase0Answers } from './types';

// Real-world 3-month GSC sample data for Saudi Home & Cleaning Services (Arabic)
export const ARABIC_SAMPLE_QUERIES: RawQueryRow[] = [
  { query: 'شركة تنظيف منازل بالرياض', clicks: 1240, impressions: 28500, ctr: 0.0435, position: 3.1 },
  { query: 'اسعار تنظيف الفلل بالرياض', clicks: 820, impressions: 19400, ctr: 0.0423, position: 4.5 },
  { query: 'شركة تنظيف بالرياض رخيصة ومجربة', clicks: 650, impressions: 14200, ctr: 0.0458, position: 5.2 },
  { query: 'تنظيف كنب بالبخار بالرياض', clicks: 580, impressions: 11200, ctr: 0.0518, position: 2.8 },
  { query: 'شركة مكافحة حشرات بالرياض', clicks: 920, impressions: 22000, ctr: 0.0418, position: 3.6 },
  { query: 'شركة رش مبيدات بالرياض مع الضمان', clicks: 430, impressions: 9800, ctr: 0.0439, position: 6.1 },
  { query: 'شركة تنظيف خزانات بالرياض', clicks: 710, impressions: 16500, ctr: 0.0430, position: 4.2 },
  { query: 'عزل خزانات المياه بالرياض', clicks: 390, impressions: 8900, ctr: 0.0438, position: 7.4 },
  { query: 'شركة تنظيف بجدة', clicks: 490, impressions: 13500, ctr: 0.0363, position: 8.5 },
  { query: 'شركة مكافحة حشرات بجدة', clicks: 310, impressions: 9200, ctr: 0.0337, position: 9.8 },
  { query: 'شركة تنظيف شقق بالدمام', clicks: 280, impressions: 7600, ctr: 0.0368, position: 10.4 },
  { query: 'اسعار غسيل الكنب بالرياض', clicks: 340, impressions: 8400, ctr: 0.0405, position: 8.9 },
  { query: 'طريقة تنظيف السجاد من البقع الصعبة', clicks: 110, impressions: 6800, ctr: 0.0162, position: 12.3 },
  { query: 'كيف اتخلص من الصراصير الصغيرة في المطبخ', clicks: 95, impressions: 7200, ctr: 0.0132, position: 14.1 },
  { query: 'الفرق بين التنظيف الجاف والتنظيف بالبخار', clicks: 80, impressions: 4500, ctr: 0.0178, position: 11.5 },
  { query: 'لماذا تظهر حشرة بق الفراش', clicks: 65, impressions: 5100, ctr: 0.0127, position: 15.8 },
  { query: 'تكلفة تنظيف واجهات المباني الزجاجية', clicks: 45, impressions: 3200, ctr: 0.0141, position: 16.2 },
  { query: 'تنظيف منازل بالرياض فوري 24 ساعة', clicks: 220, impressions: 3400, ctr: 0.0647, position: 3.5 },
  { query: 'ارقام شركات تنظيف بالرياض طوارئ', clicks: 180, impressions: 2900, ctr: 0.0621, position: 4.1 },
  { query: 'شركة رواد النظافة كلين', clicks: 890, impressions: 4200, ctr: 0.2119, position: 1.1 },
  { query: 'اسعار رواد النظافة', clicks: 120, impressions: 1100, ctr: 0.1091, position: 1.8 },
  { query: 'رقم رواد النظافة كلين بالرياض', clicks: 190, impressions: 1300, ctr: 0.1462, position: 1.2 },
  { query: 'شركة ركن نجد للتنظيف', clicks: 30, impressions: 1200, ctr: 0.025, position: 6.8 },
  { query: 'سعر تسليك مجاري بالرياض', clicks: 75, impressions: 2100, ctr: 0.0357, position: 11.4 },
  { query: 'نقل عفش بالرياض باكستاني', clicks: 15, impressions: 1800, ctr: 0.0083, position: 18.2 }
];

export const ARABIC_SAMPLE_PAGES: RawPageRow[] = [
  { page: 'https://rawad-clean.sa/riyadh/house-cleaning/', clicks: 2100, impressions: 45000, ctr: 0.0467, position: 3.4 },
  { page: 'https://rawad-clean.sa/riyadh/villa-cleaning/', clicks: 1150, impressions: 24000, ctr: 0.0479, position: 4.2 },
  { page: 'https://rawad-clean.sa/riyadh/sofa-steam-cleaning/', clicks: 890, impressions: 17500, ctr: 0.0509, position: 3.1 },
  { page: 'https://rawad-clean.sa/riyadh/pest-control/', clicks: 1340, impressions: 31000, ctr: 0.0432, position: 3.9 },
  { page: 'https://rawad-clean.sa/riyadh/water-tank-cleaning/', clicks: 1050, impressions: 23000, ctr: 0.0457, position: 4.5 },
  { page: 'https://rawad-clean.sa/jeddah/cleaning-services/', clicks: 620, impressions: 16000, ctr: 0.0388, position: 8.8 },
  { page: 'https://rawad-clean.sa/jeddah/pest-control/', clicks: 410, impressions: 11500, ctr: 0.0357, position: 9.5 },
  { page: 'https://rawad-clean.sa/dammam/cleaning/', clicks: 330, impressions: 9200, ctr: 0.0359, position: 10.2 },
  { page: 'https://rawad-clean.sa/blog/carpet-cleaning-tips/', clicks: 120, impressions: 7200, ctr: 0.0167, position: 12.8 },
  { page: 'https://rawad-clean.sa/blog/get-rid-of-cockroaches/', clicks: 90, impressions: 7500, ctr: 0.0120, position: 14.5 }
];

export const ARABIC_SAMPLE_ANSWERS: Phase0Answers = {
  q0_profileCorrection: '',
  q1_brandTerms: ['رواد النظافة', 'رواد النظافة كلين', 'rawad clean', 'rawadclean', 'رواد كلين'],
  q2_confirmedServicesAndCities: 'خدمات التنظيف ومكافحة الحشرات وعزل الخزانات في الرياض وجدة والدمام.',
  q3_businessModel: 'شركة خدمات ميدانية (Service Business). إجراء التحويل الأساسي هو الاتصال الهاتفي أو حجز واتساب.',
  q4_knownFacts: 'أسعار تبدأ من 250 ريال للفلل الصغيرة، ضمان 6 أشهر على رش الحشرات، مواد مرخصة من وزارة الصحة، فرق فلبينية مدربة، سرعة استجابة خلال ساعتين.',
  q5_extraExportsNotes: 'تم تصدير ملفات آخر 90 يوم من Google Search Console.',
  q6_scopeExclusions: ['نقل عفش', 'تسليك مجاري'],
  q7_hasSitemapOrCrawl: true
};

// Real-world 3-month GSC sample data for B2B SaaS (English)
export const ENGLISH_SAMPLE_QUERIES: RawQueryRow[] = [
  { query: 'b2b seo platform', clicks: 450, impressions: 12400, ctr: 0.0363, position: 3.4 },
  { query: 'content gap analysis tool', clicks: 620, impressions: 15200, ctr: 0.0408, position: 4.1 },
  { query: 'topical authority generator', clicks: 310, impressions: 8900, ctr: 0.0348, position: 8.4 },
  { query: 'how to do content gap analysis in search console', clicks: 190, impressions: 6700, ctr: 0.0284, position: 9.2 },
  { query: 'search console content gap vs ahrefs', clicks: 120, impressions: 4200, ctr: 0.0286, position: 11.5 },
  { query: 'enterprise seo software pricing', clicks: 85, impressions: 3800, ctr: 0.0224, position: 14.2 },
  { query: 'best seo tools for agencies 2026', clicks: 95, impressions: 4100, ctr: 0.0232, position: 13.8 },
  { query: 'omnigap seo software', clicks: 750, impressions: 3200, ctr: 0.2344, position: 1.1 },
  { query: 'omnigap pricing plans', clicks: 140, impressions: 980, ctr: 0.1429, position: 1.4 },
  { query: 'semrush content gap alternatives', clicks: 180, impressions: 5600, ctr: 0.0321, position: 7.9 },
  { query: 'free content gap analysis template sheets', clicks: 210, impressions: 7800, ctr: 0.0269, position: 10.1 }
];

export const ENGLISH_SAMPLE_PAGES: RawPageRow[] = [
  { page: 'https://omnigap.io/features/content-gap-analysis', clicks: 980, impressions: 22000, ctr: 0.0445, position: 4.2 },
  { page: 'https://omnigap.io/features/topical-authority', clicks: 520, impressions: 14000, ctr: 0.0371, position: 7.8 },
  { page: 'https://omnigap.io/blog/content-gap-strategy-guide', clicks: 290, impressions: 9500, ctr: 0.0305, position: 9.8 },
  { page: 'https://omnigap.io/pricing', clicks: 420, impressions: 5400, ctr: 0.0778, position: 2.1 }
];

export const ENGLISH_SAMPLE_ANSWERS: Phase0Answers = {
  q1_brandTerms: ['omnigap', 'omnigap seo', 'omnigap.io'],
  q2_confirmedServicesAndCities: 'B2B SaaS serving US, UK, and global SEO agencies.',
  q3_businessModel: 'SaaS recurring subscription. Primary conversion is 14-day free trial.',
  q4_knownFacts: 'Plans start at $99/mo, 100% GSC data privacy, zero hallucination clustering algorithm.',
  q6_scopeExclusions: [],
  q7_hasSitemapOrCrawl: true
};
