import { Branch } from '../types';

export const DEFAULT_MAIN_BRANCH: Branch = {
  id: 'branch-main',
  name: 'Main Branch',
  code: 'MAIN',
  address: 'Kuwaritol, Kaliabor, Nagaon, Assam - 782137',
  phone: '8638611886',
  email: 'iaitkaliabor@gmail.com',
  status: 'Active',
  isDefault: true,
  createdAt: '2024-01-01T00:00:00Z',
};

export const INITIAL_BRANCHES: Branch[] = [
  DEFAULT_MAIN_BRANCH,
  {
    id: 'branch-b01',
    name: 'Branch 01',
    code: 'B01',
    address: 'Branch 01 Campus, Assam - 782001',
    phone: '9864011221',
    email: 'branch01@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'branch-b02',
    name: 'Branch 02',
    code: 'B02',
    address: 'Branch 02 Campus, Assam - 784001',
    phone: '9864022332',
    email: 'branch02@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'branch-nagaon',
    name: 'Nagaon Town Branch',
    code: 'NGN',
    address: 'Haibargaon Main Road, Nagaon, Assam - 782002',
    phone: '9435012399',
    email: 'nagaon@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'branch-tezpur',
    name: 'Tezpur City Center',
    code: 'TEZ',
    address: 'Mission Chariali, Tezpur, Sonitpur, Assam - 784001',
    phone: '9864210982',
    email: 'tezpur@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'branch-pith01-3101',
    name: 'Pithakhowa',
    code: 'PITH01',
    address: 'TEZPUR, Assam',
    phone: '7002309141',
    email: '',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-01T09:56:43.101Z',
  },
  {
    id: 'branch-jakhalabandha',
    name: 'Jakhalabandha Study Center',
    code: 'JKB',
    address: 'Main Market, Jakhalabandha, Nagaon, Assam - 782136',
    phone: '8486950123',
    email: 'jakhalabandha@iait.ac.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-08T08:15:46.771Z',
  },
  {
    id: 'branch-p01-8228',
    name: 'pp',
    code: 'P01',
    address: 'vill- BORUAATI, Nagaon, Assam',
    phone: '8638611886',
    email: 'sanjib.upadhayaya@gmail.com',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-08T09:21:48.229Z',
  },
  {
    id: '09ff27b9-c89f-4452-9c25-27f4eac9cb2b',
    name: 'Jorhat Branch',
    code: '5G',
    address: 'Jorhat, Assam',
    phone: '7856565789',
    email: 'kcd303@gmail.com',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-13T10:41:17.680Z',
  },
];

const STORAGE_KEY = 'iait_branches';

/**
 * Retrieve all configured branches from database / storage.
 * Reads dynamically from local cache (synced with Supabase Central DB).
 */
export function getStoredBranches(): Branch[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return INITIAL_BRANCHES;
  } catch (err) {
    console.error('Error reading branches:', err);
    return INITIAL_BRANCHES;
  }
}

/**
 * Sync remote branches into client storage and notify listeners
 */
export function setStoredBranches(branchesList: Branch[]): void {
  if (!Array.isArray(branchesList) || branchesList.length === 0) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branchesList));
      localStorage.setItem('iait_branches_last_update', Date.now().toString());
      window.dispatchEvent(new CustomEvent('iait_branches_changed'));
    }
  } catch (err) {
    console.warn('Failed to cache branches to localStorage:', err);
  }
}

/**
 * Get all active branches available for student enrollment
 */
export function getActiveBranches(): Branch[] {
  return getStoredBranches().filter((b) => {
    const s = String(b.status || 'Active').trim().toLowerCase();
    return s !== 'inactive' && s !== 'disabled' && s !== 'false';
  });
}

/**
 * Find branch by ID, code, or name
 */
export function getBranchById(branchId?: string): Branch | undefined {
  if (!branchId) return undefined;
  const branches = getStoredBranches();
  return (
    branches.find((b) => b.id === branchId) ||
    branches.find((b) => b.code.toUpperCase() === branchId.toUpperCase()) ||
    branches.find((b) => b.name.toLowerCase() === branchId.toLowerCase())
  );
}

/**
 * Smart lookup by ID, code, or name
 */
export function findBranch(identifier?: {
  id?: string;
  code?: string;
  name?: string;
}): Branch | undefined {
  if (!identifier) return undefined;
  const branches = getStoredBranches();

  if (identifier.id) {
    const b = branches.find((item) => item.id === identifier.id);
    if (b) return b;
  }
  if (identifier.code) {
    const cleanCode = identifier.code.trim().toUpperCase();
    const b = branches.find((item) => item.code.toUpperCase() === cleanCode);
    if (b) return b;
  }
  if (identifier.name) {
    const cleanName = identifier.name.trim().toLowerCase();
    const b = branches.find((item) => item.name.toLowerCase() === cleanName);
    if (b) return b;
  }
  return undefined;
}

/**
 * Create a new branch with validation
 */
export function createBranch(
  data: Omit<Branch, 'id' | 'createdAt'> & { id?: string }
): { success: boolean; message: string; branch?: Branch } {
  const cleanName = data.name.trim();
  const cleanCode = data.code.trim().toUpperCase();

  if (!cleanName) {
    return { success: false, message: 'Branch Name is required.' };
  }
  if (!cleanCode) {
    return { success: false, message: 'Branch Code is required.' };
  }

  const existingBranches = getStoredBranches();

  // Check code uniqueness
  const codeExists = existingBranches.some(
    (b) => b.code.toUpperCase() === cleanCode && b.id !== data.id
  );
  if (codeExists) {
    return { success: false, message: `Branch Code "${cleanCode}" is already in use.` };
  }

  const newId =
    data.id && data.id.trim()
      ? data.id.trim()
      : `branch-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

  const newBranch: Branch = {
    id: newId,
    name: cleanName,
    code: cleanCode,
    address: data.address.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    status: data.status || 'Active',
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  const updated = [
    ...existingBranches.filter(
      (b) => b.id !== newBranch.id && b.code.toUpperCase() !== newBranch.code.toUpperCase()
    ),
    newBranch,
  ];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem('iait_branches_last_update', Date.now().toString());
      window.dispatchEvent(new CustomEvent('iait_branches_changed'));
    }
    return { success: true, message: `Branch "${cleanName}" created successfully!`, branch: newBranch };
  } catch (err) {
    return { success: false, message: 'Failed to persist branch to database.' };
  }
}

/**
 * Update existing branch details
 */
export function updateBranch(
  branch: Branch
): { success: boolean; message: string } {
  const cleanName = branch.name.trim();
  const cleanCode = branch.code.trim().toUpperCase();

  if (!cleanName) {
    return { success: false, message: 'Branch Name cannot be empty.' };
  }
  if (!cleanCode) {
    return { success: false, message: 'Branch Code cannot be empty.' };
  }

  const existingBranches = getStoredBranches();
  const index = existingBranches.findIndex((b) => b.id === branch.id);
  if (index === -1) {
    return { success: false, message: 'Branch not found in database.' };
  }

  // Ensure code uniqueness among other branches
  const codeExists = existingBranches.some(
    (b) => b.code.toUpperCase() === cleanCode && b.id !== branch.id
  );
  if (codeExists) {
    return { success: false, message: `Branch Code "${cleanCode}" is used by another branch.` };
  }

  const current = existingBranches[index];
  const updatedBranch: Branch = {
    ...current,
    name: cleanName,
    code: cleanCode,
    address: branch.address.trim(),
    phone: branch.phone.trim(),
    email: branch.email.trim(),
    status: branch.status,
    // Preserve default status
    isDefault: current.isDefault,
  };

  existingBranches[index] = updatedBranch;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingBranches));
      localStorage.setItem('iait_branches_last_update', Date.now().toString());
      window.dispatchEvent(new CustomEvent('iait_branches_changed'));
    }
    return { success: true, message: `Branch "${cleanName}" updated successfully!` };
  } catch (err) {
    return { success: false, message: 'Failed to update branch in database.' };
  }
}

/**
 * Toggle Active / Inactive status of a branch
 */
export function toggleBranchStatus(
  branchId: string
): { success: boolean; message: string; newStatus?: 'Active' | 'Inactive' } {
  const existingBranches = getStoredBranches();
  const branch = existingBranches.find((b) => b.id === branchId);
  if (!branch) {
    return { success: false, message: 'Branch not found.' };
  }

  if (branch.isDefault) {
    return { success: false, message: 'The Main Branch must always remain Active.' };
  }

  const newStatus: 'Active' | 'Inactive' = branch.status === 'Active' ? 'Inactive' : 'Active';
  branch.status = newStatus;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingBranches));
      localStorage.setItem('iait_branches_last_update', Date.now().toString());
      window.dispatchEvent(new CustomEvent('iait_branches_changed'));
    }
    return {
      success: true,
      message: `Branch "${branch.name}" is now ${newStatus}.`,
      newStatus,
    };
  } catch {
    return { success: false, message: 'Failed to update status in database.' };
  }
}

/**
 * Delete a branch safely
 * Safety rules:
 * 1. Default Main Branch cannot be deleted.
 * 2. Branches with existing admission records cannot be deleted to prevent orphaned records.
 */
export function deleteBranch(
  branchId: string,
  associatedAdmissionsCount: number
): { success: boolean; message: string } {
  const existingBranches = getStoredBranches();
  const branch = existingBranches.find((b) => b.id === branchId);

  if (!branch) {
    return { success: false, message: 'Branch does not exist.' };
  }

  if (branch.isDefault) {
    return {
      success: false,
      message: 'The Main Branch is the primary institutional anchor and cannot be deleted.',
    };
  }

  if (associatedAdmissionsCount > 0) {
    return {
      success: false,
      message: `Cannot delete "${branch.name}" because it currently has ${associatedAdmissionsCount} registered admission(s). Please reassign or archive these admissions first, or Deactivate the branch instead.`,
    };
  }

  const updated = existingBranches.filter((b) => b.id !== branchId);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem('iait_branches_last_update', Date.now().toString());
      window.dispatchEvent(new CustomEvent('iait_branches_changed'));
    }
    return { success: true, message: `Branch "${branch.name}" deleted successfully.` };
  } catch {
    return { success: false, message: 'Failed to delete branch from database.' };
  }
}
