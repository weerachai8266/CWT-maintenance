<?php
require_once '../config/config.php';
require_once '../config/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_response(false, 'Method not allowed');
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['id']) || empty($data['id'])) {
    http_response_code(400);
    json_response(false, 'ไม่พบ ID');
}

$id = intval($data['id']);
$cancel_reason = isset($data['reason']) ? trim($data['reason']) : '';
$cancelled_by  = isset($data['cancelled_by']) ? trim($data['cancelled_by']) : '';

// Device info (ส่งมาจาก client)
$device_type = isset($data['device_type']) ? trim($data['device_type']) : '';
$browser     = isset($data['browser'])     ? trim($data['browser'])     : '';
$os_name     = isset($data['os'])          ? trim($data['os'])          : '';

// ตรวจสอบว่ามีชื่อผู้ยกเลิก
if (empty($cancelled_by)) {
    http_response_code(400);
    json_response(false, 'กรุณาระบุชื่อผู้ยกเลิก');
}

if (empty($cancel_reason)) {
    http_response_code(400);
    json_response(false, 'กรุณาระบุเหตุผลการยกเลิก');
}

try {
    // ตรวจสอบว่ามีข้อมูลอยู่จริง
    $checkSql = "SELECT id, status, document_no FROM mt_repair WHERE id = :id";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
    $checkStmt->execute();
    $repair = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$repair) {
        json_response(false, 'ไม่พบข้อมูลใบแจ้งซ่อม');
    }
    
    // ตรวจสอบว่าสถานะปัจจุบันสามารถยกเลิกได้หรือไม่
    $currentStatus = intval($repair['status']);
    if ($currentStatus == STATUS_CANCELLED) {
        json_response(false, 'ใบแจ้งซ่อมนี้ถูกยกเลิกไปแล้ว');
    }
    
    // อัพเดตสถานะเป็นยกเลิก
    $updateSql = "UPDATE mt_repair 
                  SET status = :status,
                      cancelled_by = :cancelled_by,
                      cancel_reason = :reason,
                      cancel_date = NOW()
                  WHERE id = :id";
    
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bindValue(':status', STATUS_CANCELLED, PDO::PARAM_INT);
    $updateStmt->bindParam(':cancelled_by', $cancelled_by, PDO::PARAM_STR);
    $updateStmt->bindParam(':reason', $cancel_reason, PDO::PARAM_STR);
    $updateStmt->bindParam(':id', $id, PDO::PARAM_INT);
    $updateStmt->execute();
    
    if ($updateStmt->rowCount() > 0) {
        // บันทึก device log (ผู้ยกเลิก)
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $dlSql = "INSERT INTO mt_device_log (repair_id, role, user_name, device_type, browser, os, ip_address)
                      VALUES (:repair_id, 'canceller', :user_name, :device_type, :browser, :os, :ip)";
            $dlStmt = $conn->prepare($dlSql);
            $dlStmt->execute([
                ':repair_id'   => $id,
                ':user_name'   => $cancelled_by,
                ':device_type' => $device_type,
                ':browser'     => $browser,
                ':os'          => $os_name,
                ':ip'          => $ip,
            ]);
        } catch (Exception $e) {
            error_log("Device log error (canceller): " . $e->getMessage());
        }
        json_response(true, 'ยกเลิกใบแจ้งซ่อม ' . $repair['document_no'] . ' เรียบร้อยแล้ว');
    } else {
        json_response(false, 'ไม่สามารถยกเลิกใบแจ้งซ่อมได้');
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    json_response(false, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
}
?>
