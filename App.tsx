import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Award, Briefcase, BrainCircuit, Sparkles, 
  AlertCircle, BarChart3, Map, GraduationCap, 
  LayoutDashboard, Users, Zap, ShieldCheck, 
  FileText, History, Bell, HelpCircle, 
  Download, Plus, ChevronDown,
  MoreHorizontal, X, TrendingUp, Target, Globe, Activity,
  Network, ArrowRight, CheckCircle2, RefreshCcw, LayoutGrid, List, Filter, Trash2, Eye, UserPlus, ExternalLink,
  Upload, File, Check, Loader2, ChevronRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AppStatus, CareerAnalysisResponse, Worker } from './types.ts';
import { analyzeCareerPath } from './services/geminiService.ts';
import SkillVisualizer from './components/SkillVisualizer.tsx';
import CareerRoadmap from './components/CareerRoadmap.tsx';

// --- Phases & Tokens ---
type UIPhase = 'boot' | 'resolve' | 'stable';
type KpiFilterType = 'ALL' | 'AGG_FIT' | 'HIGH_POTENTIAL' | 'RETENTION_RISK';

const SPRING_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 30 };
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// --- Components & Utilities ---

const getMatchTone = (pct: number) => {
  if (pct >= 85) return { bg: 'bg-[#16a34a]', text: 'text-[#16a34a]' }; // green
  if (pct >= 70) return { bg: 'bg-[#f59e0b]', text: 'text-[#b45309]' }; // amber (text darkened for readability)
  return { bg: 'bg-[#ef4444]', text: 'text-[#ef4444]' }; // red
};

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-slate-100 animate-pulse rounded overflow-hidden relative ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
  </div>
);

const CountUp: React.FC<{ end: number; suffix?: string; prefix?: string; duration?: number; phase: UIPhase }> = ({ end, suffix = "", prefix = "", duration = 1.2, phase }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'boot') return;
    if (shouldReduceMotion) {
      setDisplayValue(end);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / (duration * 1000), 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayValue(Math.floor(easedProgress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [end, duration, shouldReduceMotion, phase]);

  return <>{prefix}{displayValue.toLocaleString()}{suffix}</>;
};

const AnimatedCard: React.FC<{ 
  children: React.ReactNode; 
  phase: UIPhase; 
  index: number; 
  className?: string;
  onClick?: () => void;
  active?: boolean;
  role?: string;
  'aria-pressed'?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}> = ({ children, phase, index, className = "", onClick, active, ...rest }) => {
  const shouldReduceMotion = useReducedMotion();
  
  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.42, 
        delay: index * 0.05,
        ease: EASE_OUT
      }
    },
    resolve: {
      filter: "blur(2px)",
      opacity: 0.6,
    },
    stable: {
      filter: "blur(0px)",
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate={phase === 'boot' ? "hidden" : phase === 'resolve' ? "visible" : "stable"}
      variants={variants}
      whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.005, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md cursor-pointer ${active ? 'border-brand-primary bg-brand-primarySoft' : 'border-slate-100'} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

const LiveBadge: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(prev => (prev + 1) % 60);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-brand-primary rounded-full text-[10px] font-bold border border-blue-100 uppercase tracking-widest">
      <motion.span 
        animate={{ opacity: [1, 0.4, 1] }} 
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-1.5 h-1.5 rounded-full bg-brand-primary"
      ></motion.span>
      SYNC LIVE • {lastUpdate === 0 ? "Just now" : `${lastUpdate}s ago`}
    </div>
  );
};

// --- Mock Data ---

const INITIAL_WORKERS: Worker[] = [
  { id: 'EMP-001', name: 'Alex Jensen', role: 'QA Automation Engineer', unit: 'Engineering', location: 'Austin, TX', fitIndex: 85, status: 'ACTIVE', tenure: '4 years', region: 'Austin, TX', alignmentPct: 92, topStrategyPath: 'Senior AI Implementation Lead', topStrategyReason: 'Deep expertise in automated verification of complex GenAI outputs.', isHighPotential: true, retentionRisk: 'NONE' },
  { id: 'EMP-005', name: 'David Smith', role: 'Backend Developer', unit: 'Engineering', location: 'Austin, TX', fitIndex: 81, status: 'ACTIVE', tenure: '2 years', region: 'Austin, TX', alignmentPct: 78, topStrategyPath: 'Distributed Systems Architect', topStrategyReason: 'Demonstrated proficiency in low-latency infrastructure design.', isHighPotential: false, retentionRisk: 'LOW' },
  { id: 'EMP-003', name: 'Elena Rodriguez', role: 'Product Manager', unit: 'Product', location: 'Madrid, Spain', fitIndex: 74, status: 'ONBOARDING', tenure: '1 year', region: 'Europe', alignmentPct: 88, topStrategyPath: 'AI Product Strategy Director', topStrategyReason: 'Cross-functional leadership in highly regulated European markets.', isHighPotential: false, retentionRisk: 'NONE' },
  { id: 'EMP-008', name: 'James Wilson', role: 'Cloud Architect', unit: 'Engineering', location: 'London, UK', fitIndex: 65, status: 'ACTIVE', tenure: '3 years', region: 'UK', alignmentPct: 72, topStrategyPath: 'Multi-Cloud Security Lead', topStrategyReason: 'Validated experience in London financial sector compliance.', isHighPotential: false, retentionRisk: 'CRITICAL' },
  { id: 'EMP-006', name: 'Kenji Sato', role: 'SRE Engineer', unit: 'SRE', location: 'Tokyo, Japan', fitIndex: 77, status: 'ONBOARDING', tenure: '1 year', region: 'Japan', alignmentPct: 81, topStrategyPath: 'Global Availability Director', topStrategyReason: 'Specializes in high-scale incident response for APAC markets.', isHighPotential: false, retentionRisk: 'LOW' },
  { id: 'EMP-009', name: 'Lisa Brown', role: 'ML Engineer', unit: 'Engineering', location: 'San Francisco, CA', fitIndex: 91, status: 'ACTIVE', tenure: '5 years', region: 'West Coast', alignmentPct: 95, topStrategyPath: 'Principal LLM Scientist', topStrategyReason: 'Lead contributor to internal proprietary reasoning models.', isHighPotential: true, retentionRisk: 'NONE' },
  { id: 'EMP-002', name: 'Marcus Thorne', role: 'Senior Cloud Engineer', unit: 'Engineering', location: 'San Francisco, CA', fitIndex: 92, status: 'ACTIVE', tenure: '6 years', region: 'West Coast', alignmentPct: 94, topStrategyPath: 'Cloud Platform Director', topStrategyReason: 'Architect of the current enterprise zero-trust backbone.', isHighPotential: true, retentionRisk: 'NONE' },
  { id: 'EMP-007', name: 'Maria Garcia', role: 'UI Designer', unit: 'Design', location: 'New York, NY', fitIndex: 89, status: 'ACTIVE', tenure: '3 years', region: 'East Coast', alignmentPct: 85, topStrategyPath: 'Design Systems Principal', topStrategyReason: 'Created the unified accessibility-first design standard.', isHighPotential: false, retentionRisk: 'LOW' },
  { id: 'EMP-004', name: 'Priya Sharma', role: 'AI Research Scientist', unit: 'Data Science', location: 'Bangalore, India', fitIndex: 96, status: 'ACTIVE', tenure: '4 years', region: 'India', alignmentPct: 98, topStrategyPath: 'AI Ethics & Governance Lead', topStrategyReason: 'Global authority on bias mitigation in multi-modal LLMs.', isHighPotential: true, retentionRisk: 'NONE' },
  { id: 'EMP-010', name: 'Sarah Chen', role: 'Engineering Manager', unit: 'Engineering', location: 'San Francisco, CA', fitIndex: 88, status: 'ACTIVE', tenure: '7 years', region: 'West Coast', alignmentPct: 89, topStrategyPath: 'VP of Engineering', topStrategyReason: 'Exceptional retention rates and velocity delivery records.', isHighPotential: true, retentionRisk: 'NONE' },
  { id: 'EMP-011', name: 'Michael Chen', role: 'Data Engineer', unit: 'Data Science', location: 'Seattle, WA', fitIndex: 83, status: 'ACTIVE', tenure: '3 years', region: 'West Coast', alignmentPct: 82, topStrategyPath: 'Data Reliability Lead', topStrategyReason: 'Expert in large-scale ETL pipeline optimization.', isHighPotential: false, retentionRisk: 'MEDIUM' },
];

const DEMAND_DATA = [
  { name: 'Q1 24', value: 280 },
  { name: 'Q2 24', value: 420 },
  { name: 'Q3 24', value: 390 },
  { name: 'Q4 24', value: 550 },
  { name: 'Q1 25', value: 590 },
  { name: 'Q2 25', value: 700 },
];

const GAP_DATA = [
  { name: 'CRITICAL', value: 124, color: '#991b1b' },
  { name: 'HIGH', value: 342, color: '#9a3412' },
  { name: 'MEDIUM', value: 680, color: '#0A66C2' },
  { name: 'STABLE', value: 1436, color: '#065f46' },
];

const FUNNEL_DATA = [
  { name: 'Ready Now', value: 412 },
  { name: 'Upskill 30d', value: 842 },
  { name: 'Upskill 90d', value: 1240 },
  { name: 'Unmapped', value: 248 },
];

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'talent' | 'mobility'>('intelligence');
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(INITIAL_WORKERS[0]);
  const [analysis, setAnalysis] = useState<CareerAnalysisResponse | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [resumeInput, setResumeInput] = useState('');
  
  // Dashboard Lifecycle State
  const [uiPhase, setUiPhase] = useState<UIPhase>('boot');
  const [liveMetrics, setLiveMetrics] = useState({
    workforce: INITIAL_WORKERS.length,
    velocity: 84,
    shortage: 'GenAI Sec'
  });

  // Talent Network Specific State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilterType>('ALL');
  const [filters, setFilters] = useState({
    status: 'ALL',
    minFit: 0,
    unit: 'ALL',
    location: 'ALL'
  });

  // Ingestion State
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionProgress, setIngestionProgress] = useState(0);
  const [ingestionFile, setIngestionFile] = useState<File | null>(null);
  const [showExtractionPreview, setShowExtractionPreview] = useState(false);
  const [ingestedData, setIngestedData] = useState<Partial<Worker> | null>(null);
  const [expandedSkillsId, setExpandedSkillsId] = useState<string | null>(null);
  const [nameDetectionCertain, setNameDetectionCertain] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (activeTab === 'intelligence' || activeTab === 'talent') {
      setUiPhase('boot');
      const bootTimer = setTimeout(() => setUiPhase('resolve'), 300);
      const stableTimer = setTimeout(() => setUiPhase('stable'), 900);
      return () => {
        clearTimeout(bootTimer);
        clearTimeout(stableTimer);
      };
    }
  }, [activeTab]);

  // Live Sync Logic
  useEffect(() => {
    if (activeTab !== 'intelligence') return;
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        workforce: prev.workforce + (Math.random() > 0.8 ? 1 : 0),
        velocity: Math.min(100, prev.velocity + (Math.random() > 0.5 ? 0.1 : -0.1))
      }));
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleAnalyze = async () => {
    if (!resumeInput.trim()) return;
    setStatus(AppStatus.LOADING);
    try {
      const result = await analyzeCareerPath(resumeInput);
      setAnalysis(result);
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setStatus(AppStatus.ERROR);
    }
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      // 1. KPI Tab Filter
      let passKpi = true;
      if (activeKpiFilter === 'AGG_FIT') passKpi = w.fitIndex >= 85;
      else if (activeKpiFilter === 'HIGH_POTENTIAL') passKpi = !!w.isHighPotential;
      else if (activeKpiFilter === 'RETENTION_RISK') passKpi = w.retentionRisk === 'CRITICAL';

      if (!passKpi) return false;

      // 2. Advanced Filters
      const matchesStatus = filters.status === 'ALL' || w.status === filters.status;
      const matchesUnit = filters.unit === 'ALL' || w.unit === filters.unit;
      const matchesFit = w.fitIndex >= filters.minFit;
      const matchesLocation = filters.location === 'ALL' || w.location.includes(filters.location);

      if (!(matchesStatus && matchesUnit && matchesFit && matchesLocation)) return false;

      // 3. Search Filter
      const matchesSearch = 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.location.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [workers, searchQuery, filters, activeKpiFilter]);

  // Auto-selection logic: if the currently selected worker is filtered out, pick the first visible one.
  useEffect(() => {
    if (activeTab === 'talent' && selectedWorker) {
      const isStillVisible = filteredWorkers.some(w => w.id === selectedWorker.id);
      if (!isStillVisible) {
        setSelectedWorker(filteredWorkers.length > 0 ? filteredWorkers[0] : null);
      }
    }
  }, [filteredWorkers, activeTab, selectedWorker]);

  const kpiData = useMemo(() => {
    const total = workers.length;
    const avgFit = total > 0 ? Math.round(workers.reduce((acc, w) => acc + w.fitIndex, 0) / total) : 0;
    const highPot = workers.filter(w => w.isHighPotential).length;
    const riskCount = workers.filter(w => w.retentionRisk === 'CRITICAL').length;
    
    return [
      { id: 'ALL' as KpiFilterType, label: 'TOTAL TALENT BASE', value: total, sub: 'NODES', icon: Users, color: 'text-brand-primary' },
      { id: 'AGG_FIT' as KpiFilterType, label: 'AGGREGATE FIT', value: avgFit, suffix: '%', sub: 'ALIGNMENT', icon: Zap, color: 'text-brand-primary' },
      { id: 'HIGH_POTENTIAL' as KpiFilterType, label: 'HIGH POTENTIAL', value: highPot, sub: 'LEADERS', icon: Sparkles, color: 'text-brand-gold' },
      { id: 'RETENTION_RISK' as KpiFilterType, label: 'RETENTION RISK', value: riskCount, sub: 'CRITICAL', icon: AlertCircle, color: 'text-red-500' },
    ];
  }, [workers]);

  const handleExportCSV = () => {
    const dataToExport = selectedRowIds.size > 0 
      ? workers.filter(w => selectedRowIds.has(w.id))
      : filteredWorkers;

    const headers = ["Employee ID", "Name", "Role", "Unit", "Location", "Fit Index", "Status", "Tenure", "Region", "Alignment %"];
    const csvRows = dataToExport.map(w => [
      `"${w.id}"`, 
      `"${w.name}"`, 
      `"${w.role}"`, 
      `"${w.unit}"`, 
      `"${w.location}"`, 
      w.fitIndex, 
      `"${w.status}"`, 
      `"${w.tenure}"`, 
      `"${w.region}"`, 
      w.alignmentPct || 0
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `talent_network_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Ingestion Logic ---

  const parseResumeText = (text: string) => {
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const normalizedLines = rawLines.map(line => line.replace(/\s+/g, ' '));
    
    // 1. Strict Section Detection
    const sections: Record<string, string[]> = {
      HEADER: [],
      SUMMARY: [],
      EDUCATION: [],
      EXPERIENCE: [],
      PROJECTS: [],
      TECHNICAL_SKILLS: [],
      CERTIFICATIONS: [],
      PROFESSIONAL_SKILLS: []
    };

    const sectionMapping: Record<string, string> = {
      'SUMMARY': 'SUMMARY',
      'EDUCATION': 'EDUCATION',
      'EXPERIENCE': 'EXPERIENCE',
      'PROJECTS': 'PROJECTS',
      'TECHNICAL SKILLS': 'TECHNICAL_SKILLS',
      'CERTIFICATIONS': 'CERTIFICATIONS',
      'PROFESSIONAL SKILLS': 'PROFESSIONAL_SKILLS'
    };

    let currentSection = 'HEADER';
    normalizedLines.forEach(line => {
      const upperLine = line.toUpperCase();
      if (sectionMapping[upperLine]) {
        currentSection = sectionMapping[upperLine];
      } else {
        sections[currentSection].push(line);
      }
    });

    // 2. Header Contact Parsing
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    const contactEmail = text.match(emailRegex)?.[0];
    const contactPhone = text.match(phoneRegex)?.[0];
    const contactLinks = text.match(urlRegex) || [];

    // Header Name Extraction (Line 1-2)
    let detectedName = '';
    let nameCertainty = false;
    for (const line of normalizedLines.slice(0, 2)) {
      let cleanLine = line
        .replace(emailRegex, '')
        .replace(phoneRegex, '')
        .replace(urlRegex, '')
        .replace(/[|•\-—]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const words = cleanLine.split(' ').filter(w => w.length > 1);
      if (words.length >= 2 && words.length <= 5) {
        const uppercaseCount = words.filter(w => /^[A-Z]/.test(w)).length;
        if (uppercaseCount >= words.length - 1) {
          detectedName = cleanLine;
          nameCertainty = true;
          break;
        }
      }
    }

    // 3. Summary Extraction
    const summaryText = sections.SUMMARY.join(' ');

    // 4. Experience Parsing (Structural)
    const experience: any[] = [];
    let currentExp: any = null;

    sections.EXPERIENCE.forEach(line => {
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
      const hasDateRange = /([A-Z][a-z]{2,8}\s\d{4})|(\d{4})/.test(line) && (line.includes('Present') || line.includes('–') || line.includes('-'));

      if (hasDateRange && !isBullet) {
        if (currentExp) experience.push(currentExp);
        currentExp = { 
          company: line.split(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}/)[0].trim().replace(/[–-]$/, ''),
          dates: (line.match(/([A-Z][a-z]+\s\d{4}\s[–-]\s(Present|[A-Z][a-z]+\s\d{4}))|(\d{4}\s[–-]\s\d{4})/)?.[0] || ''),
          bullets: []
        };
      } else if (currentExp && !isBullet && !currentExp.title) {
        const parts = line.split(/[|,]/);
        currentExp.title = parts[0].trim();
        currentExp.location = parts[1]?.trim() || '';
      } else if (currentExp && isBullet) {
        currentExp.bullets.push(line.replace(/^[•\-*]\s?/, '').trim());
      }
    });
    if (currentExp) experience.push(currentExp);

    // 5. Projects Parsing
    const projects: any[] = [];
    let currentProj: any = null;

    sections.PROJECTS.forEach(line => {
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
      if (!isBullet && line.length > 5 && line.length < 100) {
        if (currentProj) projects.push(currentProj);
        currentProj = { name: line, bullets: [] };
      } else if (currentProj && isBullet) {
        currentProj.bullets.push(line.replace(/^[•\-*]\s?/, '').trim());
      }
    });
    if (currentProj) projects.push(currentProj);

    // 6. Technical Skills Parsing (Category-based)
    const skillsGrouped: Record<string, string[]> = {
      Languages: [],
      ML_AI: [],
      Frameworks_Tools: [],
      Cloud_Analytics: [],
      Testing_QA: [],
      Practices_Certs: [],
      Professional_Skills: [],
      Other: []
    };

    const headerMap: Record<string, string> = {
      'LANGUAGES': 'Languages',
      'ML & AI': 'ML_AI',
      'FRAMEWORKS & TOOLS': 'Frameworks_Tools',
      'CLOUD & ANALYTICS': 'Cloud_Analytics',
      'TESTING & QUALITY ASSURANCE': 'Testing_QA',
      'PRACTICES & CERTS': 'Practices_Certs',
      'PROFESSIONAL SKILLS': 'Professional_Skills'
    };

    sections.TECHNICAL_SKILLS.forEach(line => {
      if (line.includes(':')) {
        const [catRaw, itemsRaw] = line.split(':');
        const targetKey = headerMap[catRaw.trim().toUpperCase()] || 'Other';
        const items = itemsRaw.split(',').map(i => i.trim()).filter(i => i.length > 0);
        skillsGrouped[targetKey].push(...items);
      }
    });

    const skillsRaw = [...new Set(Object.values(skillsGrouped).flat())];

    return {
      name: detectedName,
      nameCertainty,
      summaryText,
      location: sections.HEADER.find(l => l.includes(', ')) || '',
      role: normalizedLines[1] || '',
      skillsRaw,
      skillsGrouped,
      resumeLines: normalizedLines,
      experienceExtracted: experience,
      projectsExtracted: projects,
      educationExtracted: sections.EDUCATION,
      certificationsExtracted: sections.CERTIFICATIONS,
      resumeText: text,
      contactEmail,
      contactPhone,
      contactLinks
    };
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIngestionFile(file);
    setIsIngesting(true);
    setIngestionProgress(10);
    setNameDetectionCertain(true);

    try {
      let text = '';
      if (file.type === 'text/plain') {
        text = await file.text();
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(' ');
        }
        text = fullText;
      }

      setIngestionProgress(60);
      const parsedData = parseResumeText(text);
      setIngestionProgress(100);
      
      setTimeout(() => {
        setIngestedData(parsedData);
        setIsIngesting(false);
        setNameDetectionCertain(parsedData.nameCertainty);
        // Autofill logic
        if (formRef.current) {
          const nameInput = formRef.current.querySelector('input[name="name"]') as HTMLInputElement;
          const roleInput = formRef.current.querySelector('input[name="role"]') as HTMLInputElement;
          const locInput = formRef.current.querySelector('input[name="location"]') as HTMLInputElement;
          if (nameInput && parsedData.name) nameInput.value = parsedData.name;
          if (roleInput && parsedData.role) roleInput.value = parsedData.role;
          if (locInput && parsedData.location) locInput.value = parsedData.location;
        }
      }, 500);

    } catch (err) {
      console.error('Parsing failed:', err);
      setIsIngesting(false);
      alert('Failed to parse resume. Manual entry remains available.');
    }
  };

  const handleAddWorker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newWorker: Worker = {
      id: `EMP-${Math.floor(Math.random() * 900) + 100}`,
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      unit: formData.get('unit') as string,
      location: formData.get('location') as string,
      status: formData.get('status') as any,
      fitIndex: Math.floor(Math.random() * 40) + 60,
      tenure: '0 years',
      region: 'Unknown',
      alignmentPct: 75,
      topStrategyPath: 'Growth Path Pending',
      topStrategyReason: 'Initial onboarding assessment required.',
      isHighPotential: false,
      retentionRisk: 'NONE',
      ...ingestedData,
      resumeFileName: ingestionFile?.name
    };

    setWorkers(prev => [newWorker, ...prev]);
    setSelectedWorker(newWorker);
    setIsAddWorkerOpen(false);
    // Reset ingestion state
    setIngestionFile(null);
    setIngestedData(null);
    setShowExtractionPreview(false);
    setNameDetectionCertain(true);
  };

  const handleDeleteWorker = (id: string) => {
    if (confirm("Are you sure you want to remove this workforce node from the network?")) {
      setWorkers(prev => prev.filter(w => w.id !== id));
      if (selectedWorker?.id === id) setSelectedWorker(null);
      setOpenKebabId(null);
    }
  };

  const renderIntelligenceConsole = () => {
    const isBoot = uiPhase === 'boot';

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-3">
              INTELLIGENCE CONSOLE
              <LiveBadge />
            </h1>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Global search..." className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-64 shadow-sm" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
              <Download size={14} /> Export BI
            </button>
          </motion.div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'WORKFORCE', value: liveMetrics.workforce, sub: 'Verified Nodes', icon: Users, color: 'text-brand-primary' },
            { label: 'PEAK SHORTAGE', value: liveMetrics.shortage, sub: 'Security Gaps', icon: AlertCircle, color: 'text-red-500', isText: true },
            { label: 'ROLE DEMAND', value: 'MLOps Lead', sub: '42 Requisitions', icon: TrendingUp, color: 'text-brand-primary', isText: true },
            { label: 'RISK ZONE', value: 'APAC', sub: '22% Churn Risk', icon: Globe, color: 'text-red-500', isText: true },
            { label: 'VELOCITY', value: Math.floor(liveMetrics.velocity), suffix: '%', sub: 'Upskill Pace', icon: Activity, color: 'text-emerald-500' },
          ].map((stat, i) => (
            <AnimatedCard key={i} phase={uiPhase} index={i} className="p-4 overflow-hidden relative">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                <stat.icon size={14} className="text-slate-300" />
              </div>
              <AnimatePresence mode="wait">
                {isBoot ? (
                  <Skeleton key="skeleton" className="h-6 w-24 mb-1" />
                ) : (
                  <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-black text-slate-900 leading-none mb-1">
                    {stat.isText ? stat.value : <CountUp end={typeof stat.value === 'number' ? stat.value : 0} suffix={stat.suffix} phase={uiPhase} />}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{stat.sub}</div>
              {uiPhase === 'stable' && !stat.isText && (
                <motion.div 
                  key={`pulse-${stat.value}`} 
                  initial={{ opacity: 0.6, scale: 1 }} 
                  animate={{ opacity: 0, scale: 1.2 }} 
                  className="absolute inset-0 bg-brand-primary/5 pointer-events-none"
                />
              )}
            </AnimatedCard>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-3 gap-6">
          <AnimatedCard phase={uiPhase} index={5} className="col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Demand Forecast</h3>
              <div className="text-slate-300 cursor-help"><HelpCircle size={14}/></div>
            </div>
            <div className="h-[240px]">
              <AnimatePresence mode="wait">
                {isBoot ? (
                  <Skeleton key="skeleton" className="w-full h-full rounded-lg" />
                ) : (
                  <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={DEMAND_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#0A66C2" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#0A66C2', strokeWidth: 2, stroke: '#fff' }} 
                          activeDot={{ r: 6 }} 
                          animationDuration={shouldReduceMotion ? 0 : 1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AnimatedCard>

          <AnimatedCard phase={uiPhase} index={6} className="p-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Gap Distribution</h3>
            <div className="h-[240px] relative flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isBoot ? (
                  <Skeleton key="skeleton" className="w-40 h-40 rounded-full" />
                ) : (
                  <motion.div key="content" className="relative">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none z-10"
                    >
                      <div className="text-2xl font-black text-slate-900"><CountUp end={2482} phase={uiPhase} /></div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Gaps</div>
                    </motion.div>
                    <div className="w-40 h-40 flex items-center justify-center relative">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 0.6 }} transition={{ duration: 1.5 }} cx="50" cy="50" r="40" fill="none" stroke="#0A66C2" strokeWidth="12" />
                        <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 0.15 }} transition={{ duration: 1, delay: 0.5 }} cx="50" cy="50" r="40" fill="none" stroke="#991b1b" strokeWidth="12" strokeDasharray="251" strokeDashoffset="-150" />
                        <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 0.1 }} transition={{ duration: 1, delay: 0.7 }} cx="50" cy="50" r="40" fill="none" stroke="#9a3412" strokeWidth="12" strokeDasharray="251" strokeDashoffset="-188" />
                        <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 0.15 }} transition={{ duration: 1, delay: 0.9 }} cx="50" cy="50" r="40" fill="none" stroke="#065f46" strokeWidth="12" strokeDasharray="251" strokeDashoffset="-213" />
                      </svg>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-2">
              {GAP_DATA.map((gap, i) => (
                <div key={gap.name} className="flex items-center gap-2">
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + i * 0.1 }}
                    className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: gap.color }}
                  ></motion.div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{gap.name}</span>
                  <span className="text-[9px] font-black text-slate-900 ml-auto">
                    {isBoot ? "..." : <CountUp end={typeof gap.value === 'number' ? gap.value : 0} phase={uiPhase} />} Units
                  </span>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6">
          <AnimatedCard phase={uiPhase} index={7} className="p-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Capability Shortage Treemap</h3>
            <div className="grid grid-cols-4 grid-rows-2 h-[200px] gap-1">
              {[
                { label: 'GenAI Audit', span: 'col-span-1 row-span-1', color: 'bg-[#004E93]' },
                { label: 'LLM SecOps', span: 'col-span-1 row-span-1', color: 'bg-[#0058A3]' },
                { label: 'Kubernetes', span: 'col-span-1 row-span-1', color: 'bg-[#003C71]' },
                { label: 'MLOps Hub', span: 'col-span-1 row-span-1', color: 'bg-[#004E93]' },
                { label: 'Data Ethics', span: 'col-span-1', color: 'bg-[#0058A3]' },
                { label: 'Prompt Eng', span: 'col-span-1', color: 'bg-[#003C71]' },
                { label: 'Cloud Arch', span: 'col-span-2', color: 'bg-[#004E93]' },
              ].map((tile, i) => (
                <AnimatePresence key={i} mode="wait">
                  {isBoot ? (
                    <Skeleton key="skeleton" className={`${tile.span} h-full`} />
                  ) : (
                    <motion.div 
                      key="tile"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.04, duration: 0.3 }}
                      whileHover={{ filter: "brightness(1.1)", scale: 1.02 }}
                      className={`${tile.span} ${tile.color} text-white p-3 rounded flex items-center font-bold text-[10px] cursor-pointer`}
                    >
                      {tile.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard phase={uiPhase} index={8} className="p-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Regional Skill Intensity</h3>
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="text-slate-400 uppercase font-bold border-b border-slate-50">
                  <th className="pb-3">Cluster</th>
                  <th className="pb-3 text-center">Americas</th>
                  <th className="pb-3 text-center">EMEA</th>
                  <th className="pb-3 text-center">APAC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { name: 'GenAI & LLMs', am: 85, emea: 42, apac: 12 },
                  { name: 'Cloud Native', am: 22, emea: 55, apac: 45 },
                  { name: 'Cybersecurity', am: 48, emea: 18, apac: 62 },
                  { name: 'Data Strategy', am: 12, emea: 28, apac: 55 },
                ].map((row, i) => (
                  <tr key={row.name}>
                    <td className="py-3 font-bold text-slate-700">{row.name}</td>
                    {[row.am, row.emea, row.apac].map((val, j) => (
                      <td key={j} className="p-1">
                        <AnimatePresence mode="wait">
                          {isBoot ? (
                            <Skeleton key="skeleton" className="h-6 w-full" />
                          ) : (
                            <motion.div 
                              key="cell"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.6 + (i * 3 + j) * 0.03 }}
                              className={`text-center py-2 ${val > 70 ? 'bg-brand-primary text-white' : val > 40 ? 'bg-blue-400 text-white' : 'bg-brand-primarySoft text-brand-primary'} rounded-sm font-bold`}
                            >
                              {val}%
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </AnimatedCard>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-2 gap-6 pb-8">
          <AnimatedCard phase={uiPhase} index={9} className="p-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Workforce Readiness Funnel</h3>
            <div className="space-y-4">
              {FUNNEL_DATA.map((item, i) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-24 text-[10px] font-bold text-slate-400 uppercase">{item.name}</div>
                  <div className="flex-1 bg-slate-50 h-6 rounded-sm relative overflow-hidden">
                    {isBoot ? (
                      <Skeleton className="h-full w-full" />
                    ) : (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / 1240) * 100}%` }}
                        transition={{ duration: 1.2, delay: 0.7 + i * 0.1, ease: EASE_OUT }}
                        className="bg-brand-primary h-full shadow-sm"
                      />
                    )}
                  </div>
                  <div className="w-8 text-[10px] font-black text-slate-900">{isBoot ? "..." : <CountUp end={item.value} phase={uiPhase} />}</div>
                </div>
              ))}
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
              className="mt-6 p-4 bg-brand-primarySoft border border-blue-100 rounded-xl flex items-center justify-between"
            >
               <div className="text-[10px] font-bold text-brand-primary">Q3 IMPACT FORECAST <span className="text-blue-600 ml-2">+12.4% Strategic Lift</span></div>
               <button className="px-3 py-1 bg-white border border-blue-200 text-[9px] font-black text-brand-primary rounded uppercase tracking-widest shadow-sm hover:bg-brand-primarySoft transition-all active:scale-95">Optimize</button>
            </motion.div>
          </AnimatedCard>

          <AnimatedCard phase={uiPhase} index={10} className="p-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Active Upskilling Roadmap</h3>
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="text-slate-400 uppercase font-bold border-b border-slate-50">
                  <th className="pb-3">Target Role</th>
                  <th className="pb-3">Skill Cluster</th>
                  <th className="pb-3 text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { role: 'Senior AI Engineer', cluster: 'GenAI & LLMs', comp: 74 },
                  { role: 'Cloud Architect', cluster: 'Cloud Native', comp: 92 },
                  { role: 'SecOps Analyst', cluster: 'Cybersecurity', comp: 45 },
                  { role: 'Data Strategist', cluster: 'Data Eng', comp: 88 },
                ].map((row, i) => (
                  <tr key={row.role}>
                    <td className="py-3 font-bold text-slate-700">{row.role}</td>
                    <td className="py-3 text-slate-500">{row.cluster}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                          {isBoot ? (
                            <Skeleton className="h-full w-full" />
                          ) : (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${row.comp}%` }}
                              transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                              className="bg-brand-primary h-full"
                            />
                          )}
                        </div>
                        <span className="font-black text-slate-900 w-8 text-right">{isBoot ? "..." : <CountUp end={row.comp} suffix="%" phase={uiPhase} />}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 text-center">
              <button className="text-[10px] font-bold text-brand-primary hover:text-brand-primaryHover transition-colors">Explore Full Program Catalog →</button>
            </div>
          </AnimatedCard>
        </div>
      </div>
    );
  };

  const renderTalentNetwork = () => {
    const isBoot = uiPhase === 'boot';

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
              <Map size={12} /> Intelligence <span className="text-slate-300">/</span> Talent Network
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              Talent Network
              <span className="flex items-center gap-1 text-[10px] bg-brand-primarySoft text-brand-primary px-2 py-0.5 rounded font-bold border border-blue-100 uppercase tracking-widest">
                <Zap size={10} fill="currentColor" /> {workers.length} NODES
              </span>
              <span className="flex items-center gap-1 text-[10px] bg-brand-goldSoft text-brand-gold px-2 py-0.5 rounded font-bold border border-brand-goldBorder uppercase tracking-widest">
                <ShieldCheck size={10} /> GOVERNANCE PASSED
              </span>
            </h1>
          </motion.div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
            >
              <Download size={14} /> Export Records
            </button>
            <button 
              onClick={() => setIsAddWorkerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
            >
              <UserPlus size={14} /> Add Workforce Node
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {kpiData.map((stat, i) => (
            <AnimatedCard 
              key={i} 
              phase={uiPhase} 
              index={i} 
              className={`p-5 transition-colors group relative overflow-hidden`}
              onClick={() => setActiveKpiFilter(stat.id)}
              active={activeKpiFilter === stat.id}
              role="button"
              aria-pressed={activeKpiFilter === stat.id}
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveKpiFilter(stat.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeKpiFilter === stat.id ? 'text-brand-primary' : 'text-slate-400'}`}>{stat.label}</div>
                <stat.icon size={16} className={`${activeKpiFilter === stat.id ? (stat.id === 'HIGH_POTENTIAL' ? 'text-brand-gold' : 'text-brand-primary') : 'text-slate-300'}`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black transition-colors ${activeKpiFilter === stat.id ? (stat.id === 'HIGH_POTENTIAL' ? 'text-brand-gold' : 'text-brand-primary') : stat.color}`}>
                  {isBoot ? "..." : <CountUp end={stat.value} suffix={stat.suffix} phase={uiPhase} />}
                </span>
                <span className={`text-[10px] font-bold uppercase ${activeKpiFilter === stat.id ? 'text-blue-500/70' : 'text-slate-400'}`}>{stat.sub}</span>
              </div>
              {activeKpiFilter === stat.id && (
                <motion.div layoutId="kpi-indicator" className={`absolute bottom-0 left-0 right-0 h-1 ${stat.id === 'HIGH_POTENTIAL' ? 'bg-brand-gold' : 'bg-brand-primary'}`} />
              )}
            </AnimatedCard>
          ))}
        </div>

        <div className="flex gap-6 h-[calc(100vh-22rem)] min-h-[500px]">
          {/* Main Table Column */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, role, ID..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${showFilters ? 'bg-brand-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                >
                  <Filter size={14} /> Advanced Matrix
                </button>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {filteredWorkers.length} NODES IDENTIFIED
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={() => setViewMode('table')} className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}><List size={16}/></button>
                <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded transition-all ${viewMode === 'cards' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16}/></button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 py-4 border-b border-slate-100 bg-slate-50 overflow-hidden flex flex-wrap gap-8"
                >
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Stream</label>
                    <div className="flex gap-2">
                      {['ALL', 'ACTIVE', 'ONBOARDING'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setFilters(f => ({ ...f, status: s }))}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${filters.status === s ? 'bg-brand-primary text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 min-w-[200px] max-w-xs">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Minimal Fit Index</label>
                      <span className="text-[10px] font-bold text-brand-primary">{filters.minFit}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={filters.minFit}
                      onChange={(e) => setFilters(f => ({ ...f, minFit: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-primary shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Business Unit</label>
                    <select 
                      value={filters.unit}
                      onChange={(e) => setFilters(f => ({ ...f, unit: e.target.value }))}
                      className="block w-44 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-brand-primary/20 shadow-sm"
                    >
                      <option value="ALL">ALL UNITS</option>
                      <option value="Engineering">ENGINEERING</option>
                      <option value="Product">PRODUCT</option>
                      <option value="SRE">SRE</option>
                      <option value="Design">DESIGN</option>
                      <option value="Data Science">DATA SCIENCE</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-auto">
              {filteredWorkers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                      <Search size={32}/>
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Node matches</h4>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed max-w-xs mt-1">Refine your search parameters or tab selection to identify workforce segments.</p>
                   </div>
                   <button onClick={() => { setActiveKpiFilter('ALL'); setFilters({ status: 'ALL', minFit: 0, unit: 'ALL', location: 'ALL' }); setSearchQuery(''); }} className="text-[10px] font-black text-brand-primary hover:text-brand-primaryHover uppercase tracking-widest">Clear All Filters</button>
                </div>
              ) : (
                viewMode === 'table' ? (
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                      <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4 w-12">
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRowIds(new Set(filteredWorkers.map(w => w.id)));
                              else setSelectedRowIds(new Set());
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer" 
                          />
                        </th>
                        <th className="px-6 py-4 w-1/4">Worker Profile</th>
                        <th className="px-6 py-4 w-1/4">Org / Role</th>
                        <th className="px-6 py-4 w-1/5">Geo Location</th>
                        <th className="px-6 py-4 w-1/5">Match Index</th>
                        <th className="px-6 py-4 w-24 text-center">Status</th>
                        <th className="px-6 py-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredWorkers.map((w, idx) => {
                        const tone = getMatchTone(w.fitIndex);
                        return (
                          <motion.tr 
                            key={w.id} 
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => setSelectedWorker(w)}
                            className={`group cursor-pointer transition-all duration-200 ${selectedWorker?.id === w.id ? 'bg-brand-primarySoft' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedRowIds.has(w.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedRowIds);
                                  if (e.target.checked) next.add(w.id);
                                  else next.delete(w.id);
                                  setSelectedRowIds(next);
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer" 
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 shrink-0 bg-brand-primarySoft text-brand-primary rounded-full flex items-center justify-center text-[10px] font-black border border-blue-200/50">
                                  {w.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 group-hover:text-brand-primary transition-colors truncate">{w.name}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{w.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 overflow-hidden">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-700 truncate">{w.role}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase truncate">{w.unit}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 overflow-hidden">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                                <Globe size={12} className="text-slate-300 shrink-0" /> {w.location}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${w.fitIndex}%` }} transition={{ duration: 1, delay: idx * 0.05 }} className={`${tone.bg} h-full shadow-sm`} />
                                </div>
                                <span className={`text-[10px] font-black ${tone.text} w-8`}>{w.fitIndex}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${w.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {w.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => setOpenKebabId(openKebabId === w.id ? null : w.id)}
                                className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              ><MoreHorizontal size={14}/></button>
                              
                              <AnimatePresence>
                                {openKebabId === w.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className="absolute right-6 top-10 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20"
                                  >
                                    <button onClick={() => { setSelectedWorker(w); setOpenKebabId(null); }} className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 uppercase tracking-widest"><Eye size={12}/> View Profile</button>
                                    <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 uppercase tracking-widest"><Download size={12}/> Export Record</button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button onClick={() => handleDeleteWorker(w.id)} className="w-full px-4 py-2 text-left text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 uppercase tracking-widest"><Trash2 size={12}/> Remove Node</button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                    {filteredWorkers.map((w, idx) => {
                      const tone = getMatchTone(w.fitIndex);
                      return (
                        <motion.div 
                          key={w.id} 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => setSelectedWorker(w)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${selectedWorker?.id === w.id ? 'border-brand-primary bg-brand-primarySoft ring-2 ring-blue-100' : 'border-slate-100 hover:border-brand-primarySoft hover:shadow-md bg-white'}`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-primaryHover text-white rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-blue-100">
                              {w.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${w.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{w.status}</span>
                          </div>
                          <div className="text-sm font-black text-slate-900 truncate group-hover:text-brand-primary transition-colors">{w.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase truncate mb-3">{w.role}</div>
                          <div className="space-y-2 pt-3 border-t border-slate-50">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <span>Fit Alignment</span>
                              <span className={`font-black ${tone.text}`}>{w.fitIndex}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${w.fitIndex}%` }} transition={{ duration: 1 }} className={`${tone.bg} h-full shadow-sm`} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">
              <div className="flex items-center gap-2">
                <span>Displaying 1-{filteredWorkers.length} of {workers.length} Global Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm">Previous</button>
                <div className="flex gap-1">
                  <button className="w-8 h-8 rounded-lg bg-brand-primary text-white shadow-md shadow-blue-100 transition-transform active:scale-90">1</button>
                  <button className="w-8 h-8 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">2</button>
                </div>
                <button className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm">Next</button>
              </div>
            </div>
          </div>

          {/* Right Detail Panel Column */}
          <AnimatePresence mode="wait">
            {selectedWorker ? (
              <motion.div 
                key={selectedWorker.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={SPRING_TRANSITION}
                className="w-[420px] bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-tr from-brand-primary to-brand-primaryHover text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-xl shadow-blue-100 border-2 border-white">
                      {selectedWorker.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-base font-black text-slate-900 leading-tight truncate">{selectedWorker.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">{selectedWorker.role}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0"></span>
                        <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${selectedWorker.status === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedWorker.status}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedWorker(null)}
                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                  ><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-7 space-y-8 scrollbar-thin">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-primarySoft transition-colors shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Unit</div>
                      <div className="text-xs font-bold text-slate-900 truncate">{selectedWorker.unit}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-primarySoft transition-colors shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Region</div>
                      <div className="text-xs font-bold text-slate-900 truncate">{selectedWorker.region}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-primarySoft transition-colors shadow-sm col-span-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Organizational Tenure</div>
                      <div className="text-xs font-bold text-slate-900">{selectedWorker.tenure} Enterprise History</div>
                    </div>
                  </div>

                  {/* Contact Info if available */}
                  {(selectedWorker.contactEmail || selectedWorker.contactPhone) && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Contact Information</h4>
                      <div className="space-y-1.5">
                        {selectedWorker.contactEmail && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                             <CheckCircle2 size={12} className="text-brand-primary" /> {selectedWorker.contactEmail}
                          </div>
                        )}
                        {selectedWorker.contactPhone && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                             <CheckCircle2 size={12} className="text-brand-primary" /> {selectedWorker.contactPhone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedWorker.skillsRaw && selectedWorker.skillsRaw.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Briefcase size={14} className="text-brand-primary" /> Verified Skill Inventory
                      </h4>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-2 scrollbar-thin">
                        {selectedWorker.skillsRaw.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-600 rounded uppercase tracking-tighter">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rich Ingested Data Collapsibles */}
                  {selectedWorker.experienceExtracted && selectedWorker.experienceExtracted.length > 0 && (
                    <details className="group/exp border-t border-slate-100 pt-4">
                      <summary className="list-none flex items-center justify-between cursor-pointer text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        <div className="flex items-center gap-2"><History size={14} className="text-brand-primary" /> Experience History</div>
                        <ChevronDown size={14} className="text-slate-400 group-open/exp:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-4 space-y-4">
                        {selectedWorker.experienceExtracted.map((exp, i) => (
                          <div key={i} className="border-l-2 border-brand-primarySoft pl-3 py-1">
                            <div className="text-[10px] font-black text-slate-900">{exp.title}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase">{exp.company} {exp.location && `• ${exp.location}`}</div>
                            <div className="text-[8px] font-medium text-slate-400 italic mb-1">{exp.dates}</div>
                            {exp.bullets && exp.bullets.map((b, bi) => (
                              <div key={bi} className="text-[9px] text-slate-500 mt-1 leading-relaxed">• {b}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {selectedWorker.projectsExtracted && selectedWorker.projectsExtracted.length > 0 && (
                    <details className="group/proj border-t border-slate-100 pt-4">
                      <summary className="list-none flex items-center justify-between cursor-pointer text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        <div className="flex items-center gap-2"><Briefcase size={14} className="text-brand-primary" /> Strategic Projects</div>
                        <ChevronDown size={14} className="text-slate-400 group-open/proj:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-4 space-y-4">
                        {selectedWorker.projectsExtracted.map((proj, i) => (
                          <div key={i} className="border-l-2 border-emerald-100 pl-3 py-1">
                            <div className="text-[10px] font-black text-slate-900">{proj.name}</div>
                            {proj.bullets && proj.bullets.map((b, bi) => (
                              <div key={bi} className="text-[9px] text-slate-500 mt-1 leading-relaxed">• {b}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {selectedWorker.resumeLines && selectedWorker.resumeLines.length > 0 && (
                    <details className="group/lines border-t border-slate-100 pt-4">
                      <summary className="list-none flex items-center justify-between cursor-pointer text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        <div className="flex items-center gap-2"><FileText size={14} className="text-brand-primary" /> Source Documentation</div>
                        <ChevronDown size={14} className="text-slate-400 group-open/lines:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-4 bg-slate-50 p-3 rounded-xl max-h-40 overflow-y-auto border border-slate-100 scrollbar-thin">
                        {selectedWorker.resumeLines.map((line, i) => (
                          <div key={i} className="text-[8px] font-mono text-slate-400 leading-tight mb-1">{line}</div>
                        ))}
                      </div>
                    </details>
                  )}

                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Target size={14} className="text-brand-primary" /> Strategy Alignment Matrix
                      </h4>
                      <span className="text-sm font-black text-brand-primary">{selectedWorker.alignmentPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner p-[1px]">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${selectedWorker.alignmentPct}%` }} 
                        transition={{ duration: 1.2, ease: "circOut" }} 
                        className="bg-gradient-to-r from-brand-primary to-brand-primaryHover h-full rounded-full shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2rem] p-7 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-brand-gold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-pulse"></span> Top Recommendation
                      </div>
                      <h4 className="text-xl font-black leading-tight tracking-tight">{selectedWorker.topStrategyPath}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        {selectedWorker.topStrategyReason}
                      </p>
                      <div className="pt-2 flex items-center justify-between">
                         <div className="text-[9px] font-black bg-brand-goldSoft text-brand-gold px-2 py-1 rounded-lg uppercase tracking-widest border border-brand-goldBorder flex items-center gap-1.5">
                           <ShieldCheck size={11} className="text-brand-gold" /> SIGNAL: VERIFIED
                         </div>
                         <button className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 group/btn">
                           INVESTIGATE TRACE <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                         </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('mobility')}
                    className="w-full py-4.5 bg-brand-primarySoft border-2 border-blue-100/50 text-brand-primary rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-primarySoft hover:border-blue-200 transition-all flex items-center justify-center gap-2.5 group/explorer shadow-sm"
                  >
                    Open Capability Explorer <BarChart3 size={15} className="group-hover/explorer:scale-110 transition-transform"/>
                  </button>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/30 flex gap-3 shrink-0">
                   <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Eye size={12}/> Profile</button>
                   <button onClick={handleExportCSV} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Download size={12}/> Record</button>
                </div>
              </motion.div>
            ) : (
              <div className="w-[420px] bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-12 text-center gap-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-50 shadow-inner">
                   <Users size={48}/>
                </div>
                <div className="space-y-2">
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Network Inspection Mode</h4>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">Select a worker node to view organizational trajectory and strategy alignment data.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Worker Inline Side Panel */}
        <AnimatePresence>
          {isAddWorkerOpen && (
            <div className="fixed inset-0 z-[70] flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddWorkerOpen(false)}></motion.div>
              <motion.div 
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={SPRING_TRANSITION}
                className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">New Workforce Node</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Organizational Entry</p>
                  </div>
                  <button onClick={() => setIsAddWorkerOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={24}/></button>
                </div>
                <form ref={formRef} onSubmit={handleAddWorker} className="flex-1 p-8 space-y-6 overflow-y-auto pb-24 scrollbar-thin">
                  {/* Resume Upload Section */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Resume (PDF/DOCX/TXT)</label>
                    {!ingestionFile ? (
                      <label className="block w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-slate-50 hover:border-brand-primary/30 transition-all cursor-pointer group text-center">
                        <Upload className="mx-auto mb-3 text-slate-300 group-hover:text-brand-primary transition-colors" size={32} />
                        <span className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-widest">Drag & drop or browse</span>
                        <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Support for PDF, DOCX, TXT files up to 5MB</span>
                        <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleResumeUpload} />
                      </label>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-primarySoft rounded-lg flex items-center justify-center text-brand-primary">
                            <File size={20} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{ingestionFile.name}</div>
                            <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{(ingestionFile.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {isIngesting ? (
                             <div className="flex items-center gap-2 text-[9px] font-black text-brand-primary uppercase animate-pulse">
                               <Loader2 size={12} className="animate-spin" /> Ingesting...
                             </div>
                           ) : ingestedData ? (
                             <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase">
                               <Check size={12} /> Ready
                             </div>
                           ) : null}
                           <button type="button" onClick={() => { setIngestionFile(null); setIngestedData(null); setShowExtractionPreview(false); setNameDetectionCertain(true); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isIngesting && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${ingestionProgress}%` }} className="bg-brand-primary h-full" />
                    </div>
                  )}

                  {ingestedData && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3 overflow-hidden">
                         <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                         <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest truncate">Ingestion complete • {ingestedData.skillsRaw?.length} Skills detected</span>
                       </div>
                       <button type="button" onClick={() => setShowExtractionPreview(!showExtractionPreview)} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1 shrink-0">
                         {showExtractionPreview ? 'Hide Preview' : 'View Extraction'} <ChevronRight size={10} className={showExtractionPreview ? 'rotate-90 transition-transform' : ''} />
                       </button>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {showExtractionPreview && ingestedData && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden border-t border-b border-slate-100 py-4">
                        <div className="space-y-2">
                           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detected Skills Mapping</h4>
                           <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-2 scrollbar-thin">
                             {ingestedData.skillsRaw?.map((s, i) => (
                               <span key={i} className="px-2 py-0.5 bg-white border border-slate-100 text-[8px] font-black text-slate-500 rounded uppercase tracking-tighter">{s}</span>
                             ))}
                           </div>
                        </div>
                        {ingestedData.experienceExtracted && ingestedData.experienceExtracted.length > 0 && (
                          <div className="space-y-2">
                             <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Experience Inferred</h4>
                             <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                                {ingestedData.experienceExtracted.map((exp, i) => (
                                  <div key={i} className="border-l-2 border-brand-primarySoft pl-3 py-1">
                                    <div className="text-[10px] font-black text-slate-900">{exp.title}</div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase">{exp.company}</div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Worker Full Name</label>
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input name="name" required placeholder="e.g. Marcus Thorne" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/50 outline-none transition-all" />
                    </div>
                    {!nameDetectionCertain && ingestedData && (
                      <p className="text-[9px] font-medium text-amber-600 mt-1 flex items-center gap-1">
                         <AlertCircle size={10} /> Couldn’t confidently detect name — please enter manually.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input name="role" required placeholder="e.g. Senior Cloud Architect" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/50 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Org Unit</label>
                      <select name="unit" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer focus:ring-4 focus:ring-brand-primary/10 transition-all">
                        <option>Engineering</option>
                        <option>Product</option>
                        <option>Data Science</option>
                        <option>SRE</option>
                        <option>Design</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Status</label>
                      <select name="status" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer focus:ring-4 focus:ring-brand-primary/10 transition-all">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="ONBOARDING">ONBOARDING</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Node Location</label>
                    <div className="relative">
                      <Map size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input name="location" required placeholder="e.g. San Francisco, CA" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/50 outline-none transition-all" />
                    </div>
                  </div>
                  
                  <div className="pt-10 space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                      <AlertCircle className="text-amber-500 shrink-0" size={18} />
                      <p className="text-[10px] font-medium text-amber-800 leading-relaxed uppercase">Adding a node manually requires immediate Governance Audit within 24 hours to maintain sync integrity.</p>
                    </div>
                    <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all active:scale-[0.98]">
                      Finalize Node Creation
                    </button>
                    <button type="button" onClick={() => setIsAddWorkerOpen(false)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">
                      Abort Transaction
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMobilityHub = () => {
    const groupOrder = ['Languages', 'ML_AI', 'Frameworks_Tools', 'Cloud_Analytics', 'Testing_QA', 'Practices_Certs', 'Professional_Skills'];
    const groupLabels: Record<string, string> = {
      Languages: 'Languages',
      ML_AI: 'ML & AI',
      Frameworks_Tools: 'Frameworks & Tools',
      Cloud_Analytics: 'Cloud & Analytics',
      Testing_QA: 'Testing & QA',
      Practices_Certs: 'Practices & Certs',
      Professional_Skills: 'Professional Skills'
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
              <Map size={12} /> Intelligence <span className="text-slate-300">/</span> Mobility Hub
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              Mobility Hub
              <span className="flex items-center gap-1 text-[10px] bg-brand-goldSoft text-brand-gold px-2 py-0.5 rounded font-bold border border-brand-goldBorder uppercase tracking-widest">
                • GOVERNANCE PASSED
              </span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
              <RefreshCcw size={14} /> Refresh Simulation
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-primaryHover shadow-lg shadow-blue-100 transition-all active:scale-95">
              <Target size={14} /> Optimize Workforce
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 p-20 flex flex-col items-center justify-center text-center gap-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-8 left-8 text-left">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Active Graph Nodes</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{workers.length} Synchronized Units</p>
            </div>
            <div className="w-32 h-32 bg-brand-primarySoft rounded-full flex items-center justify-center relative">
               <Network size={64} className="text-brand-primary" />
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-blue-200 rounded-full"></motion.div>
            </div>
            <div className="max-w-md">
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">Enterprise Capability Graph</h2>
               <p className="text-sm text-slate-400 font-medium leading-relaxed">Visualizing workforce mobility vectors and strategic talent flow. All system nodes are currently synchronized.</p>
            </div>
            <div className="flex gap-4">
               <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200">View Node Matrix</button>
               <button className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50">Download Report</button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm overflow-y-auto max-h-[600px] scrollbar-thin">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Node Capability Mapping</h3>
             <div className="space-y-4">
                {workers.slice(0, 10).map((w, i) => {
                  const hasRichSkills = w.skillsRaw && w.skillsRaw.length > 0;
                  const isViewAll = expandedSkillsId === w.id;
                  const skillsToDisplay = isViewAll ? w.skillsRaw : w.skillsRaw?.slice(0, 40);
                  const moreCount = (w.skillsRaw?.length || 0) - 40;

                  return (
                    <div key={w.id} onClick={() => setSelectedWorker(w)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedWorker?.id === w.id ? 'border-brand-primary bg-brand-primarySoft/50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="text-[11px] font-black text-slate-900 mb-1 truncate">{w.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-3 truncate">{w.role}</div>
                      
                      {hasRichSkills ? (
                        <div className="space-y-3">
                           <div className="flex items-center justify-between text-[8px] font-black text-brand-primary uppercase tracking-widest">
                             <span>Verified Skill Inventory</span>
                             <span className="bg-brand-primarySoft px-1.5 py-0.5 rounded">Skills detected: {w.skillsRaw?.length}</span>
                           </div>
                           
                           <div className="max-h-40 overflow-y-auto pr-1 scrollbar-thin space-y-3">
                             {w.skillsGrouped ? (
                               groupOrder.map(group => {
                                 const skills = w.skillsGrouped?.[group];
                                 if (!skills || skills.length === 0) return null;
                                 return (
                                   <div key={group} className="space-y-1">
                                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{groupLabels[group] || group}</div>
                                      <div className="flex flex-wrap gap-1">
                                        {skills.map((s, si) => (
                                          <span key={si} className="px-1.5 py-0.5 bg-white border border-slate-100 text-[7px] font-black text-slate-500 rounded uppercase">{s}</span>
                                        ))}
                                      </div>
                                   </div>
                                 );
                               })
                             ) : (
                               <div className="flex flex-wrap gap-1">
                                  {skillsToDisplay?.map((s, si) => (
                                    <span key={si} className="px-1.5 py-0.5 bg-white border border-slate-100 text-[7px] font-black text-slate-500 rounded uppercase">{s}</span>
                                  ))}
                                  {!isViewAll && moreCount > 0 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setExpandedSkillsId(w.id); }}
                                      className="px-1.5 py-0.5 bg-brand-primarySoft text-brand-primary text-[7px] font-black rounded uppercase hover:bg-brand-primary hover:text-white transition-colors"
                                    >
                                      +{moreCount} more
                                    </button>
                                  )}
                                  {isViewAll && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setExpandedSkillsId(null); }}
                                      className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[7px] font-black rounded uppercase hover:bg-slate-200 transition-colors"
                                    >
                                      Show less
                                    </button>
                                  )}
                               </div>
                             )}
                           </div>
                        </div>
                      ) : (
                        // Fallback for static nodes
                        <div className="flex flex-wrap gap-1">
                          {['ML', 'Python', 'Cloud', 'Data', 'UI'].map((s, si) => (
                            <span key={si} className="px-1.5 py-0.5 bg-white border border-slate-100 text-[7px] font-black text-slate-500 rounded uppercase">{s}</span>
                          ))}
                        </div>
                      )}

                      {selectedWorker?.id === w.id && w.experienceExtracted && w.experienceExtracted.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
                           <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Inferred Exp</h4>
                           {w.experienceExtracted.slice(0, 2).map((exp, ei) => (
                             <div key={ei} className="text-[8px] font-bold text-slate-700 leading-tight truncate">• {exp.title} at {exp.company}</div>
                           ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center group cursor-default">
          <span className="font-bold text-xl tracking-tighter text-slate-900">Skill</span>
          <div className="w-[26px] h-[26px] bg-gradient-to-br from-brand-primary to-brand-primaryHover rounded-[3px] flex items-center justify-center ml-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.15)] border border-white/10">
            <span className="text-white font-bold text-[15px] leading-none tracking-tight">Up</span>
          </div>
          <div className="ml-3 flex items-center">
            <div className="h-3 w-[1px] bg-slate-200 mr-3" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Enterprise</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 mt-4">Main Menu</div>
          {[
            { id: 'intelligence', icon: LayoutDashboard, label: 'Intelligence Console' },
            { id: 'talent', icon: Users, label: 'Talent Network' },
            { id: 'mobility', icon: Zap, label: 'Mobility Hub' },
            { id: 'governance', icon: ShieldCheck, label: 'Governance' },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => (item.id === 'intelligence' || item.id === 'talent' || item.id === 'mobility') && setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-brand-primarySoft text-brand-primary shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 mt-8">System Audit</div>
          {[
            { icon: History, label: 'Inference Trace' },
            { icon: FileText, label: 'Audit Records' },
          ].map((item) => (
            <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="p-3 rounded-xl flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
            <div className="w-9 h-9 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">AJ</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Alex Jensen</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold truncate tracking-widest">ADMIN</div>
            </div>
            <ChevronDown size={14} className="text-slate-300" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Global workforce search..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LiveBadge />
            <div className="h-6 w-px bg-slate-200"></div>
            <button className="text-slate-400 hover:text-slate-600 relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="text-slate-400 hover:text-slate-600 transition-colors"><HelpCircle size={20} /></button>
            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900 leading-none">Alex</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">PROFILE HUB</div>
              </div>
              <div className="w-9 h-9 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm border border-white/20 transition-transform active:scale-95">AJ</div>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-[1600px] mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'intelligence' && (
                <motion.div 
                  key="intelligence"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderIntelligenceConsole()}
                </motion.div>
              )}
              {activeTab === 'talent' && (
                <motion.div 
                  key="talent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderTalentNetwork()}
                </motion.div>
              )}
              {activeTab === 'mobility' && (
                <motion.div 
                  key="mobility"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderMobilityHub()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Analyzer Drawer logic */}
      <AnimatePresence>
        {isAnalyzerOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setIsAnalyzerOpen(false)}
            ></motion.div>
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }}
              transition={SPRING_TRANSITION}
              className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-brand-primary text-white rounded-lg"><BrainCircuit size={20}/></div>
                    Talent Intelligence Engine
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Inference Model: Gemini 3 Flash Preview</p>
                </div>
                <button onClick={() => setIsAnalyzerOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {status !== AppStatus.SUCCESS ? (
                  <div className="space-y-6">
                    <div className="bg-brand-primarySoft rounded-2xl p-6 border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <Zap size={16} fill="currentColor" /> Autonomous Career Mapping
                      </h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Our system performs a 92% semantic overlap analysis between current skills and strategic initiatives. Paste a resume to begin workforce modeling.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Raw Talent Data</label>
                      <textarea 
                        value={resumeInput}
                        onChange={(e) => setResumeInput(e.target.value)}
                        placeholder="Paste resume text or workforce records..."
                        className="w-full h-80 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 outline-none resize-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={handleAnalyze}
                      disabled={status === AppStatus.LOADING}
                      className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-[0.98]"
                    >
                      {status === AppStatus.LOADING ? (
                        <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> PROCESSING NODES...</>
                      ) : (
                        <><Search size={16}/> Execute Inference Trace</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-12 animate-in fade-in duration-500">
                    <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-12 opacity-10"><BrainCircuit size={120}/></div>
                      <div className="relative space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-brand-gold uppercase tracking-widest">
                          <ShieldCheck size={12}/> AI SIGNAL STRENGTH
                        </div>
                        <h3 className="text-3xl font-black leading-tight">{analysis?.currentProfile.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-lg">{analysis?.currentProfile.summary}</p>
                      </div>
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Skill Radar Mapping</div>
                        {analysis && <SkillVisualizer skills={analysis.currentProfile.extractedSkills} />}
                      </div>
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-center shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Strategic Match Alignment</div>
                        {analysis?.recommendedPaths.map((path, i) => (
                          <div key={i} className="mb-6 last:mb-0">
                            <div className="flex justify-between items-baseline mb-2">
                              <span className="text-xs font-bold text-slate-900">{path.role}</span>
                              <span className="text-xs font-black text-brand-primary">{path.matchScore}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${path.matchScore}%` }}
                                transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                                className="bg-brand-primary h-full shadow-sm"
                              ></motion.div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center gap-2 mb-8">
                        <GraduationCap className="text-brand-primary" />
                        <h4 className="text-xl font-bold text-slate-900">Enterprise Growth Roadmap</h4>
                      </div>
                      {analysis && <CareerRoadmap steps={analysis.recommendedPaths[0].roadmap} />}
                    </section>

                    <button 
                      onClick={() => { setAnalysis(null); setStatus(AppStatus.IDLE); }}
                      className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all shadow-sm"
                    >
                      Reset Analysis & Input
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Floating Analyzer Trigger */}
      <button 
        onClick={() => setIsAnalyzerOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-brand-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-brand-primaryHover transition-all hover:scale-110 active:scale-95 group z-[50]"
      >
        <BrainCircuit size={28} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}