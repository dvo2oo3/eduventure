-- Migration: thêm cột ẩn link cho bảng program_downloads
-- Chạy một lần trên database production:
--   mysql -u <user> -p <dbname> < migrate_hidden_links.sql

ALTER TABLE program_downloads
  ADD COLUMN IF NOT EXISTS hidden_main    TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden_mirror1 TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden_mirror2 TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden_mirror3 TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE downloads 
  ADD COLUMN hidden_main    TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN hidden_mirror1 TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN hidden_mirror2 TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN hidden_mirror3 TINYINT(1) NOT NULL DEFAULT 0;