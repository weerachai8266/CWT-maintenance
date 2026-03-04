<?php
require_once '../config/config.php';
require_once '../config/db.php';

try {
    // Get filter parameters
    $filter_department = isset($_GET['department']) ? trim($_GET['department']) : '';
    $filter_machine = isset($_GET['machine']) ? trim($_GET['machine']) : '';
    $filter_reported_by = isset($_GET['reported_by']) ? trim($_GET['reported_by']) : '';
    $filter_status = isset($_GET['status']) ? $_GET['status'] : '';
    
    // Build SQL query with filters
    $sql = "SELECT id, division, department, branch, document_no, machine_number, issue, image_before, image_after, reported_by, handled_by, mt_report, status, start_job, end_job, reject_reason, cancel_reason
            FROM mt_repair 
            WHERE 1=1";
    
    $params = [];
    
    // Filter by status first
    if ($filter_status !== '') {
        $sql .= " AND status = :status";
        $params[':status'] = intval($filter_status);
    } else {
        // If no status filter, show default statuses
        $sql .= " AND (status = 10 OR (status = 11 AND DATE(approved_at) = CURDATE()) OR status = 20 OR status = 30 OR (status = 40 AND DATE(end_job) = CURDATE()))";
    }
    
    if ($filter_department !== '') {
        $sql .= " AND department LIKE :department";
        $params[':department'] = '%' . $filter_department . '%';
    }
    
    if ($filter_machine !== '') {
        $sql .= " AND machine_number LIKE :machine";
        $params[':machine'] = '%' . $filter_machine . '%';
    }
    
    if ($filter_reported_by !== '') {
        $sql .= " AND reported_by LIKE :reported_by";
        $params[':reported_by'] = '%' . $filter_reported_by . '%';
    }
    
    $sql .= " ORDER BY start_job DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($results) > 0) {
        echo "<div class='table-responsive' style='overflow-x: auto;'>";
        echo "<table class='table table-bordered table-striped table-hover' style='min-width: 1200px;'>";
        echo "<thead class='thead-dark'>";
        echo "<tr>";
        echo "<th style='width: 130px;'>เลขที่เอกสาร</th>";
        echo "<th style='width: 100px;'>แผนก</th>";
        echo "<th style='width: 110px;'>หมายเลขเครื่องจักร</th>";
        echo "<th>อาการเสีย</th>";
        echo "<th style='width: 120px;'>รูปภาพ</th>";
        echo "<th style='width: 100px;'>ผู้แจ้ง</th>";
        echo "<th style='width: 100px;'>ผู้ดำเนินการ</th>";
        echo "<th style='width: 100px;'>สถานะ</th>";
        echo "<th style='width: 130px;'>เวลาเริ่ม</th>";
        echo "<th style='width: 130px;'>เวลาสิ้นสุด</th>";
        echo "<th style='width: 90px;'>จัดการ</th>";
        echo "<th style='width: 60px;'>พิมพ์</th>";
        echo "</tr>";
        echo "</thead>";
        echo "<tbody>";
        
        foreach ($results as $row) {
            $statusClass = '';
            $statusText = '';
            $buttonHtml = '';
            
            switch (intval($row["status"])) {
                case STATUS_PENDING_APPROVAL:
                    $statusClass = 'badge-secondary';
                    $statusText = '📋 รออนุมัติ';
                    $buttonHtml = '
                        <span class="text-muted small">รออนุมัติ</span>
                    ';
                    break;
                case STATUS_REJECTED:
                    $statusClass = 'badge-danger';
                    $statusText = '❌ ไม่อนุมัติ';
                    $buttonHtml = '<span class="text-muted small">-</span>';
                    break;
                case STATUS_PENDING:
                    $statusClass = 'badge-warning';
                    $statusText = '⏳ ดำเนินการ';
                    $buttonHtml = '
                        <div class="btn-group" role="group" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-success btn-update-status" data-id="' . $row["id"] . '" data-status="40" title="เสร็จสิ้น">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-update-status" data-id="' . $row["id"] . '" data-status="30" title="รออะไหล่">
                                <i class="fas fa-hourglass-half"></i>
                            </button>
                            <button class="btn btn-sm btn-dark btn-cancel-repair" data-id="' . $row["id"] . '" title="ยกเลิก">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ';
                    break;
                case STATUS_COMPLETED:
                    $statusClass = 'badge-success';
                    $statusText = '✓ ซ่อมเสร็จแล้ว';
                    $buttonHtml = '<span class="text-muted small">-</span>';
                    break;
                case STATUS_CANCELLED:
                    $statusClass = 'badge-dark';
                    $statusText = '✕ ยกเลิก';
                    $buttonHtml = '
                        <span class="text-muted small">ยกเลิกแล้ว</span>
                    ';
                    break;
                case STATUS_WAITING_PARTS:
                    $statusClass = 'badge-danger';
                    $statusText = '⚙️ รออะไหล่';
                    $buttonHtml = '
                        <div class="btn-group" role="group" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-success btn-update-status" data-id="' . $row["id"] . '" data-status="40" title="เสร็จสิ้น">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary btn-update-status" data-id="' . $row["id"] . '" data-status="20" title="กลับดำเนินการ">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-sm btn-dark btn-cancel-repair" data-id="' . $row["id"] . '" title="ยกเลิก">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ';
                    break;
                default:
                    $statusClass = 'badge-secondary';
                    $statusText = '❓ ไม่ทราบสถานะ';
                    $buttonHtml = '';
            }
            
            echo "<tr>";
            echo "<td class='text-center'><strong style='color: #007bff;'>" . htmlspecialchars($row["document_no"] ?? '-') . "</strong></td>";
            echo "<td>" . htmlspecialchars($row["department"]) . "</td>";
            echo "<td class='text-center'><strong>" . htmlspecialchars($row["machine_number"]) . "</strong></td>";
            $issueHtml = nl2br(htmlspecialchars($row["issue"]));
            if (intval($row["status"]) === STATUS_REJECTED && !empty($row["reject_reason"])) {
                $issueHtml .= "<br><small class='text-danger'><i class='fas fa-times-circle'></i> <strong>เหตุผล:</strong> " . htmlspecialchars($row["reject_reason"]) . "</small>";
            }
            if (intval($row["status"]) === STATUS_CANCELLED && !empty($row["cancel_reason"])) {
                $issueHtml .= "<br><small class='text-secondary'><i class='fas fa-ban'></i> <strong>เหตุผล:</strong> " . htmlspecialchars($row["cancel_reason"]) . "</small>";
            }
            echo "<td>" . $issueHtml . "</td>";
            
            // คอลัมน์รูปภาพ
            echo "<td class='text-center' style='white-space: nowrap;'>";
            if (!empty($row["image_before"]) && file_exists('../' . $row["image_before"])) {
                echo "<a href='../" . htmlspecialchars($row["image_before"]) . "' target='_blank' class='btn btn-sm btn-warning' style='display: inline-block;'>";
                echo "<i class='fas fa-image'></i> ก่อนซ่อม</a> ";
            }
            if (!empty($row["image_after"]) && file_exists('../' . $row["image_after"])) {
                echo "<a href='../" . htmlspecialchars($row["image_after"]) . "' target='_blank' class='btn btn-sm btn-success' style='display: inline-block;'>";
                echo "<i class='fas fa-image'></i> หลังซ่อม</a>";
            }
            if (empty($row["image_before"]) && empty($row["image_after"])) {
                echo "<span class='text-muted'>-</span>";
            }
            echo "</td>";
            
            echo "<td class='text-center'>" . htmlspecialchars($row["reported_by"]) . "</td>";
            echo "<td class='text-center'>" . htmlspecialchars($row["handled_by"]) . "</td>";
            echo "<td class='text-center'><span class='badge $statusClass'>$statusText</span></td>";
            echo "<td class='text-center'><small>" . htmlspecialchars($row["start_job"]) . "</small></td>";
            echo "<td class='text-center'><small>" . ($row["end_job"] != '0000-00-00 00:00:00' && $row["end_job"] ? htmlspecialchars($row["end_job"]) : '-') . "</small></td>";
            
            // คอลัมน์จัดการ
            echo "<td class='text-center' style='white-space: nowrap;'>" . $buttonHtml . "</td>";
            
            // คอลัมน์พิมพ์ (ท้ายสุด)
            echo "<td class='text-center'>";
            echo "<a href='print_form.php?id=" . $row["id"] . "' target='_blank' class='btn btn-sm btn-info' title='พิมพ์ใบแจ้งซ่อม'>";
            echo "<i class='fas fa-print'></i></a>";
            echo "</td>";
            
            echo "</tr>";
        }
        
        echo "</tbody>";
        echo "</table>";
        echo "</div>";
    } else {
        echo "<div class='alert alert-info text-center'>";
        echo "<i class='fas fa-info-circle'></i> ยังไม่มีรายการแจ้งซ่อม";
        echo "</div>";
    }
} catch (PDOException $e) {
    echo "<div class='alert alert-danger'>";
    echo "<strong>เกิดข้อผิดพลาด!</strong> " . htmlspecialchars($e->getMessage());
    echo "</div>";
}
?>
