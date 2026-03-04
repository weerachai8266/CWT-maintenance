<?php
require_once '../config/config.php';
require_once '../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $machine_number = trim($_GET['machine_number'] ?? '');
    
    if (empty($machine_number)) {
        throw new Exception('Machine number parameter is required');
    }
    
    // Get repair history
    $sql = "SELECT 
        id,
        document_no,
        machine_number,
        department,
        branch,
        issue,
        start_job,
        end_job,
        status,
        handled_by,
        work_hours,
        total_cost,
        TIMESTAMPDIFF(HOUR, start_job, COALESCE(end_job, NOW())) as calc_hours
        FROM mt_repair
        WHERE machine_number = :machine_number
        ORDER BY start_job DESC
        LIMIT 50";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([':machine_number' => $machine_number]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
