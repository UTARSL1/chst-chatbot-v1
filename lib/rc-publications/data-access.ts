import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'rc_publications', 'data.json');

export interface Publication {
  id: string;
  title: string;
  journalName?: string;
  publicationType?: string; // JOURNAL ARTICLE, CONFERENCE
  wosQuartile?: string; // Q1, Q2, Q3, Q4
  authorshipRole?: string; // 1st Author, Corresponding Author, Co-author
  publicationYear?: number;
  publicationDate?: string;
  role?: string; // Original Role column
  issn?: string;
  doi?: string;
}

export interface RCMember {
  id: string;
  name: string;
  staffId?: string;
  totalPublications: number;
  journalArticles: number;
  conferencePapers: number;
  q1Publications: number;
  q2Publications: number;
  q3Publications: number;
  q4Publications: number;
  publications: Publication[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkingGroup {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RCPublicationData {
  members: Record<string, RCMember>;
  workingGroups: Record<string, WorkingGroup>;
  lastUpdated: string | null;
}

/**
 * Load RC publication data from JSON file
 */
export function loadRCPublicationData(): RCPublicationData {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return {
        members: {},
        workingGroups: {},
        lastUpdated: null
      };
    }
    const data = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[RCPublications] Error loading data:', error);
    return {
      members: {},
      workingGroups: {},
      lastUpdated: null
    };
  }
}

/**
 * Save RC publication data to JSON file
 */
export function saveRCPublicationData(data: RCPublicationData): void {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[RCPublications] Error saving data:', error);
    throw error;
  }
}

/**
 * Get all members
 */
export function getAllMembers(): RCMember[] {
  const data = loadRCPublicationData();
  return Object.values(data.members);
}

/**
 * Get member by ID
 */
export function getMemberById(id: string): RCMember | null {
  const data = loadRCPublicationData();
  return data.members[id] || null;
}

/**
 * Get all working groups
 */
export function getAllWorkingGroups(): WorkingGroup[] {
  const data = loadRCPublicationData();
  return Object.values(data.workingGroups);
}

/**
 * Get working group by ID
 */
export function getWorkingGroupById(id: string): WorkingGroup | null {
  const data = loadRCPublicationData();
  return data.workingGroups[id] || null;
}
