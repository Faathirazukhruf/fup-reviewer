// Utility functions
export function nowISO(): string {
  return new Date().toISOString();
}

export function uid(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Types
export interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  departmentId: string;
}

export interface Dept {
  id: string;
  name: string;
  active: boolean;
}

export interface DB {
  departments: Dept[];
}

// Local storage key
const STORAGE_KEY = 'fup-reviewer-db';

// Initialize default database
const defaultDB: DB = {
  departments: []
};

// Load database from localStorage
export function loadDB(): DB {
  if (typeof window === 'undefined') return defaultDB;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultDB;
  } catch (error) {
    console.error('Error loading database:', error);
    return defaultDB;
  }
}

// Save database to localStorage
export function saveDB(db: DB): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Department operations
export function addDepartment(db: DB, name: string): DB {
  const newDept: Dept = {
    id: Date.now().toString(),
    name,
    active: true
  };
  
  const updatedDB = {
    ...db,
    departments: [...db.departments, newDept]
  };
  
  saveDB(updatedDB);
  return updatedDB;
}

export function updateDepartment(db: DB, id: string, updates: Partial<Dept>): DB {
  const updatedDB = {
    ...db,
    departments: db.departments.map(dept => 
      dept.id === id ? { ...dept, ...updates } : dept
    )
  };
  
  saveDB(updatedDB);
  return updatedDB;
}

export function deleteDepartment(db: DB, id: string): DB {
  const updatedDB = {
    ...db,
    departments: db.departments.filter(dept => dept.id !== id)
  };
  
  saveDB(updatedDB);
  return updatedDB;
}

// Initialize database if it doesn't exist
if (typeof window !== 'undefined') {
  const currentDB = loadDB();
  if (!currentDB.departments) {
    saveDB(defaultDB);
  }
}
