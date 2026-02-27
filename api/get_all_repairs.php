<?php
require_once '../config/config.php';
require_once '../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $filters = json_decode($input, true);
    
    // Build SQL query
    $where = "WHERE 1=1";
    $params = [];
    
    // Apply filters
    if (!empty($filters['repair_date'])) {
        $where .= " AND DATE(start_job) = :repair_date";
        $params[':repair_date'] = $filters['repair_date'];
    }
    
    if (!empty($filters['document_no'])) {
        $where .= " AND document_no LIKE :document_no";
        $params[':document_no'] = '%' . $filters['document_no'] . '%';
    }
    
    if (!empty($filters['status'])) {
        $where .= " AND status = :status";
        $params[':status'] = $filters['status'];
    }
    
    if (!empty($filters['machine_number'])) {
        $where .= " AND machine_number = :machine_number";
        $params[':machine_number'] = $filters['machine_number'];
    }
    
    if (!empty($filters['registry_signer'])) {
        if ($filters['registry_signer'] === 'empty') {
            $where .= " AND (registry_signer IS NULL OR registry_signer = '')";
        } elseif ($filters['registry_signer'] === 'not_empty') {
            $where .= " AND registry_signer IS NOT NULL AND registry_signer != ''";
        }
    }

    // Pagination
    $page  = isset($filters['page'])  ? max(1, intval($filters['page']))  : 1;
    $limit = isset($filters['limit']) ? max(1, intval($filters['limit'])) : 30;
    $offset = ($page - 1) * $limit;

    // Count total rows
    $stmt_count = $conn->prepare("SELECT COUNT(*) FROM mt_repair $where");
    foreach ($params as $key => $value) {
        $stmt_count->bindValue($key, $value);
    }
    $stmt_count->execute();
    $total = (int)$stmt_count->fetchColumn();
    $total_pages = (int)ceil($total / $limit);

    // Fetch page rows
    $stmt = $conn->prepare("SELECT * FROM mt_repair $where ORDER BY start_job DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    json_response(true, 'ดึงข้อมูลสำเร็จ', [
        'rows'        => $data,
        'total'       => $total,
        'total_pages' => $total_pages,
        'page'        => $page,
        'limit'       => $limit,
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    json_response(false, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
}
?>
