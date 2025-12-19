/**
 * Department categorization based on department name
 * Simple rule: if department name ends with "Engineering", it's an engineering department
 */

import { AcademicCategory, DepartmentType } from './staff-directory-types';

/**
 * Get academic category for a department based on its name and type
 */
export function getDepartmentAcademicCategory(
    departmentName: string,
    departmentType: DepartmentType
): AcademicCategory {
    // Administrative departments are N/A
    if (departmentType === 'Administrative') {
        return 'N/A';
    }

    // Academic departments: check if name ends with "Engineering"
    if (departmentName.trim().endsWith('Engineering')) {
        return 'Engineering';
    }

    // All other academic departments are non-engineering
    return 'Non-Engineering';
}
