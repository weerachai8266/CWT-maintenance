-- สร้างตาราง mt_device_log สำหรับเก็บข้อมูลอุปกรณ์ของผู้ใช้งาน
-- ครอบคลุมทุก role: reporter (ผู้แจ้ง), handler (ผู้รับงาน), canceller (ผู้ยกเลิก), approver (ผู้อนุมัติ)
-- รันครั้งเดียวบน database: maintenance

CREATE TABLE IF NOT EXISTS mt_device_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    repair_id   INT NOT NULL,
    role        ENUM('reporter', 'handler', 'canceller', 'approver') NOT NULL,
    user_name   VARCHAR(100) DEFAULT NULL,
    device_type VARCHAR(20)  DEFAULT NULL,
    browser     VARCHAR(100) DEFAULT NULL,
    os          VARCHAR(100) DEFAULT NULL,
    ip_address  VARCHAR(50)  DEFAULT NULL,
    logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_id) REFERENCES mt_repair(id) ON DELETE CASCADE,
    INDEX idx_repair_id (repair_id),
    INDEX idx_role (role),
    INDEX idx_ip_address (ip_address)
);
