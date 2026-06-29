/**
 * CCSHAU database TypeScript types — aligned with Phase 2 schema
 * @see docs/phase-2/database-schema.md
 */

export type ContentStatus = "draft" | "pending_review" | "published" | "archived";

export type PageType = "standard" | "college";

export type UserRole = "super_admin" | "dept_admin" | "editor" | "viewer";

export type MenuLocation = "header" | "footer" | "quick_links";

export type NoticeType = "news" | "notice" | "corrigendum" | "cancellation";

export type TenderStatus = "draft" | "open" | "closed" | "archived";

export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export type MediaAlbumType = "photo" | "video" | "press_release" | "event";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "upload"
  | "archive"
  | "lockout";

export interface AttachmentPath {
  path: string;
  name: string;
  size?: number;
}

export interface Department {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Subset returned by listDepartments() for admin form pickers */
export type DepartmentOption = Pick<Department, "id" | "name_en">;

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  department_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: UserRole;
  department_id: string | null;
  created_at: string;
}

export interface SiteSettings {
  id: number;
  captcha_enabled: boolean;
  email_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface Page {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  content_en: string | null;
  content_hi: string | null;
  excerpt_en: string | null;
  excerpt_hi: string | null;
  meta_title: string | null;
  meta_description: string | null;
  department_id: string | null;
  content_owner_id: string | null;
  parent_id: string | null;
  page_type: PageType;
  status: ContentStatus;
  published_at: string | null;
  featured_image_path: string | null;
  logo_image_path: string | null;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  body_en: string | null;
  body_hi: string | null;
  notice_type: NoticeType;
  category: string | null;
  department_id: string | null;
  content_owner_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  expires_at: string | null;
  is_featured: boolean;
  is_pinned: boolean;
  attachment_paths: AttachmentPath[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tender {
  id: string;
  tender_number: string | null;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  category: string | null;
  department_id: string | null;
  content_owner_id: string | null;
  status: TenderStatus;
  published_at: string | null;
  closing_date: string | null;
  archived_at: string | null;
  document_paths: AttachmentPath[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenderCorrigendum {
  id: string;
  tender_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  published_at: string;
  created_by: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  ticket_number: string;
  category: string | null;
  department_id: string | null;
  submitter_name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: FeedbackStatus;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  location: MenuLocation;
  name_en: string;
  name_hi: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  label_en: string;
  label_hi: string | null;
  href: string | null;
  page_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: string;
  title: string;
  image_path: string;
  target_url: string | null;
  alt_text: string | null;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Circular {
  id: string;
  circular_number: string | null;
  title_en: string;
  title_hi: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  department_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Download {
  id: string;
  title_en: string;
  title_hi: string | null;
  category: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  version: string | null;
  department_id: string | null;
  status: ContentStatus;
  download_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAlbum {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  album_type: MediaAlbumType;
  event_date: string | null;
  department_id: string | null;
  cover_image_path: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  album_id: string;
  title_en: string | null;
  title_hi: string | null;
  media_type: "image" | "video";
  storage_path: string;
  thumbnail_path: string | null;
  caption_en: string | null;
  caption_hi: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface UrlRedirect {
  id: string;
  legacy_path: string;
  new_path: string;
  redirect_type: 301 | 302;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatedLink {
  id: string;
  title_en: string;
  title_hi: string | null;
  url: string;
  category: string | null;
  sort_order: number;
  is_external: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Bilingual field pair for CMS forms */
export interface BilingualFields {
  titleEn: string;
  titleHi?: string;
  contentEn?: string;
  contentHi?: string;
}
