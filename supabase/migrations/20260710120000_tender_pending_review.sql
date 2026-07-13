-- Tender approval workflow: editors submit for review, approvers publish as open.

ALTER TYPE ccshau_tender_status ADD VALUE IF NOT EXISTS 'pending_review' AFTER 'draft';
