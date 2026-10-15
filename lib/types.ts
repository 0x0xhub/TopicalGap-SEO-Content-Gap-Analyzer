export type SiteType = 
  | 'service business' 
  | 'agency' 
  | 'blog or publisher' 
  | 'e-commerce' 
  | 'mixed' 
  | 'other';

export type ArchitectureModel = 
  | 'Model 1: single service, single city'
  | 'Model 2: single service, multiple cities'
  | 'Model 3: multiple services, single city'
  | 'Model 4: multiple services, multiple cities'
  | 'Non-service model (blog, store, agency)'
  | 'Unclear';

export type FrameType = 
  | 'definitional' 
  | 'comparative' 
  | 'procedural' 
  | 'diagnostic' 
  | 'transactional' 
  | 'local';

export type BuyerType = 'urgent' | 'planned' | 'price-led' | 'informational';

export type MatchLabel = 'Direct' | 'Probable' | 'Guess' | 'Unmatched';

export type EvidenceLabel = 
  | '[From-data]' 
  | '[Operational-Heuristic]' 
  | '[Probable]' 
  | '[Guess]' 
  | '[Needs-input]';

export type GapType = 
  | 'Missing' 
  | 'Striking distance' 
  | 'Underperforming CTR' 
  | 'Cannibalization risk' 
  | 'Question / Comparison' 
  | 'Covered';

export type DestinationType = 
  | 'Update existing URL'
  | 'New section (H2/H3)'
  | 'New standalone page'
  | 'Title or snippet rewrite'
  | 'Consolidate'
  | 'Research queue';

export type PriorityLevel = 'High' | 'Med' | 'Low';

export interface RawQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface RawPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GenericMetricRow {
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscFilterRow {
  filterName: string;
  filterValue: string;
}

export interface GscExportBundle {
  queries: RawQueryRow[];
  pages: RawPageRow[];
  countries?: GenericMetricRow[];
  devices?: GenericMetricRow[];
  searchAppearance?: GenericMetricRow[];
  filters?: GscFilterRow[];
  dateRange?: { startDate?: string; endDate?: string; periodLabel?: string };
  trendChart?: GenericMetricRow[];
  sitemap?: ParsedSitemap;
  detectedFilesCount: number;
  fileNames: string[];
}

export interface SiteProfile {
  siteType: SiteType;
  architectureModel: ArchitectureModel;
  evidence: string[];
  cities: { name: string; confidence: 'Probable' | 'Guess' }[];
  services: { name: string; confidence: 'Probable' | 'Guess' }[];
  nonServiceSections: { section: string; count: number }[];
  isConfirmed: boolean;
  notes?: string;
}

export interface Phase0Answers {
  q0_profileCorrection?: string;
  q1_brandTerms: string[];
  q2_confirmedServicesAndCities?: string;
  q3_businessModel?: string;
  q4_knownFacts?: string;
  q5_extraExportsNotes?: string;
  q6_scopeExclusions?: string[];
  q7_hasSitemapOrCrawl?: boolean;
}

export interface NormalizedQuery extends RawQueryRow {
  entity: string;
  predicate: string;
  location?: string;
  frame: FrameType;
  buyerType: BuyerType;
  matchLabel: MatchLabel;
  matchedPage?: string;
  isBrand: boolean;
  isBrandIntent: boolean;
  isCompetitor: boolean;
  isOutOfScope: boolean;
}

export interface QueryCluster {
  id: string;
  clusterName: string;
  entity: string;
  frame: FrameType;
  buyerType: BuyerType;
  queries: NormalizedQuery[];
  exampleQueries: string[];
  totalImpressions: number;
  totalClicks: number;
  weightedAvgPosition: number;
  gapType: GapType;
  matchedUrl: string;
  matchLabel: MatchLabel;
  destination: DestinationType;
  destinationReason: string;
  priority: PriorityLevel;
  evidenceLabel: EvidenceLabel;
  requiresSerpOverlapCheck: boolean;
}

export interface CTRDiagnosticItem {
  queryOrPage: string;
  type: 'query' | 'page';
  impressions: number;
  position: number;
  ctr: number;
  bucket: string;
  bucketBaselineCtr: number;
  ratio: number;
  probableCause: string;
  suggestedFix: string;
  evidenceLabel: EvidenceLabel;
  needsSerpSnapshot: boolean;
}

export interface CannibalizationItem {
  pageA: string;
  pageB: string;
  sharedEntityAndPredicate: string;
  evidence: 'Probable' | 'From-data';
  suggestedAction: string;
  combinedImpressions: number;
}

export interface QuestionQueryItem {
  query: string;
  impressions: number;
  position: number;
  matchedUrl: string;
  suggestedFormat: 'Answer-first section' | 'Comparison table' | 'FAQ block' | 'Diagnostic flowchart';
  evidenceLabel: EvidenceLabel;
}

// Koray Tuğberk Gübür Semantic SEO & OriginalContentScore Architecture
export interface KorayContentBlueprint {
  id: string;
  targetEntity: string;
  clusterName: string;
  proseSection1: {
    heading: string;
    objective: string;
    entityFocus: string[];
    informationGain: string;
  };
  proseSection2: {
    heading: string;
    objective: string;
    entityFocus: string[];
    informationGain: string;
  };
  comparisonTable: {
    title: string;
    columns: string[];
    sampleRows: string[][];
  };
  uniqueAnchorTexts: {
    anchor: string;
    targetUrl: string;
    context: string;
  }[];
  originalityScoreEstimate: {
    score: number;
    scale: '0-127 (Short)' | '0-512 (Long)';
    explanation: string;
  };
  localDifferentiationRisk: 'High' | 'Medium' | 'Low';
  localDifferentiationAdvice: string;
}

export interface ArticleAngles {
  procedural: string;
  pricing: string;
  comparative: string;
  checklist: string;
  localized: string;
}

export type ArticleAngleType = keyof ArticleAngles;

export interface TopContentPiece {
  id: string;
  suggestedTitle: string;
  selectedAngle?: ArticleAngleType;
  angles?: ArticleAngles;
  priorityTier: 'High' | 'Medium' | 'Supporting';
  uniquenessScore?: number;
  targetQueries: string[];
  searchIntent: string;
  subQuestions: string[];
  requiredProof: string;
  destination: DestinationType;
  evidenceLabel: EvidenceLabel;
  targetEntity: string;
  primaryImpressionEstimate: number;
  korayBlueprint?: KorayContentBlueprint;
}

export interface TopQuickWin {
  id: string;
  url: string;
  changeType: 'Title rewrite' | 'New section (H2/H3)' | 'Snippet optimization' | 'FAQ block' | 'Consolidation';
  reasonFromData: string;
  measureIn90Days: string;
  currentClicks: number;
  currentImpressions: number;
  currentPosition: number;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  pathSegments: string[];
  depth: number;
  category: string;
}

export interface ParsedSitemap {
  rawUrl?: string;
  fileName?: string;
  totalUrls: number;
  urls: SitemapUrlEntry[];
  categories: { name: string; count: number }[];
  depthDistribution: Record<number, number>;
  latestLastmod?: string;
  oldestLastmod?: string;
}

export interface HybridSitemapAudit {
  totalSitemapUrls: number;
  totalGscActivePages: number;
  indexedAndRankingUrls: number;
  orphanSitemapUrls: SitemapUrlEntry[]; // in sitemap but 0 impressions in GSC
  unindexedGapQueries: string[]; // queries targeting unindexed or missing topics
  categoryBreakdown: { category: string; sitemapCount: number; gscImpressions: number; gscClicks: number }[];
  siteHealthSummary: string;
}

export interface DynamicContentVolumePlan {
  totalRecommendedPieces: number;
  highPriorityCount: number;
  clusterSupportCount: number;
  siteSizeTier: 'Micro (1-20 pages)' | 'Mid-size (21-200 pages)' | 'Large (201-1,000+ pages)';
  uncoveredClustersCount: number;
  rationale: string;
}

export interface AnalysisAudit {
  queriesFileRows: number;
  pagesFileRows: number;
  brandRowsRemoved: number;
  brandIntentRowsSeparated: number;
  competitorRowsSeparated: number;
  lowImpressionRowsRemoved: number;
  outOfScopeRowsRemoved: number;
  analyzedQueriesCount: number;
  unmatchedQueriesCount: number;
  matchBreakdown: {
    direct: number;
    probable: number;
    guess: number;
    unmatched: number;
  };
  bucketBaselines: {
    bucket: string;
    baselineCtr: number;
    sampleSize: number;
  }[];
  dateRange?: { startDate?: string; endDate?: string; periodLabel?: string };
  deviceSummary?: { device: string; clicks: number; impressions: number }[];
  countrySummary?: { country: string; clicks: number; impressions: number }[];
  sitemapSummary?: { totalUrls: number; categoriesCount: number; orphanCount: number };
}

export interface FullAnalysisResult {
  siteProfile: SiteProfile;
  audit: AnalysisAudit;
  clusters: QueryCluster[];
  ctrDiagnostics: CTRDiagnosticItem[];
  cannibalizationRisks: CannibalizationItem[];
  questionQueries: QuestionQueryItem[];
  topNewContentPieces: TopContentPiece[];
  contentVolumePlan?: DynamicContentVolumePlan;
  hybridSitemapAudit?: HybridSitemapAudit;
  topQuickWins: TopQuickWin[];
  brandIntentQueries: NormalizedQuery[];
  competitorQueries: NormalizedQuery[];
  unmatchedAndGuessReviewQueue: {
    query: string;
    impressions: number;
    position: number;
    matchLabel: MatchLabel;
    matchedUrl?: string;
    note: string;
  }[];
  dataLimits: {
    item: string;
    description: string;
    howToCloseGap: string;
  }[];
  strategicQuestions: string[];
  analyzedAt: string;
  projectName: string;
}

export interface WorkspaceSyncResult {
  folderId?: string;
  folderUrl?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  documentId?: string;
  documentUrl?: string;
  taskListId?: string;
  tasksCreatedCount?: number;
  lastSyncedAt?: string;
}

export interface SeoProject {
  id: string;
  name: string;
  siteUrl: string;
  createdAt: string;
  updatedAt: string;
  phase0Answers: Phase0Answers;
  siteProfile?: SiteProfile;
  gscBundle?: Partial<GscExportBundle>;
  sitemap?: ParsedSitemap;
  analysisResult?: FullAnalysisResult;
  workspaceSync?: WorkspaceSyncResult;
}
