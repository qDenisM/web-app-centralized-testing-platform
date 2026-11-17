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
  lastLoginAt?: string | null;
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
    case "token_refresh":
      return "Обновление токена";
    case "ct_apply":
      return "Запись на ЦТ";
    case "ct_cancel":
      return "Отмена записи на ЦТ";
    case "ct_waitlist_join":
      return "Лист ожидания ЦТ";
    case "ct_waitlist_cancel":
      return "Выход из листа ожидания";
    case "ct_approved":
      return "Одобрение записи на ЦТ";
    case "ct_rejected":
      return "Отказ в записи на ЦТ";
    case "attestat_confirm":
      return "Сохранение аттестата";
    case "profile_update":
      return "Изменение профиля";
    case "verification_submit":
      return "Отправка анкеты на проверку";
    case "verification_approved":
      return "Анкета одобрена";
    case "verification_returned":
      return "Анкета возвращена";
    case "verification_rejected":
      return "Анкета отклонена";
    case "favorite_add":
      return "Добавление в избранное";
    case "favorite_remove":
      return "Удаление из избранного";
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
  institutionsUniversity?: number;
  institutionsCollege?: number;
  institutionsPublished?: number;
  institutionsHidden?: number;
  specialties: number;
  specialtiesBudget?: number;
  specialtiesPaid?: number;
  specialtiesWithoutPassingScore?: number;
  specialtiesWithoutPassingScoreSamples?: Array<{
    id: string;
    name: string;
    institutionShortName: string | null;
  }>;
  subjects: number;
  campaigns: number;
  passingScores: number;
  activeCampaignYear?: number;
};

export type Institution = {
  id: string;
  type: string;
  shortName: string;
  fullName: string;
  address: string | null;
  city: string | null;
  website?: string | null;
  isPublished: boolean;
  /** Present on admin list responses */
  specialtiesCount?: number;
};

export type Subject = {
  id: string;
  name: string;
  shortCode: string;
  status: string;
  /** Present on admin list responses */
  usageCount?: number;
};

export type PassingScore = {
  id: string;
  specialtyId: string;
  year: number;
  score: number;
  competition: number | null;
};

export type SpecialtySubject = {
  id: string;
  specialtyId: string;
  subjectId: string;
  slot: number;
  minScore: number;
  subject?: Subject;
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
  subjects?: SpecialtySubject[];
  passingScores?: PassingScore[];
};

export type StageStatusOverride = "done" | "active" | "upcoming";

export type CampaignStage = {
  id: string;
  campaignId: string;
  sortOrder: number;
  name: string;
  description?: string | null;
  startsOn: string;
  endsOn: string;
  /** Manual status. Null/undefined = compute from dates. */
  statusOverride?: StageStatusOverride | null;
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