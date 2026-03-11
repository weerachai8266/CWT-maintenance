<?php
require_once '../config/config.php';
require_once '../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $machine_number = trim($_GET['machine_number'] ?? '');
    $date_from = trim($_GET['dateFrom'] ?? '');
    
    if (empty($machine_number)) {
        throw new Exception('Machine number parameter is required');
    }

    // Use dateFrom to determine month/year, fallback to current month
    if (!empty($date_from) && strtotime($date_from)) {
        $filter_year  = date('Y', strtotime($date_from));
        $filter_month = date('m', strtotime($date_from));
    } else {
        $filter_year  = date('Y');
        $filter_month = date('m');
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
        downtime_hours,
        total_cost,
        TIMESTAMPDIFF(HOUR, start_job, COALESCE(end_job, NOW())) as calc_hours
        FROM mt_repair
        WHERE machine_number = :machine_number and action_type = 'repair' and start_job IS NOT NULL
        AND YEAR(start_job) = :filter_year AND MONTH(start_job) = :filter_month
        ORDER BY start_job DESC
        LIMIT 50";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([':machine_number' => $machine_number, ':filter_year' => $filter_year, ':filter_month' => $filter_month]);
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
