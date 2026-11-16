export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  blockedReason: string | null;
  blockedUntil: string | null;
  createdAt: string;
};

export type AuditLogItem = {
  id: string;
  action: string;
  payload: unknown;
  createdAt: string;
  actor: { id: string; email: string; fullName: string } | null;
};

export type UserAuditLogResponse = {
  items: AuditLogItem[];
};

export function auditActionLabel(action: string): string {
  switch (action) {
    case "block_user":
      return "Блокировка";
    case "unblock_user":
      return "Разблокировка";
    case "change_user_role":
      return "Смена роли";
    case "login":
      return "Вход";
    case "logout":
      return "Выход";
    case "register":
      return "Регистрация";
    default:
      return action;
  }
}

export type IdentityAdminStats = {
  usersTotal: number;
  usersActive: number;
  usersBlocked: number;
  byRole: Record<string, number>;
};

export type CatalogAdminStats = {
  institutions: number;
  specialties: number;
  subjects: number;
  campaigns: number;
  passingScores: number;
};

export type Institution = {
  id: string;
  type: string;
  shortName: string;
  fullName: string;
  address: string | null;
  city: string | null;
  isPublished: boolean;
};

export type Subject = {
  id: string;
  name: string;
  shortCode: string;
  status: string;
};

export type PassingScore = {
  id: string;
  specialtyId: string;
  year: number;
  score: number;
  competition: number | null;
};

export type Specialty = {
  id: string;
  institutionId: string;
  okrbCode: string;
  name: string;
  studyForm: string;
  funding: string;
  placesPlan: number;
  contentMode: string;
  isPublished: boolean;
  institution?: Institution;
  passingScores?: PassingScore[];
};

export type CampaignStage = {
  id: string;
  campaignId: string;
  sortOrder: number;
  name: string;
  startsOn: string;
  endsOn: string;
};

export type Campaign = {
  id: string;
  year: number;
  isActive: boolean;
  stages?: CampaignStage[];
};

export function roleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Администратор";
    case "moderator":
      return "Модератор";
    case "examiner":
      return "Экзаменатор";
    case "applicant":
      return "Абитуриент";
    default:
      return role;
  }
}

export function userStatusLabel(status: string): string {
  return status === "blocked" ? "Заблокирован" : "Активен";
}