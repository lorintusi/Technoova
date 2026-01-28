/**
 * Core Types & Interfaces für Technova
 * 
 * Diese Types sind das Fundament der gesamten Anwendung.
 * Alle Komponenten und Features basieren auf diesen Definitionen.
 */

// ========================================
// RESSOURCEN
// ========================================

export type ResourceType = 'WORKER' | 'VEHICLE' | 'DEVICE' | 'LOCATION';

export interface Worker {
  id: string;
  name: string;
  role?: string;
  company?: string;
  teamId?: string;
  status: WorkerStatus;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkerStatus = 
  | 'Arbeitsbereit' 
  | 'Urlaub' 
  | 'Krank' 
  | 'Abwesend';

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  type?: string;
  capacity?: number;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  name: string;
  serialNumber?: string;
  type?: string;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export type ResourceStatus = 'available' | 'assigned' | 'maintenance' | 'inactive';

// ========================================
// EINSATZORTE (LOCATIONS)
// ========================================

export interface Location {
  id: string;
  code: string;
  name?: string;
  address: string;
  description?: string;
  tags?: string[];
  scheduleStatus: LocationScheduleStatus;
  scheduleStart?: string;
  scheduleEnd?: string;
  scheduleDeadline?: string;
  scheduleProgress: number;
  createdAt: string;
  updatedAt: string;
}

export type LocationScheduleStatus = 
  | 'Geplant' 
  | 'In Arbeit' 
  | 'Abgeschlossen' 
  | 'Pausiert';

// ========================================
// DISPATCH ITEMS (EINSÄTZE)
// ========================================

export interface DispatchItem {
  id: string;
  locationId?: string | null; // ⚠️ Optional, aber REQUIRED für Ressourcen-Zuweisung
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  allDay: boolean;
  category?: DispatchCategory;
  note?: string | null;
  status: DispatchStatus;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DispatchCategory = 
  | 'PROJEKT' 
  | 'SCHULUNG' 
  | 'BUERO' 
  | 'TRAINING' 
  | 'KRANK' 
  | 'MEETING';

export type DispatchStatus = 
  | 'PLANNED' 
  | 'CONFIRMED' 
  | 'CANCELLED';

// ========================================
// DISPATCH ASSIGNMENTS (RESSOURCEN-ZUWEISUNGEN)
// ========================================

export interface DispatchAssignment {
  id: string;
  dispatchItemId: string;
  resourceType: ResourceType;
  resourceId: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

// ========================================
// VALIDIERUNG & KONFLIKTE
// ========================================

export interface ValidationResult {
  ok: boolean;
  message?: string;
  conflictingItem?: DispatchItem;
}

export interface TimeOverlap {
  start1: string;
  end1: string;
  start2: string;
  end2: string;
  overlaps: boolean;
}

// ========================================
// UI STATE
// ========================================

export interface UIState {
  resourceContext: ResourceType;
  selectedResource?: {
    type: ResourceType;
    id: string;
  };
  activeDate: string; // YYYY-MM-DD
  calendarDate: Date;
  resourceQuery: string;
  locationQuery: string;
  locationsSectionExpanded: boolean;
}

// ========================================
// USER & AUTH
// ========================================

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export type UserRole = 'Admin' | 'Planner' | 'User';

// ========================================
// API RESPONSES
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

