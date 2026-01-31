export type BriefStatus = 'new' | 'in_progress' | 'review' | 'delivered';
// Simplified: 'admin' has system-wide access, 'user' gets access via memberships
// Clients don't have profiles - they access via brand share tokens
export type UserRole = 'admin' | 'user';
// Legacy roles for backward compatibility during migration
export type LegacyUserRole = 'admin' | 'pod_lead' | 'pod_member' | 'client';
export type MembershipRole = 'pod_member' | 'pod_lead';
export type MembershipStatus = 'active' | 'inactive' | 'pending';
export type Priority = 'normal' | 'urgent';

export interface Membership {
  id: string;
  userId: string;
  podId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  podId: string;
  shareToken?: string;
  accessKey?: string; // For client entry without auth
  isActive?: boolean;
  notificationEmail?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pod {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  leadName?: string;
  leadId?: string;
  archivedAt?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  // Legacy: kept for backward compatibility during migration
  podId?: string;
  // Memberships define which pods this user can access
  memberships?: Membership[];
  preferences?: UserPreferences;
}

export interface Message {
  id: string;
  briefId: string;
  authorName: string;
  text: string;
  visibility: 'internal' | 'client';
  authorType?: 'user' | 'client';
  createdAt: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: 'brief' | 'attachment' | 'deliverable';
  url: string;
  uploadedAt: string;
  visibleToClient?: boolean;
}

export interface Folder {
  id: string;
  podId: string;
  name: string;
  position: { x: number; y: number };
  createdAt: string;
}

export interface Brief {
  id: string;
  brandId: string;
  podId: string;
  title: string;
  status: BriefStatus;
  priority: Priority;
  ownerId?: string;
  ownerName?: string;
  submittedAt: string; 
  deadline: string | null;
  files: FileAttachment[];
  messages: Message[];
  guidance?: string;
  aiSpark?: string; // AI generated summary/insight
  position?: { x: number; y: number };
  folderId?: string;
  stackId?: string;
}

export const COLORS = {
  text: '#111111',
  secondary: '#6B6B6B',
  muted: '#9B9B9B',
  urgent: '#FF453A',
  status: {
    new: '#D1D1D6',
    inProgress: '#007AFF',
    review: '#FF9500',
    delivered: '#34C759'
  },
  folder: '#FFD60A' 
};