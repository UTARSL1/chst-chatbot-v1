// Knowledge Base Types (using existing schema fields)

export interface KnowledgeNoteMetadata {
    department?: string;      // e.g., "Human Resources", "IPSR"
    documentType?: string;    // e.g., "Policy", "Form", "Procedure"
    tags?: string[];          // e.g., ["sabbatical", "leave", "training"]
    linkedDocIds?: string[];  // Document UUIDs
}

export interface Department {
    name: string;
    abbreviation?: string;
    color?: string;
    icon?: string;
}

export interface DocumentType {
    name: string;
    icon?: string;
    color?: string;
}

// Default departments
export const DEFAULT_DEPARTMENTS: Department[] = [
    { name: 'Human Resources', abbreviation: 'HR', icon: '👥', color: '#3b82f6' },
    { name: 'IPSR (Research)', abbreviation: 'IPSR', icon: '🔬', color: '#8b5cf6' },
    { name: 'Consultancy', abbreviation: 'CONS', icon: '💼', color: '#10b981' },
    { name: 'CHST', abbreviation: 'CHST', icon: '🎓', color: '#f59e0b' },
    { name: 'Finance', abbreviation: 'FIN', icon: '💰', color: '#ef4444' },
    { name: 'Academic Affairs', abbreviation: 'AA', icon: '📚', color: '#06b6d4' },
    { name: 'Student Affairs', abbreviation: 'SA', icon: '🎒', color: '#ec4899' },
    { name: 'General', abbreviation: 'GEN', icon: '📋', color: '#6b7280' },
];

// Default document types
export const DEFAULT_DOCUMENT_TYPES: DocumentType[] = [
    { name: 'Policy', icon: '📋', color: '#3b82f6' },
    { name: 'Form', icon: '📝', color: '#10b981' },
    { name: 'Procedure', icon: '📊', color: '#8b5cf6' },
    { name: 'FAQ', icon: '💡', color: '#f59e0b' },
    { name: 'Announcement', icon: '📢', color: '#ef4444' },
    { name: 'Meeting Minute', icon: '📅', color: '#06b6d4' },
];

// Helper functions
export function parseMetadata(category: string | null): KnowledgeNoteMetadata {
    if (!category) return {};

    try {
        return JSON.parse(category);
    } catch {
        // Legacy format: treat as department name
        return { department: category };
    }
}

export function stringifyMetadata(metadata: KnowledgeNoteMetadata): string {
    return JSON.stringify(metadata);
}

export function getDepartmentColor(departmentName: string): string {
    const dept = DEFAULT_DEPARTMENTS.find(d => d.name === departmentName);
    return dept?.color || '#6b7280';
}

export function getDepartmentIcon(departmentName: string): string {
    const dept = DEFAULT_DEPARTMENTS.find(d => d.name === departmentName);
    return dept?.icon || '📋';
}

export function getDocumentTypeColor(typeName: string): string {
    const type = DEFAULT_DOCUMENT_TYPES.find(t => t.name === typeName);
    return type?.color || '#6b7280';
}

export function getDocumentTypeIcon(typeName: string): string {
    const type = DEFAULT_DOCUMENT_TYPES.find(t => t.name === typeName);
    return type?.icon || '📄';
}
