import { FullAnalysisResult, WorkspaceSyncResult } from './types';

const ROOT_FOLDER_NAME = 'TopicalGap SEO Analysis';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export async function findOrCreateRootFolder(accessToken: string): Promise<{ id: string; webViewLink?: string }> {
  // Check if folder exists
  const query = encodeURIComponent(`name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create root folder in Google Drive: ${err}`);
  }

  const created: GoogleDriveFile = await createRes.json();
  return { id: created.id, webViewLink: created.webViewLink };
}

export async function createProjectFolder(
  accessToken: string,
  rootFolderId: string,
  projectName: string
): Promise<{ id: string; webViewLink?: string }> {
  const dateStr = new Date().toISOString().split('T')[0];
  const folderName = `${projectName} [${dateStr}]`;

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId]
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create project folder: ${err}`);
  }

  const created: GoogleDriveFile = await createRes.json();
  return { id: created.id, webViewLink: created.webViewLink };
}

export async function createAndPopulateGoogleSheet(
  accessToken: string,
  parentFolderId: string,
  analysis: FullAnalysisResult
): Promise<{ id: string; webViewLink?: string }> {
  const title = `${analysis.projectName} - Content Gap Analysis Matrix`;

  // 1. Create Spreadsheet
  const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Clusters' } },
        { properties: { title: 'CTR Diagnostics' } },
        { properties: { title: 'Cannibalization' } },
        { properties: { title: 'Questions & Comparisons' } },
        { properties: { title: 'Data Audit' } }
      ]
    })
  });

  if (!sheetRes.ok) {
    const err = await sheetRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${err}`);
  }

  const sheetData = await sheetRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Move file into project folder
  await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${parentFolderId}&enforceSingleParent=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  // 3. Prepare data rows
  const clusterRows: (string | number)[][] = [
    ['Cluster Name', 'Frame', 'Buyer Type', 'Total Impressions', 'Total Clicks', 'Weighted Avg Pos', 'Gap Type', 'Destination', 'Matched URL', 'Priority', 'Evidence']
  ];
  for (const c of analysis.clusters) {
    clusterRows.push([
      c.clusterName,
      c.frame,
      c.buyerType,
      c.totalImpressions,
      c.totalClicks,
      c.weightedAvgPosition,
      c.gapType,
      c.destination,
      c.matchedUrl,
      c.priority,
      c.evidenceLabel
    ]);
  }

  const ctrRows: (string | number)[][] = [
    ['Query', 'Impressions', 'Position', 'CTR', 'Bucket Baseline', 'Ratio', 'Probable Cause', 'Suggested Fix']
  ];
  for (const item of analysis.ctrDiagnostics) {
    ctrRows.push([
      item.queryOrPage,
      item.impressions,
      item.position,
      `${(item.ctr * 100).toFixed(2)}%`,
      `${(item.bucketBaselineCtr * 100).toFixed(2)}%`,
      item.ratio,
      item.probableCause,
      item.suggestedFix
    ]);
  }

  const cannibalizationRows: (string | number)[][] = [
    ['Page A', 'Page B', 'Shared Entity & Predicate', 'Evidence', 'Suggested Action', 'Combined Impressions']
  ];
  for (const item of analysis.cannibalizationRisks) {
    cannibalizationRows.push([
      item.pageA,
      item.pageB,
      item.sharedEntityAndPredicate,
      item.evidence,
      item.suggestedAction,
      item.combinedImpressions
    ]);
  }

  const questionRows: (string | number)[][] = [
    ['Query', 'Impressions', 'Position', 'Matched URL', 'Suggested Format', 'Evidence']
  ];
  for (const item of analysis.questionQueries) {
    questionRows.push([
      item.query,
      item.impressions,
      item.position,
      item.matchedUrl,
      item.suggestedFormat,
      item.evidenceLabel
    ]);
  }

  const auditRows: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Queries File Rows', analysis.audit.queriesFileRows],
    ['Pages File Rows', analysis.audit.pagesFileRows],
    ['Brand Rows Filtered', analysis.audit.brandRowsRemoved],
    ['Brand Intent Rows', analysis.audit.brandIntentRowsSeparated],
    ['Low Impression Rows Filtered (< 10)', analysis.audit.lowImpressionRowsRemoved],
    ['Out of Scope Rows Filtered', analysis.audit.outOfScopeRowsRemoved],
    ['Total Analyzed Queries', analysis.audit.analyzedQueriesCount],
    ['Site Type', analysis.siteProfile.siteType],
    ['Architecture Model', analysis.siteProfile.architectureModel]
  ];

  // 4. Batch update values
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Clusters!A1', values: clusterRows },
        { range: 'CTR Diagnostics!A1', values: ctrRows },
        { range: 'Cannibalization!A1', values: cannibalizationRows },
        { range: 'Questions & Comparisons!A1', values: questionRows },
        { range: 'Data Audit!A1', values: auditRows }
      ]
    })
  });

  return {
    id: spreadsheetId,
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

export async function createAndPopulateGoogleDoc(
  accessToken: string,
  parentFolderId: string,
  analysis: FullAnalysisResult
): Promise<{ id: string; webViewLink?: string }> {
  const title = `${analysis.projectName} - Executive SEO Strategy & Content Plan`;

  // 1. Create Document
  const docRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!docRes.ok) {
    const err = await docRes.text();
    throw new Error(`Failed to create Google Doc: ${err}`);
  }

  const docData = await docRes.json();
  const documentId = docData.documentId;

  // 2. Move file into project folder
  await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}?addParents=${parentFolderId}&enforceSingleParent=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  // 3. Build text content
  let text = `${title}\n\n`;
  text += `Generated: ${new Date().toLocaleDateString()} | Platform: TopicalGap SEO\n`;
  text += `Site Type: ${analysis.siteProfile.siteType} | Architecture: ${analysis.siteProfile.architectureModel}\n\n`;
  text += `--------------------------------------------------------\n`;
  text += `EXECUTIVE SUMMARY & DATA AUDIT\n`;
  text += `--------------------------------------------------------\n`;
  text += `- Total Queries Analyzed: ${analysis.audit.analyzedQueriesCount}\n`;
  text += `- Brand Rows Excluded: ${analysis.audit.brandRowsRemoved}\n`;
  text += `- Low Impressions Filtered (< 10): ${analysis.audit.lowImpressionRowsRemoved}\n`;
  text += `- Identified Topic Clusters: ${analysis.clusters.length}\n`;
  text += `- Underperforming CTR Queries: ${analysis.ctrDiagnostics.length}\n\n`;

  text += `--------------------------------------------------------\n`;
  text += `TOP 5 NEW CONTENT PIECES (PROMISE & PROOF)\n`;
  text += `--------------------------------------------------------\n\n`;
  analysis.topNewContentPieces.forEach((piece, i) => {
    text += `${i + 1}. Title: ${piece.suggestedTitle}\n`;
    text += `   Target Entity: ${piece.targetEntity}\n`;
    text += `   Target Queries: ${piece.targetQueries.join(', ')}\n`;
    text += `   Search Intent: ${piece.searchIntent}\n`;
    text += `   Required Proof: ${piece.requiredProof}\n`;
    text += `   Recommended Destination: ${piece.destination} (${piece.evidenceLabel})\n`;
    if (piece.korayBlueprint) {
      text += `   [Koray Semantic SEO Blueprint]\n`;
      text += `   - OriginalContentScore Target: ${piece.korayBlueprint.originalityScoreEstimate.score} (${piece.korayBlueprint.originalityScoreEstimate.scale})\n`;
      text += `   - Local Differentiation Risk: ${piece.korayBlueprint.localDifferentiationRisk}\n`;
      text += `   - Local Differentiation Rule: ${piece.korayBlueprint.localDifferentiationAdvice}\n`;
      text += `   - Prose Section 1: ${piece.korayBlueprint.proseSection1.heading} (Information Gain: ${piece.korayBlueprint.proseSection1.informationGain})\n`;
      text += `   - Prose Section 2: ${piece.korayBlueprint.proseSection2.heading} (Information Gain: ${piece.korayBlueprint.proseSection2.informationGain})\n`;
      text += `   - Recommended Comparison Table: ${piece.korayBlueprint.comparisonTable.title} [${piece.korayBlueprint.comparisonTable.columns.join(' | ')}]\n`;
      text += `   - Recommended Internal Anchors: ${piece.korayBlueprint.uniqueAnchorTexts.map(a => `«${a.anchor}» -> ${a.targetUrl}`).join('; ')}\n`;
    }
    text += `\n`;
  });

  text += `--------------------------------------------------------\n`;
  text += `TOP 5 QUICK WINS ON EXISTING PAGES (90-DAY ACTIONS)\n`;
  text += `--------------------------------------------------------\n\n`;
  analysis.topQuickWins.forEach((win, i) => {
    text += `${i + 1}. URL: ${win.url}\n`;
    text += `   Recommended Change: ${win.changeType}\n`;
    text += `   Data Rationale: ${win.reasonFromData}\n`;
    text += `   90-Day Verification: ${win.measureIn90Days}\n\n`;
  });

  text += `--------------------------------------------------------\n`;
  text += `DATA LIMITS & GOOGLE SEARCH CONSOLE CONSTRAINTS\n`;
  text += `--------------------------------------------------------\n`;
  analysis.dataLimits.forEach(limit => {
    text += `• ${limit.item}: ${limit.description} -> Action: ${limit.howToCloseGap}\n`;
  });

  // 4. Insert text into Document
  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text
          }
        }
      ]
    })
  });

  return {
    id: documentId,
    webViewLink: `https://docs.google.com/document/d/${documentId}/edit`
  };
}

export async function createGoogleTasksForProject(
  accessToken: string,
  projectName: string,
  analysis: FullAnalysisResult
): Promise<{ taskListId: string; count: number }> {
  // 1. Create task list
  const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `SEO Gap Plan: ${projectName}`
    })
  });

  if (!listRes.ok) {
    return { taskListId: '', count: 0 };
  }

  const listData = await listRes.json();
  const taskListId = listData.id;

  let count = 0;
  // Create tasks for Quick Wins
  for (const win of analysis.topQuickWins) {
    await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `[Quick Win] ${win.changeType}: ${win.url.split('/').filter(Boolean).pop() || win.url}`,
        notes: `${win.reasonFromData}\nMeasurement: ${win.measureIn90Days}`
      })
    });
    count++;
  }

  // Create tasks for New Pieces
  for (const piece of analysis.topNewContentPieces) {
    await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `[New Content] ${piece.suggestedTitle}`,
        notes: `Target Entity: ${piece.targetEntity}\nProof required: ${piece.requiredProof}`
      })
    });
    count++;
  }

  return { taskListId, count };
}

// Master Sync Orchestrator
export async function syncAnalysisToGoogleWorkspace(
  accessToken: string,
  analysis: FullAnalysisResult,
  onProgress?: (step: string) => void
): Promise<WorkspaceSyncResult> {
  onProgress?.('Locating or creating "TopicalGap SEO Analysis" folder in Google Drive...');
  const root = await findOrCreateRootFolder(accessToken);

  onProgress?.(`Creating dedicated project folder for "${analysis.projectName}"...`);
  const projectFolder = await createProjectFolder(accessToken, root.id, analysis.projectName);

  onProgress?.('Generating multi-tab Content Gap Matrix in Google Sheets...');
  const sheet = await createAndPopulateGoogleSheet(accessToken, projectFolder.id, analysis);

  onProgress?.('Writing Executive SEO Strategy & Content Briefs in Google Docs...');
  const doc = await createAndPopulateGoogleDoc(accessToken, projectFolder.id, analysis);

  onProgress?.('Syncing Quick Wins and Content Briefs to Google Tasks...');
  const tasks = await createGoogleTasksForProject(accessToken, analysis.projectName, analysis);

  return {
    folderId: projectFolder.id,
    folderUrl: projectFolder.webViewLink || `https://drive.google.com/drive/folders/${projectFolder.id}`,
    spreadsheetId: sheet.id,
    spreadsheetUrl: sheet.webViewLink,
    documentId: doc.id,
    documentUrl: doc.webViewLink,
    taskListId: tasks.taskListId,
    tasksCreatedCount: tasks.count,
    lastSyncedAt: new Date().toISOString()
  };
}
