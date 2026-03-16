-- ตาราง login log: บันทึกทุกการเข้า/ออก (สำเร็จ/ล้มเหลว)
CREATE TABLE IF NOT EXISTS mt_login_log (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT DEFAULT NULL          COMMENT 'FK → mt_users.id (NULL ถ้า username ไม่พบ)',
    username     VARCHAR(100) NOT NULL     COMMENT 'username ที่พยายาม login',
    ip_address   VARCHAR(45) NOT NULL      COMMENT 'IP ผู้ใช้ (รองรับ IPv6)',
    device_type  VARCHAR(50) DEFAULT NULL  COMMENT 'ประเภทอุปกรณ์: Desktop / Mobile / Tablet / Bot',
    browser      VARCHAR(100) DEFAULT NULL COMMENT 'ชื่อ Browser เช่น Chrome 120, Firefox 122',
    os           VARCHAR(100) DEFAULT NULL COMMENT 'ระบบปฏิบัติการ เช่น Windows 10, Android 14, iOS 17',
    user_agent   VARCHAR(500) DEFAULT NULL COMMENT 'Raw User-Agent string',
    status       ENUM('success','failed','locked','disabled','logout') NOT NULL COMMENT 'ผลการ login/logout',
    note         VARCHAR(255) DEFAULT NULL COMMENT 'หมายเหตุเพิ่มเติม',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาที่เกิด event',

    INDEX idx_user_id   (user_id),
    INDEX idx_ip        (ip_address),
    INDEX idx_status    (status),
    INDEX idx_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บันทึกประวัติการ login/logout ทุก event';

-- เพิ่มคอลัมน์ last_login_ip ใน mt_users (compatible กับ MySQL 5.7+)
DROP PROCEDURE IF EXISTS _add_last_login_ip;
DELIMITER //
CREATE PROCEDURE _add_last_login_ip()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'mt_users'
          AND COLUMN_NAME  = 'last_login_ip'
    ) THEN
        ALTER TABLE mt_users
            ADD COLUMN last_login_ip VARCHAR(45) DEFAULT NULL
            COMMENT 'IP ที่ login ครั้งล่าสุด'
            AFTER last_login;
    END IF;
END //
DELIMITER ;
CALL _add_last_login_ip();
DROP PROCEDURE IF EXISTS _add_last_login_ip;
