import { SeoProject, FullAnalysisResult, Phase0Answers, GscExportBundle, ParsedSitemap } from './types';

const STORAGE_KEY = 'topical_gap_seo_projects_v2';
const ACTIVE_PROJECT_ID_KEY = 'topical_gap_active_project_id';

/**
 * Client-side Storage for SEO Projects
 * Allows users to return to any past project, view the analysis,
 * edit input parameters, and sync state to Google Drive.
 */
export function getSavedProjects(): SeoProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load projects from localStorage:', err);
    return [];
  }
}

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
}

export function setActiveProjectId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
  }
}

export function getActiveProject(): SeoProject | null {
  const activeId = getActiveProjectId();
  if (!activeId) return null;
  const projects = getSavedProjects();
  return projects.find(p => p.id === activeId) || null;
}

export function saveProject(project: SeoProject): void {
  if (typeof window === 'undefined') return;
  try {
    const projects = getSavedProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);

    const updatedProject: SeoProject = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject;
    } else {
      projects.unshift(updatedProject);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    setActiveProjectId(updatedProject.id);
  } catch (err) {
    console.error('Failed to save project to localStorage:', err);
  }
}

export function createNewProject(
  name: string,
  siteUrl: string,
  answers: Phase0Answers,
  gscBundle?: Partial<GscExportBundle>,
  sitemap?: ParsedSitemap,
  analysisResult?: FullAnalysisResult
): SeoProject {
  const newProject: SeoProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'مشروع تحليل جديد',
    siteUrl: siteUrl.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase0Answers: answers,
    gscBundle,
    sitemap,
    analysisResult
  };

  saveProject(newProject);
  return newProject;
}

export function deleteProject(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const projects = getSavedProjects().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    if (getActiveProjectId() === id) {
      const nextActive = projects.length > 0 ? projects[0].id : null;
      setActiveProjectId(nextActive);
    }
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}

export function exportProjectToJson(project: SeoProject): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJson(jsonString: string): SeoProject {
  const project = JSON.parse(jsonString) as SeoProject;
  if (!project.id || !project.name) {
    throw new Error('ملف المشروع غير صالح أو تنقصه الحقول الإلزامية.');
  }
  project.id = `proj_${Date.now()}_import`;
  project.updatedAt = new Date().toISOString();
  saveProject(project);
  return project;
}
