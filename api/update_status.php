<?php
require_once '../config/config.php';
require_once '../config/db.php';

// Set JSON header
header('Content-Type: application/json; charset=utf-8');

// Validate input
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_response(false, 'Method not allowed');
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$status = filter_input(INPUT_POST, 'status', FILTER_VALIDATE_INT);
$handled_by = sanitize_input($_POST['handled_by'] ?? '');

// บันทึกการรับงาน (Section 4) - ข้อมูลจาก modal
$job_status = sanitize_input($_POST['job_status'] ?? 'complete');
$job_other_text = ($job_status === 'other') ? sanitize_input($_POST['job_other_text'] ?? '') : '';
$receiver_name = sanitize_input($_POST['receiver_name'] ?? '');

// Device info (ส่งมาจาก client)
$device_type = sanitize_input($_POST['device_type'] ?? '');
$browser     = sanitize_input($_POST['browser'] ?? '');
$os_name     = sanitize_input($_POST['os'] ?? '');

// Debug logging
error_log("DEBUG update_status.php - POST data: " . print_r($_POST, true));
error_log("DEBUG - id: $id, status: $status, handled_by: '$handled_by'");

if (!$id || $status === null || $status === false) {
    http_response_code(400);
    json_response(false, 'ข้อมูลไม่ครบถ้วน (id=' . $id . ', status=' . $status . ')');
}

// Validate status value (10, 20, 30, or 40)
if (!in_array($status, [STATUS_PENDING_APPROVAL, STATUS_PENDING, STATUS_WAITING_PARTS, STATUS_COMPLETED])) {
    http_response_code(400);
    json_response(false, 'สถานะไม่ถูกต้อง (status=' . $status . ')');
}

// ถ้าเป็นสถานะเสร็จสิ้น ต้องมีผู้ดำเนินการ
if ($status == STATUS_COMPLETED && empty($handled_by)) {
    http_response_code(400);
    json_response(false, 'กรุณาระบุชื่อผู้ดำเนินการ (handled_by is empty)');
}

$end_job = ($status == STATUS_COMPLETED) ? date('Y-m-d H:i:s') : null;
$image_after = '';

// Handle file upload (รูปหลังซ่อม) - เฉพาะสถานะเสร็จสิ้น
if ($status == STATUS_COMPLETED && isset($_FILES['image_after']) && $_FILES['image_after']['error'] === UPLOAD_ERR_OK) {
    $upload_base_dir = '../uploads/';
    $month_folder = date('Y-m');
    $upload_dir = $upload_base_dir . $month_folder . '/';
    
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    $max_size = 5 * 1024 * 1024; // 5MB
    
    $file_type = $_FILES['image_after']['type'];
    $file_size = $_FILES['image_after']['size'];
    
    if (!in_array($file_type, $allowed_types)) {
        http_response_code(400);
        json_response(false, 'ไฟล์ต้องเป็น JPG, PNG หรือ GIF เท่านั้น');
    }
    
    if ($file_size > $max_size) {
        http_response_code(400);
        json_response(false, 'ขนาดไฟล์ต้องไม่เกิน 5MB');
    }
    
    // Generate filename: after_0001.jpg
    $file_ext = pathinfo($_FILES['image_after']['name'], PATHINFO_EXTENSION);
    $new_filename = 'after_' . str_pad($id, 4, '0', STR_PAD_LEFT) . '.' . $file_ext;
    $upload_path = $upload_dir . $new_filename;
    
    if (move_uploaded_file($_FILES['image_after']['tmp_name'], $upload_path)) {
        $image_after = 'uploads/' . $month_folder . '/' . $new_filename;
    }
}

try {
    // Use prepared statement to prevent SQL injection
    $sql = "UPDATE mt_repair SET status = :status, end_job = :end_job";
    
    // อัพเดทข้อมูล Section 4 และรูปภาพ ถ้าเป็นสถานะเสร็จสิ้น
    if ($status == STATUS_COMPLETED) {
        $sql .= ", handled_by = :handled_by";
        $sql .= ", job_status = :job_status";
        $sql .= ", job_other_text = :job_other_text";
        $sql .= ", receiver_name = :receiver_name";
        if (!empty($image_after)) {
            $sql .= ", image_after = :image_after";
        }
    }
    
    $sql .= " WHERE id = :id";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':status', $status, PDO::PARAM_INT);
    $stmt->bindParam(':end_job', $end_job);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    
    if ($status == STATUS_COMPLETED) {
        $stmt->bindParam(':handled_by', $handled_by);
        $stmt->bindParam(':job_status', $job_status);
        $stmt->bindParam(':job_other_text', $job_other_text);
        $stmt->bindParam(':receiver_name', $receiver_name);
        if (!empty($image_after)) {
            $stmt->bindParam(':image_after', $image_after);
        }
    }
    
    $stmt->execute();

    // บันทึก device log เมื่อเสร็จสิ้น (ผู้รับงาน)
    if ($status == STATUS_COMPLETED) {
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $dlSql = "INSERT INTO mt_device_log (repair_id, role, user_name, device_type, browser, os, ip_address)
                      VALUES (:repair_id, 'handler', :user_name, :device_type, :browser, :os, :ip)";
            $dlStmt = $conn->prepare($dlSql);
            $dlStmt->execute([
                ':repair_id'   => $id,
                ':user_name'   => $handled_by,
                ':device_type' => $device_type,
                ':browser'     => $browser,
                ':os'          => $os_name,
                ':ip'          => $ip,
            ]);
        } catch (Exception $e) {
            error_log("Device log error (handler): " . $e->getMessage());
        }
    }

    // 🔥 Auto-sync to machine history when completed (status = 40)
    // if ($status == STATUS_COMPLETED) {
    //     $syncResult = syncRepairToHistory($id, $conn);
    //     if (!$syncResult) {
    //         error_log("Warning: Failed to sync repair ID $id to machine history");
    //     }
    // }
    
    // Get status name for response message
    $statusNames = [
        STATUS_PENDING_APPROVAL => 'รออนุมัติ',
        STATUS_PENDING => 'ดำเนินการ',
        STATUS_WAITING_PARTS => 'รออะไหล่',
        STATUS_COMPLETED => 'ซ่อมเสร็จสิ้น'
    ];
    
    json_response(true, 'อัพเดทสถานะเป็น "' . $statusNames[$status] . '" เรียบร้อย');
} catch (PDOException $e) {
    http_response_code(500);
    json_response(false, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
}
?>
