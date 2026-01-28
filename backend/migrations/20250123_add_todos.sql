-- Migration: Add todos table for persistent notes/TODOs
-- Supports scoped todos: PLAN_DAY, PLAN_WEEK, ADMIN_GLOBAL

CREATE TABLE IF NOT EXISTS todos (
  id VARCHAR(50) PRIMARY KEY,
  scope VARCHAR(50) NOT NULL, -- 'PLAN_DAY', 'PLAN_WEEK', 'ADMIN_GLOBAL'
  scope_id VARCHAR(255) NULL, -- date (YYYY-MM-DD) für PLAN_DAY/PLAN_WEEK, null für ADMIN_GLOBAL
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  completed BOOLEAN DEFAULT 0,
  created_by_user_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scope (scope, scope_id),
  INDEX idx_created_by (created_by_user_id),
  INDEX idx_completed (completed),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



