-- 創建默認管理員用戶
-- 密碼: admin123 (已加密)
INSERT IGNORE INTO admins (username, password, email) VALUES 
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@dronesoccer.com');

-- 查看創建的管理員用戶
SELECT admin_id, username, email, created_at FROM admins;