export interface Skill {
  name: string;
  level: number; // 1-100
  category: 'Technical' | 'Soft' | 'Domain';
}

export interface LearningResource {
  title: string;
  type: 'Course' | 'Book' | 'Project' | 'Certification';
  provider?: string;
  link?: string;
  relevance: string;
}

export interface RoadmapStep {
  phase: string;
  objective: string;
  skillsToLearn: string[];
  duration: string;
  resources: LearningResource[];
}

export interface CareerPathOption {
  role: string;
  description: string;
  salaryExpectation: string;
  matchScore: number; // 1-100
  gapAnalysis: string[];
  roadmap: RoadmapStep[];
}

export interface CareerAnalysisResponse {
  currentProfile: {
    title: string;
    summary: string;
    extractedSkills: Skill[];
  };
  recommendedPaths: CareerPathOption[];
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  unit: string;
  location: string;
  fitIndex: number;
  status: 'ACTIVE' | 'ONBOARDING' | 'CRITICAL';
  tenure: string;
  region: string;
  alignmentPct?: number;
  topStrategyPath?: string;
  topStrategyReason?: string;
  isHighPotential?: boolean;
  retentionRisk?: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL';
  // Ingestion Fields
  resumeFileName?: string;
  resumeText?: string;
  resumeLines?: string[];
  skillsRaw?: string[];
  skillsGrouped?: Record<string, string[]>;
  summaryText?: string;
  experienceExtracted?: Array<{ 
    company?: string; 
    title?: string; 
    dates?: string; 
    location?: string;
    bullets?: string[] 
  }>;
  projectsExtracted?: Array<{
    name?: string;
    bullets?: string[];
  }>;
  educationExtracted?: string[];
  certificationsExtracted?: string[];
  // Contact Fields
  contactEmail?: string;
  contactPhone?: string;
  contactLinks?: string[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}