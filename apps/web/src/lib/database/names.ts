/**
 * CCSHAU database naming convention
 *
 * All application tables, functions, triggers, and policies use the CCSHAU_ prefix.
 * PostgreSQL stores unquoted identifiers as lowercase → `ccshau_<name>` in the database.
 *
 * @see docs/database-naming-convention.md
 */

/** Prefix as documented (CCSHAU_) */
export const CCSHAU_PREFIX = "CCSHAU_" as const;

/** Prefix as used in PostgreSQL identifiers (lowercase) */
export const PG_PREFIX = "ccshau_" as const;

/** Build a table name: CCSHAU_departments → ccshau_departments */
export function ccshauTable(name: string): string {
  const base = name.replace(/^(ccshau_|CCSHAU_)/i, "");
  return `${PG_PREFIX}${base}`;
}

/** Build a function name: archive_tenders → ccshau_archive_tenders */
export function ccshauFunction(name: string): string {
  const base = name.replace(/^(ccshau_|CCSHAU_)/i, "");
  return `${PG_PREFIX}${base}`;
}

/** Build a trigger name */
export function ccshauTrigger(table: string, event: string): string {
  return `${PG_PREFIX}trg_${table}_${event}`;
}

/** Build an RLS policy name */
export function ccshauPolicy(table: string, action: string): string {
  return `${PG_PREFIX}pol_${table}_${action}`;
}

/** Build an index name */
export function ccshauIndex(table: string, columns: string): string {
  return `${PG_PREFIX}idx_${table}_${columns}`;
}

/**
 * Application table names — always use these constants in queries.
 * Do not use raw table names without the CCSHAU_ prefix.
 */
export const Tables = {
  schemaMeta: ccshauTable("schema_meta"),
  departments: ccshauTable("departments"),
  profiles: ccshauTable("profiles"),
  userRoles: ccshauTable("user_roles"),
  pages: ccshauTable("pages"),
  menus: ccshauTable("menus"),
  menuItems: ccshauTable("menu_items"),
  news: ccshauTable("news"),
  circulars: ccshauTable("circulars"),
  tenders: ccshauTable("tenders"),
  tenderCorrigenda: ccshauTable("tender_corrigenda"),
  downloads: ccshauTable("downloads"),
  mediaAlbums: ccshauTable("media_albums"),
  mediaItems: ccshauTable("media_items"),
  banners: ccshauTable("banners"),
  feedback: ccshauTable("feedback"),
  relatedLinks: ccshauTable("related_links"),
  auditLogs: ccshauTable("audit_logs"),
  loginAttempts: ccshauTable("login_attempts"),
  urlRedirects: ccshauTable("url_redirects"),
  siteSettings: ccshauTable("site_settings"),
  homepageQuotes: ccshauTable("homepage_quotes"),
  homepageDignitaries: ccshauTable("homepage_dignitaries"),
  homepageInitiatives: ccshauTable("homepage_initiatives"),
  homepageCta: ccshauTable("homepage_cta"),
} as const;

export const Functions = {
  setUpdatedAt: ccshauFunction("set_updated_at"),
  writeAuditLog: ccshauFunction("write_audit_log"),
  archiveExpiredTenders: ccshauFunction("archive_expired_tenders"),
  archiveExpiredNews: ccshauFunction("archive_expired_news"),
  generateTicketNumber: ccshauFunction("generate_ticket_number"),
  isSuperAdmin: ccshauFunction("is_super_admin"),
} as const;
