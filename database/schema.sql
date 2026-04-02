-- ============================================
-- EduVenture Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS eduventure CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eduventure;

-- Bảng admin
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng tin nổi bật (dùng cho cả trang chủ và chương trình)
CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  summary TEXT,
  content LONGTEXT,
  image VARCHAR(500),
  category ENUM('highlight', 'program') DEFAULT 'highlight',
  location VARCHAR(200),
  grade_level VARCHAR(100),
  event_date DATE,
  is_visible TINYINT(1) DEFAULT 1,
  is_pinned TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng giới thiệu công ty
CREATE TABLE IF NOT EXISTS about (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(500),
  content LONGTEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng link tải xuống theo chương trình & khối lớp
-- (thêm cột grade_active nếu chưa có)
-- ALTER TABLE program_downloads ADD COLUMN IF NOT EXISTS grade_active TINYINT(1) DEFAULT 1;
CREATE TABLE IF NOT EXISTS downloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  link_key ENUM('main', 'drive1', 'drive2') NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  description VARCHAR(500),
  version VARCHAR(50),
  file_size VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng cài đặt liên hệ (địa chỉ, map, số điện thoại...)
CREATE TABLE IF NOT EXISTS contact_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng tin nhắn liên hệ từ người dùng
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Dữ liệu mẫu
-- ============================================

-- Admin mặc định (password: Admin@2025)
INSERT INTO admin_users (email, password, name) VALUES
('admin@eduventure.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin')
ON DUPLICATE KEY UPDATE id=id;

-- Dữ liệu về chúng tôi
INSERT INTO about (section_key, title, content) VALUES
('mission', 'Sứ mệnh', 'EduVenture được thành lập với sứ mệnh trang bị kỹ năng sống thực tiễn cho học sinh tiểu học từ lớp 1 đến lớp 5, giúp các em phát triển toàn diện về nhân cách và tư duy.'),
('vision', 'Tầm nhìn', 'Trở thành đơn vị giáo dục kỹ năng sống hàng đầu Việt Nam, hiện diện tại 100% trường tiểu học trên toàn quốc vào năm 2030.'),
('about_text', 'Giới thiệu công ty', 'Thành lập năm 2015, EduVenture đã triển khai chương trình kỹ năng sống tại hơn 120 trường tiểu học, đồng hành cùng hơn 50.000 học sinh. Chúng tôi tin rằng giáo dục kỹ năng sống là nền tảng không thể thiếu bên cạnh kiến thức học thuật.'),
('stats_schools', '120+', NULL),
('stats_students', '50,000+', NULL),
('stats_years', '10+', NULL)
ON DUPLICATE KEY UPDATE updated_at=NOW();

-- Dữ liệu link tải xuống
INSERT INTO downloads (link_key, label, url, description, version, file_size) VALUES
('main', 'Tải xuống chính thức', 'https://hosting.eduventure.vn/download/EduVenture_v2.5.1.exe', 'Lưu trữ trên server hosting — tốc độ cao nhất', 'v2.5.1', '245 MB'),
('drive1', 'Google Drive (Link 1)', 'https://drive.google.com/your-link-1', 'Liên kết dự phòng 1', 'v2.5.1', '245 MB'),
('drive2', 'Google Drive (Link 2)', 'https://drive.google.com/your-link-2', 'Liên kết dự phòng 2', 'v2.5.1', '245 MB')
ON DUPLICATE KEY UPDATE updated_at=NOW();

-- Dữ liệu cài đặt liên hệ
INSERT INTO contact_settings (setting_key, setting_value) VALUES
('address', 'Số 12, Đường Nguyễn Văn Cừ, Phường ABC, Quận Ba Đình, Hà Nội'),
('email', 'info@eduventure.vn'),
('phone', '0243 xxx xxxx'),
('working_hours', 'Thứ 2 – Thứ 6: 8:00 – 17:30'),
('map_embed', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.87!2d105.8412!3d21.0285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDAx!5e0!3m2!1svi!2svn!4v1234567890'),
('download_paused', '0'),
('download_pause_message', 'Chức năng tải xuống đang tạm dừng để bảo trì. Vui lòng quay lại sau hoặc liên hệ EduVenture để biết thêm thông tin.')
ON DUPLICATE KEY UPDATE updated_at=NOW();

-- Tin nổi bật mẫu
INSERT INTO news (title, slug, summary, content, category, location, grade_level, event_date, is_visible, is_pinned) VALUES
('Triển khai chương trình kỹ năng sống tại Trường TH Nguyễn Du', 'trien-khai-chuong-trinh-th-nguyen-du', 'Phối hợp cùng Ban giám hiệu tổ chức buổi học kỹ năng cho 3 khối lớp 1, 2, 3 với hơn 400 học sinh tham dự.', '<p>Ngày 14/03/2025, EduVenture chính thức triển khai chương trình kỹ năng sống tại Trường Tiểu học Nguyễn Du, Hà Nội.</p><p>Buổi học thu hút hơn 400 học sinh tham dự với các hoạt động thực tiễn phong phú.</p>', 'program', 'Hà Nội', 'Lớp 1–3', '2025-03-14', 1, 1),
('Hội thảo nâng cao nhận thức kỹ năng sống — Hải Dương 2025', 'hoi-thao-ky-nang-song-hai-duong-2025', 'Sự kiện quy tụ hơn 200 giáo viên và phụ huynh từ 15 trường tiểu học tỉnh Hải Dương.', '<p>Hội thảo "Nâng cao nhận thức kỹ năng sống trong trường tiểu học" diễn ra ngày 01/03/2025 tại Hải Dương.</p>', 'program', 'Hải Dương', 'Tất cả khối', '2025-03-01', 1, 1),
('Ra mắt module Lớp 3 cập nhật 2025', 'ra-mat-module-lop-3-2025', 'Module kỹ năng sống dành cho lớp 3 được cập nhật toàn diện với nội dung mới phù hợp chương trình GDPT 2018.', '<p>EduVenture ra mắt phiên bản cập nhật của module Lớp 3, bổ sung nhiều nội dung theo chương trình GDPT 2018.</p>', 'highlight', NULL, 'Lớp 3', '2025-02-20', 1, 1)
ON DUPLICATE KEY UPDATE updated_at=NOW();