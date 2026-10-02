-- Add a CMS-managed menu for the public footer's Important links column.
ALTER TYPE ccshau_menu_location ADD VALUE IF NOT EXISTS 'important_links';
