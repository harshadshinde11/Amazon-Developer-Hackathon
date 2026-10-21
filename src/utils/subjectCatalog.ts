export interface SubjectCatalogEntry {
  name: string;
  code: string;
  icon: string;
  color: string;
  starterTopics: string[];
}

export const SUBJECT_CATALOG: SubjectCatalogEntry[] = [
  {
    name: 'Algorithms & Data Structures',
    code: 'DSA',
    icon: 'Cpu',
    color: '#8b5cf6',
    starterTopics: ['Arrays and strings', 'Sorting and searching', 'Trees and graphs', 'Algorithm analysis'],
  },
  {
    name: 'Database Management Systems',
    code: 'DBMS',
    icon: 'Database',
    color: '#0ea5a4',
    starterTopics: ['SQL queries', 'Normalization', 'Transactions', 'Indexing'],
  },
  {
    name: 'Operating Systems',
    code: 'OS',
    icon: 'MonitorCog',
    color: '#f97316',
    starterTopics: ['Processes and threads', 'CPU scheduling', 'Memory management', 'Deadlocks'],
  },
  {
    name: 'Computer Networks',
    code: 'NET',
    icon: 'Network',
    color: '#3b82f6',
    starterTopics: ['TCP/IP', 'Routing', 'Network protocols', 'Network security'],
  },
  {
    name: 'Artificial Intelligence',
    code: 'AI',
    icon: 'BrainCircuit',
    color: '#ec4899',
    starterTopics: ['Search strategies', 'Knowledge representation', 'Reasoning', 'Planning'],
  },
  {
    name: 'Machine Learning',
    code: 'ML',
    icon: 'Sparkles',
    color: '#10b981',
    starterTopics: ['Supervised learning', 'Unsupervised learning', 'Model evaluation', 'Feature engineering'],
  },
  {
    name: 'Mathematics',
    code: 'MATH',
    icon: 'Sigma',
    color: '#eab308',
    starterTopics: ['Algebra', 'Calculus', 'Discrete mathematics', 'Probability and statistics'],
  },
  {
    name: 'Software Engineering',
    code: 'SE',
    icon: 'Workflow',
    color: '#06b6d4',
    starterTopics: ['Requirements', 'Software design', 'Testing', 'Project management'],
  },
];
