export type ID = string;

export interface Department {
  id: ID;
  name: string;
  color: string;
  headId?: ID;
}

export type Role = 'Admin' | 'Manager' | 'Member' | 'Finance';

export interface Member {
  id: ID;
  name: string;
  title: string;
  departmentId: ID;
  role: Role;
  /** Internal cost per hour */
  costRate: number;
  /** Billable rate charged to clients per hour */
  billRate: number;
  capacity: number; // hours per week
}

export interface Client {
  id: ID;
  name: string;
  contact: string;
  email: string;
  industry: string;
  status: 'Lead' | 'Active' | 'Paused' | 'Archived';
}

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
export type BillingType = 'Fixed' | 'Time & Materials' | 'Retainer';

export interface Project {
  id: ID;
  name: string;
  clientId: ID;
  ownerId: ID;
  status: ProjectStatus;
  billing: BillingType;
  budget: number;
  startDate: string; // ISO yyyy-mm-dd
  dueDate: string;
  description: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Task {
  id: ID;
  projectId: ID;
  title: string;
  assigneeId?: ID;
  departmentId: ID;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  estimateHours: number;
}

/** A pipeline of departments that a work item travels through. */
export interface WorkflowTemplate {
  id: ID;
  name: string;
  stages: ID[]; // department ids in order
}

export type WorkItemState = 'Active' | 'Blocked' | 'Completed';

export interface WorkHistoryEntry {
  at: string; // ISO datetime
  byId?: ID;
  action: 'created' | 'advanced' | 'returned' | 'blocked' | 'unblocked' | 'completed' | 'assigned' | 'comment';
  fromStage?: number;
  toStage?: number;
  note?: string;
}

/** A unit of work handed off between departments (e.g. a campaign brief). */
export interface WorkItem {
  id: ID;
  title: string;
  projectId: ID;
  templateId: ID;
  stageIndex: number;
  state: WorkItemState;
  assigneeId?: ID;
  priority: Priority;
  dueDate: string;
  history: WorkHistoryEntry[];
}

export interface TimeEntry {
  id: ID;
  memberId: ID;
  projectId: ID;
  date: string;
  hours: number;
  billable: boolean;
  note: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: ID;
  number: string;
  clientId: ID;
  projectId?: ID;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  taxRate: number; // percent
  paidDate?: string;
}

export type ExpenseCategory = 'Software' | 'Media Spend' | 'Freelancer' | 'Travel' | 'Production' | 'Office' | 'Other';

export interface Expense {
  id: ID;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  projectId?: ID;
  departmentId?: ID;
  billable: boolean;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Settings {
  agencyName: string;
  currency: string;
  locale: string;
  currentUserId: ID;
  defaultTaxRate: number;
}

export interface Activity {
  id: ID;
  at: string;
  text: string;
}

export interface AppData {
  version: number;
  settings: Settings;
  departments: Department[];
  members: Member[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  templates: WorkflowTemplate[];
  workItems: WorkItem[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  expenses: Expense[];
  activity: Activity[];
}
