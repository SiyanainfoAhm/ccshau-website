# CCSHAU Database Schema Inventory

Generated: 2026-07-29  
Source migrations: **46**

## Summary

| Object | Count |
|--------|------:|
| Tables | 36 |
| Custom types / enums | 15 |
| Functions | 14 |
| Triggers | 35 |
| Indexes | 48 |
| RLS policies | 53 |

## Tables (36)

- `ccshau_audit_logs`
- `ccshau_banners`
- `ccshau_circulars`
- `ccshau_department_modules`
- `ccshau_departments`
- `ccshau_download_versions`
- `ccshau_downloads`
- `ccshau_feedback`
- `ccshau_homepage_cta`
- `ccshau_homepage_dignitaries`
- `ccshau_homepage_initiatives`
- `ccshau_homepage_quotes`
- `ccshau_login_attempts`
- `ccshau_media_albums`
- `ccshau_media_items`
- `ccshau_menu_items`
- `ccshau_menus`
- `ccshau_news`
- `ccshau_page_contact_lines`
- `ccshau_page_gallery_items`
- `ccshau_page_news_ticker_items`
- `ccshau_page_sidebar_items`
- `ccshau_page_staff`
- `ccshau_page_student_corner_items`
- `ccshau_pages`
- `ccshau_pg_seminar_registrations`
- `ccshau_profiles`
- `ccshau_related_links`
- `ccshau_schema_meta`
- `ccshau_site_settings`
- `ccshau_tender_corrigenda`
- `ccshau_tenders`
- `ccshau_url_redirects`
- `ccshau_user_colleges`
- `ccshau_user_department_pages`
- `ccshau_user_roles`

## Enum / custom types (15)

- `ccshau_audit_action`
- `ccshau_cms_module`
- `ccshau_college_scope_role`
- `ccshau_content_status`
- `ccshau_department_page_role`
- `ccshau_feedback_status`
- `ccshau_layout_template`
- `ccshau_media_album_type`
- `ccshau_menu_location`
- `ccshau_notice_type`
- `ccshau_page_type`
- `ccshau_pg_seminar_registration_status`
- `ccshau_staff_member_type`
- `ccshau_tender_status`
- `ccshau_user_role`

## Functions (14)

- `ccshau_archive_expired_downloads`
- `ccshau_archive_expired_news`
- `ccshau_archive_expired_tenders`
- `ccshau_generate_ticket_number`
- `ccshau_get_vault_secret`
- `ccshau_increment_download_count`
- `ccshau_is_super_admin`
- `ccshau_process_expired_tenders`
- `ccshau_resolve_college_root_id`
- `ccshau_set_page_college_root_id`
- `ccshau_set_updated_at`
- `ccshau_update_search_vector`
- `ccshau_user_department_ids`
- `ccshau_write_audit_log`

## Triggers (35)

- `ccshau_trg_banners_updated_at`
- `ccshau_trg_circulars_search_vector`
- `ccshau_trg_circulars_updated_at`
- `ccshau_trg_departments_updated_at`
- `ccshau_trg_downloads_search_vector`
- `ccshau_trg_downloads_updated_at`
- `ccshau_trg_feedback_updated_at`
- `ccshau_trg_homepage_cta_updated_at`
- `ccshau_trg_homepage_dignitaries_updated_at`
- `ccshau_trg_homepage_initiatives_updated_at`
- `ccshau_trg_homepage_quotes_updated_at`
- `ccshau_trg_media_albums_updated_at`
- `ccshau_trg_media_items_updated_at`
- `ccshau_trg_menu_items_updated_at`
- `ccshau_trg_menus_updated_at`
- `ccshau_trg_news_search_vector`
- `ccshau_trg_news_updated_at`
- `ccshau_trg_page_contact_lines_updated_at`
- `ccshau_trg_page_gallery_items_updated_at`
- `ccshau_trg_page_news_ticker_items_updated_at`
- `ccshau_trg_page_sidebar_items_updated_at`
- `ccshau_trg_page_staff_updated_at`
- `ccshau_trg_page_student_corner_items_updated_at`
- `ccshau_trg_pages_college_root_id`
- `ccshau_trg_pages_search_vector`
- `ccshau_trg_pages_updated_at`
- `ccshau_trg_pg_seminar_registrations_updated_at`
- `ccshau_trg_profiles_updated_at`
- `ccshau_trg_related_links_updated_at`
- `ccshau_trg_site_settings_updated_at`
- `ccshau_trg_tenders_search_vector`
- `ccshau_trg_tenders_updated_at`
- `ccshau_trg_url_redirects_updated_at`
- `ccshau_trg_user_colleges_updated_at`
- `ccshau_trg_user_department_pages_updated_at`

## Indexes (48)

- `ccshau_idx_audit_logs_created_at`
- `ccshau_idx_audit_logs_entity`
- `ccshau_idx_audit_logs_user_id`
- `ccshau_idx_banners_active`
- `ccshau_idx_circulars_search_vector`
- `ccshau_idx_circulars_status`
- `ccshau_idx_department_modules_department`
- `ccshau_idx_download_versions_download_id`
- `ccshau_idx_downloads_category`
- `ccshau_idx_downloads_expires_at`
- `ccshau_idx_downloads_search_vector`
- `ccshau_idx_downloads_tags`
- `ccshau_idx_feedback_created_at`
- `ccshau_idx_feedback_status`
- `ccshau_idx_login_attempts_email_time`
- `ccshau_idx_media_items_album_id`
- `ccshau_idx_menu_items_menu_id`
- `ccshau_idx_menu_items_parent_id`
- `ccshau_idx_news_expires_at`
- `ccshau_idx_news_published_at`
- `ccshau_idx_news_search_vector`
- `ccshau_idx_news_status`
- `ccshau_idx_page_contact_lines_page`
- `ccshau_idx_page_gallery_items_page`
- `ccshau_idx_page_news_ticker_items_expires`
- `ccshau_idx_page_news_ticker_items_page`
- `ccshau_idx_page_sidebar_items_page`
- `ccshau_idx_page_staff_page`
- `ccshau_idx_page_staff_page_slug`
- `ccshau_idx_page_student_corner_items_expires`
- `ccshau_idx_page_student_corner_items_page`
- `ccshau_idx_pages_college_root_id`
- `ccshau_idx_pages_department_id`
- `ccshau_idx_pages_published_at`
- `ccshau_idx_pages_search_vector`
- `ccshau_idx_pages_status`
- `ccshau_idx_pg_seminar_reg_admission`
- `ccshau_idx_pg_seminar_reg_created_at`
- `ccshau_idx_pg_seminar_reg_status`
- `ccshau_idx_profiles_department_id`
- `ccshau_idx_tender_corrigenda_tender_id`
- `ccshau_idx_tenders_closing_date`
- `ccshau_idx_tenders_search_vector`
- `ccshau_idx_tenders_status`
- `ccshau_idx_url_redirects_legacy_active`
- `ccshau_idx_user_colleges_college_page_id`
- `ccshau_idx_user_department_pages_page_id`
- `ccshau_idx_user_roles_user_id`

## RLS policies (53)

- `ccshau_pol_audit_logs_select_super_admin`
- `ccshau_pol_banners_select_active`
- `ccshau_pol_circulars_select_authenticated`
- `ccshau_pol_circulars_select_published`
- `ccshau_pol_department_modules_select`
- `ccshau_pol_departments_select_anon`
- `ccshau_pol_departments_select_authenticated`
- `ccshau_pol_downloads_select_authenticated`
- `ccshau_pol_downloads_select_published`
- `ccshau_pol_feedback_insert_anon`
- `ccshau_pol_feedback_select_authenticated`
- `ccshau_pol_homepage_cta_select_active`
- `ccshau_pol_homepage_cta_select_authenticated`
- `ccshau_pol_homepage_dignitaries_select_active`
- `ccshau_pol_homepage_dignitaries_select_authenticated`
- `ccshau_pol_homepage_initiatives_select_active`
- `ccshau_pol_homepage_initiatives_select_authenticated`
- `ccshau_pol_homepage_quotes_select_active`
- `ccshau_pol_homepage_quotes_select_authenticated`
- `ccshau_pol_media_albums_select_published`
- `ccshau_pol_media_items_select_published`
- `ccshau_pol_menu_items_select_active`
- `ccshau_pol_menus_select_active`
- `ccshau_pol_news_select_authenticated`
- `ccshau_pol_news_select_published`
- `ccshau_pol_page_contact_lines_select_active`
- `ccshau_pol_page_contact_lines_select_authenticated`
- `ccshau_pol_page_gallery_items_select_active`
- `ccshau_pol_page_gallery_items_select_authenticated`
- `ccshau_pol_page_news_ticker_items_select_active`
- `ccshau_pol_page_news_ticker_items_select_authenticated`
- `ccshau_pol_page_sidebar_items_select_active`
- `ccshau_pol_page_sidebar_items_select_authenticated`
- `ccshau_pol_page_staff_select_active`
- `ccshau_pol_page_staff_select_authenticated`
- `ccshau_pol_page_student_corner_items_select_active`
- `ccshau_pol_page_student_corner_items_select_authenticated`
- `ccshau_pol_pages_select_authenticated`
- `ccshau_pol_pages_select_published`
- `ccshau_pol_pg_seminar_reg_insert_anon`
- `ccshau_pol_pg_seminar_reg_select_authenticated`
- `ccshau_pol_profiles_select_own`
- `ccshau_pol_related_links_select_active`
- `ccshau_pol_schema_meta_select_authenticated`
- `ccshau_pol_site_settings_select_authenticated`
- `ccshau_pol_tender_corrigenda_select`
- `ccshau_pol_tenders_select_authenticated`
- `ccshau_pol_tenders_select_open`
- `ccshau_pol_url_redirects_select_active`
- `ccshau_pol_user_colleges_select_authenticated`
- `ccshau_pol_user_department_pages_select_authenticated`
- `ccshau_pol_user_roles_select`
- `ccshau_storage_public_read`

## Migrations in full script (46)

1. `20260623100000_phase_0_init.sql`
1. `20260623110000_ccshau_naming_convention.sql`
1. `20260623120000_phase_2_schema.sql`
1. `20260623130000_phase_2_rls_functions.sql`
1. `20260624120000_site_settings.sql`
1. `20260624120000_storage_buckets.sql`
1. `20260624140000_demo_content_seed.sql`
1. `20260624150000_menus_colleges_banners.sql`
1. `20260626120000_events_calendar_seed.sql`
1. `20260627120000_college_pages_mega_menu.sql`
1. `20260627140000_college_demo_sections.sql`
1. `20260627160000_main_header_menu.sql`
1. `20260627170000_menu_label_legacy_casing.sql`
1. `20260630210000_homepage_legacy_colleges.sql`
1. `20260630300000_homepage_cms.sql`
1. `20260701120000_office_portal_template.sql`
1. `20260702120000_sidebar_item_content.sql`
1. `20260703120000_layout_config.sql`
1. `20260703140000_college_of_agriculture_hisar_content.sql`
1. `20260703150000_college_contact_emails.sql`
1. `20260703160000_agricultural_economics_faculty.sql`
1. `20260703170000_hisar_gallery.sql`
1. `20260706100000_google_translate_vault_secret.sql`
1. `20260706110000_college_rbac.sql`
1. `20260706120000_coaet_college_migration.sql`
1. `20260706130000_faculty_profile_fields.sql`
1. `20260706140000_college_map_coordinates.sql`
1. `20260706150000_fix_college_root_page_type.sql`
1. `20260706160000_pg_studies_legacy_content.sql`
1. `20260706170000_pg_studies_microsite.sql`
1. `20260706180000_pg_studies_page_type_fix.sql`
1. `20260706190000_pg_seminar_registrations.sql`
1. `20260707100000_page_news_ticker_items.sql`
1. `20260707110000_page_news_ticker_expires_file.sql`
1. `20260707120000_page_student_corner_items.sql`
1. `20260707130000_directorate_type_b.sql`
1. `20260709150000_tender_lifecycle_enhancements.sql`
1. `20260709160000_downloads_repository_enhancements.sql`
1. `20260710100000_university_admin_reviewer_roles.sql`
1. `20260710120000_tender_pending_review.sql`
1. `20260710140000_department_modules.sql`
1. `20260710180000_computer_section_department.sql`
1. `20260710190000_legacy_department_modules.sql`
1. `20260722100000_department_hod_rbac.sql`
1. `20260722120000_faculty_qualification.sql`
1. `20260723140000_security_phase_a_locks.sql`

## Migrations also packaged as demo seed (14)

1. `20260624140000_demo_content_seed.sql`
1. `20260624150000_menus_colleges_banners.sql`
1. `20260626120000_events_calendar_seed.sql`
1. `20260627140000_college_demo_sections.sql`
1. `20260627160000_main_header_menu.sql`
1. `20260627170000_menu_label_legacy_casing.sql`
1. `20260630210000_homepage_legacy_colleges.sql`
1. `20260703140000_college_of_agriculture_hisar_content.sql`
1. `20260703150000_college_contact_emails.sql`
1. `20260703160000_agricultural_economics_faculty.sql`
1. `20260706120000_coaet_college_migration.sql`
1. `20260706160000_pg_studies_legacy_content.sql`
1. `20260706170000_pg_studies_microsite.sql`
1. `20260707130000_directorate_type_b.sql`

## Security locks (Phase A)

Included via `20260723140000_security_phase_a_locks.sql`:

- `ccshau_download_versions` — RLS enabled; `anon` / `authenticated` have no table grants; `service_role` only
- Sensitive RPCs (`ccshau_get_vault_secret`, `ccshau_write_audit_log`, `ccshau_archive_expired_*`, `ccshau_generate_ticket_number`) — `EXECUTE` for `service_role` only

Verify after apply with `03_verify_schema.sql` (security section at bottom).
