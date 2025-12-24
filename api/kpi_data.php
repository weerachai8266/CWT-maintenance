<?php
require_once '../config/config.php';
require_once '../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Get date range parameters
    $date_from = $_GET['date_from'] ?? date('Y-m-01'); // Default: first day of current month
    $date_to = $_GET['date_to'] ?? date('Y-m-d'); // Default: today
    
    // ===== 1. สถิติการแจ้งซ่อมตามสถานะ =====
    $sql_status = "SELECT 
        status,
        COUNT(*) as count
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to
        GROUP BY status";
    
    $stmt = $conn->prepare($sql_status);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $status_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 2. สถิติรวม =====
    // สถานะ: 10=รออนุมัติ, 11=ไม่อนุมัติ, 20=รอดำเนินการ, 30=รออะไหล่, 40=ซ่อมเสร็จสิ้น
    $sql_summary = "SELECT 
        COUNT(*) as total_repairs,
        COUNT(CASE WHEN status = 10 THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 11 THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 20 THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 30 THEN 1 END) as waiting_parts_count,
        COUNT(CASE WHEN status = 40 THEN 1 END) as completed_count,
        AVG(TIMESTAMPDIFF(HOUR, start_job, end_job)) as avg_repair_hours,
        AVG(TIMESTAMPDIFF(MINUTE, start_job, approved_at)) as avg_approval_minutes
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to";
    
    $stmt = $conn->prepare($sql_summary);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // ===== 3. เครื่องจักรที่มีปัญหาบ่อย (Top 10) =====
    $sql_frequent = "SELECT 
        machine_number,
        COUNT(*) as repair_count,
        COUNT(CASE WHEN status = 40 THEN 1 END) as completed_count
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to
        GROUP BY machine_number
        ORDER BY repair_count DESC
        LIMIT 10";
    
    $stmt = $conn->prepare($sql_frequent);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $frequent_machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 4. สถิติตามแผนก =====
    $sql_dept = "SELECT 
        department,
        COUNT(*) as repair_count,
        COUNT(CASE WHEN status = 40 THEN 1 END) as completed_count,
        AVG(TIMESTAMPDIFF(HOUR, start_job, end_job)) as avg_hours
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to
        GROUP BY department
        ORDER BY repair_count DESC";
    
    $stmt = $conn->prepare($sql_dept);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $dept_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 5. สถิติตามสาขา =====
    $sql_branch = "SELECT 
        branch,
        COUNT(*) as repair_count,
        COUNT(CASE WHEN status = 40 THEN 1 END) as completed_count
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to
        GROUP BY branch
        ORDER BY repair_count DESC";
    
    $stmt = $conn->prepare($sql_branch);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $branch_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 6. แนวโน้มรายวัน (30 วันล่าสุด) =====
    $sql_trend = "SELECT 
        DATE(start_job) as date,
        COUNT(*) as repair_count,
        COUNT(CASE WHEN status = 40 THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 20 THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 30 THEN 1 END) as waiting_parts_count,
        COUNT(CASE WHEN status = 10 THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 11 THEN 1 END) as rejected_count
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN DATE_SUB(:date_to, INTERVAL 30 DAY) AND :date_to
        GROUP BY DATE(start_job)
        ORDER BY DATE(start_job) ASC";
    
    $stmt = $conn->prepare($sql_trend);
    $stmt->execute([':date_to' => $date_to]);
    $daily_trend = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 7. ข้อมูลค่าใช้จ่ายจาก machine_history =====
    $sql_cost = "SELECT 
        COUNT(*) as total_history,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost,
        SUM(work_hours) as total_work_hours,
        SUM(downtime_hours) as total_downtime_hours
        FROM mt_machine_history
        WHERE DATE(work_date) BETWEEN :date_from AND :date_to";
    
    $stmt = $conn->prepare($sql_cost);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $cost_stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // ===== 8. ช่างที่ทำงานมากที่สุด =====
    $sql_technician = "SELECT 
        handled_by as technician,
        COUNT(*) as job_count,
        SUM(work_hours) as total_hours,
        AVG(work_hours) as avg_hours
        FROM mt_machine_history
        WHERE DATE(work_date) BETWEEN :date_from AND :date_to
        AND handled_by IS NOT NULL AND handled_by != ''
        GROUP BY handled_by
        ORDER BY job_count DESC
        LIMIT 10";
    
    $stmt = $conn->prepare($sql_technician);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $technician_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 9. เครื่องจักรที่มีค่าใช้จ่ายสูงสุด =====
    $sql_expensive_machines = "SELECT 
        machine_code,
        machine_name,
        COUNT(*) as repair_count,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost
        FROM mt_machine_history
        WHERE DATE(work_date) BETWEEN :date_from AND :date_to
        AND total_cost > 0
        GROUP BY machine_code, machine_name
        ORDER BY total_cost DESC
        LIMIT 10";
    
    $stmt = $conn->prepare($sql_expensive_machines);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $expensive_machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 9. สถิติเวลาทำงาน (work_hours) ตามสถานะ =====
    $sql_work_hours = "SELECT 
        status,
        COUNT(*) as count,
        AVG(work_hours) as avg_hours,
        SUM(work_hours) as total_hours,
        MIN(work_hours) as min_hours,
        MAX(work_hours) as max_hours
        FROM mt_machine_history
        WHERE DATE(start_date) BETWEEN :date_from AND :date_to
        AND work_hours IS NOT NULL
        GROUP BY status";
    
    $stmt = $conn->prepare($sql_work_hours);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $work_hours_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 10. สถิติเวลาหยุดเครื่อง (downtime_hours) ตามสถานะ =====
    $sql_downtime_hours = "SELECT 
        status,
        COUNT(*) as count,
        AVG(downtime_hours) as avg_hours,
        SUM(downtime_hours) as total_hours,
        MIN(downtime_hours) as min_hours,
        MAX(downtime_hours) as max_hours
        FROM mt_machine_history
        WHERE DATE(start_date) BETWEEN :date_from AND :date_to
        AND downtime_hours IS NOT NULL
        GROUP BY status";
    
    $stmt = $conn->prepare($sql_downtime_hours);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $downtime_hours_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 11. จำนวนเครื่องจักรทั้งหมด =====
    $sql_machines = "SELECT COUNT(*) as total_machines FROM mt_machines";
    $stmt = $conn->query($sql_machines);
    $machine_count = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // ===== 12. ประสิทธิภาพรายเดือน (Monthly Performance) - 12 เดือนล่าสุด =====
    $sql_monthly = "SELECT 
        DATE_FORMAT(start_job, '%Y-%m') as month,
        COUNT(*) as total_repairs,
        COUNT(CASE WHEN status = 40 THEN 1 END) as completed_repairs,
        AVG(TIMESTAMPDIFF(HOUR, start_job, end_job)) as avg_repair_hours,
        SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) / COUNT(*) * 100 as completion_rate
        FROM mt_repair
        WHERE start_job >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(start_job, '%Y-%m')
        ORDER BY month ASC";
    
    $stmt = $conn->query($sql_monthly);
    $monthly_performance = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 13. สาเหตุการเสีย (Failure Causes) สำหรับ Pareto Chart =====
    $sql_failure_causes = "SELECT 
        issue as cause,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM mt_repair WHERE DATE(start_job) BETWEEN :date_from AND :date_to) as percentage
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to
        AND issue IS NOT NULL AND issue != ''
        GROUP BY issue
        ORDER BY count DESC
        LIMIT 20";
    
    $stmt = $conn->prepare($sql_failure_causes);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $failure_causes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ===== 14. คำนวณ MTBF (Mean Time Between Failure) =====
    // MTBF = Total Operating Time / Number of Failures
    $sql_mtbf = "SELECT 
        machine_number,
        COUNT(*) as failure_count,
        SUM(TIMESTAMPDIFF(HOUR, start_job, COALESCE(end_job, NOW()))) as total_downtime,
        MAX(start_job) as last_failure,
        MIN(start_job) as first_failure
        FROM mt_repair
        WHERE DATE(start_job) BETWEEN :date_from AND :date_to
        GROUP BY machine_number
        HAVING failure_count > 1
        ORDER BY failure_count DESC
        LIMIT 20";
    
    $stmt = $conn->prepare($sql_mtbf);
    $stmt->execute([':date_from' => $date_from, ':date_to' => $date_to]);
    $mtbf_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // คำนวณ MTBF สำหรับแต่ละเครื่อง
    foreach ($mtbf_data as &$machine) {
        $period_hours = (strtotime($machine['last_failure']) - strtotime($machine['first_failure'])) / 3600;
        $machine['mtbf_hours'] = $machine['failure_count'] > 1 ? $period_hours / ($machine['failure_count'] - 1) : 0;
        $machine['mtbf_days'] = $machine['mtbf_hours'] / 24;
    }
    unset($machine);
    
    // คำนวณ MTBF รวมทั้งระบบ
    $total_failures = array_sum(array_column($mtbf_data, 'failure_count'));
    $total_period = 0;
    if (count($mtbf_data) > 0) {
        $all_dates = $conn->prepare("SELECT 
            MIN(start_job) as min_date,
            MAX(start_job) as max_date
            FROM mt_repair
            WHERE DATE(start_job) BETWEEN :date_from AND :date_to");
        $all_dates->execute([':date_from' => $date_from, ':date_to' => $date_to]);
        $dates = $all_dates->fetch(PDO::FETCH_ASSOC);
        if ($dates['min_date'] && $dates['max_date']) {
            $total_period = (strtotime($dates['max_date']) - strtotime($dates['min_date'])) / 3600;
        }
    }
    $overall_mtbf = [
        'total_failures' => $total_failures,
        'total_period_hours' => $total_period,
        'mtbf_hours' => $total_failures > 0 ? $total_period / $total_failures : 0,
        'mtbf_days' => $total_failures > 0 ? ($total_period / $total_failures) / 24 : 0
    ];
    
    // Response
    $response = [
        'success' => true,
        'date_range' => [
            'from' => $date_from,
            'to' => $date_to
        ],
        'data' => [
            'summary' => $summary,
            'status_stats' => $status_stats,
            'work_hours_stats' => $work_hours_stats,
            'downtime_hours_stats' => $downtime_hours_stats,
            'frequent_machines' => $frequent_machines,
            'department_stats' => $dept_stats,
            'branch_stats' => $branch_stats,
            'daily_trend' => $daily_trend,
            'cost_stats' => $cost_stats,
            'technician_stats' => $technician_stats,
            'expensive_machines' => $expensive_machines,
            'machine_count' => $machine_count,
            'monthly_performance' => $monthly_performance,
            'failure_causes' => $failure_causes,
            'mtbf_data' => $mtbf_data,
            'overall_mtbf' => $overall_mtbf
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
