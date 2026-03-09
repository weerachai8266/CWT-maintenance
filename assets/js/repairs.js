/**
 * repairs.js
 * จัดการแท็บ "จัดการใบแจ้งซ่อม" และ init หน้า machines.php
 */

// ==================== Pagination state ====================
var repairsCurrentPage = 1;
var repairsLimit = 30;

// ==================== โหลดรายการซ่อม ====================
function loadRepairs(repairDate, documentNo, status, registrySigner, page, machineNumber, jobType) {
    repairDate      = repairDate      || '';
    documentNo      = documentNo      || '';
    status          = status          || '';
    registrySigner  = registrySigner  || '';
    page            = page            || 1;
    machineNumber   = machineNumber   || '';
    jobType         = jobType         || '';

    repairsCurrentPage = page;

    $.ajax({
        url: '../api/get_all_repairs.php',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            repair_date:      repairDate,
            document_no:      documentNo,
            status:           status,
            registry_signer:  registrySigner,
            machine_number:   machineNumber,
            job_type:         jobType,
            page:             page,
            limit:            repairsLimit
        }),
        success: function(response) {
            var rows        = (response.success && response.data) ? response.data.rows        : [];
            var total       = (response.success && response.data) ? response.data.total       : 0;
            var totalPages  = (response.success && response.data) ? response.data.total_pages : 0;
            var currentPage = (response.success && response.data) ? response.data.page        : 1;

            var html = '';
            if (rows.length > 0) {
                rows.forEach(function(repair) {
                    var statusBadge = '';
                    switch (parseInt(repair.status)) {
                        case 10: statusBadge = '<span class="badge badge-secondary">รออนุมัติ</span>';  break;
                        case 11: statusBadge = '<span class="badge badge-danger">ไม่อนุมัติ</span>';    break;
                        case 20: statusBadge = '<span class="badge badge-warning">ดำเนินการ</span>';   break;
                        case 30: statusBadge = '<span class="badge badge-info">รออะไหล่</span>';       break;
                        case 40: statusBadge = '<span class="badge badge-success">ซ่อมเสร็จสิ้น</span>'; break;
                        case 50: statusBadge = '<span class="badge badge-dark">ยกเลิก</span>';         break;
                        default: statusBadge = '<span class="badge badge-secondary">' + repair.status + '</span>';
                    }

                    var issueText = repair.issue
                        ? (repair.issue.length > 50 ? repair.issue.substring(0, 50) + '...' : repair.issue)
                        : '-';
                    if (parseInt(repair.status) === 11 && repair.reject_reason) {
                        issueText += '<br><small class="text-danger"><i class="fas fa-times-circle"></i> <strong>เหตุผล:</strong> ' + repair.reject_reason + '</small>';
                    }
                    if (parseInt(repair.status) === 50 && repair.cancel_reason) {
                        issueText += '<br><small class="text-secondary"><i class="fas fa-ban"></i> <strong>เหตุผล:</strong> ' + repair.cancel_reason + '</small>';
                    }

                    var actionTypeMap  = { check: 'ตรวจสอบ', fix: 'แก้ไขปัญหา', repair: 'ซ่อม', adjust: 'ปรับตั้ง', other: 'อื่นๆ' };
                    var actionTypeText = actionTypeMap[repair.action_type] || (repair.action_type || '-');

                    var hasHistory = repair.registry_signer && repair.registry_signer.trim() !== '';
                    // var rowClass = hasHistory ? 'table-success' : 'table-warning';
                    var registryCell = hasHistory
                        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> ' + repair.registry_signer + '</span>'
                        : '<span class="badge badge-danger"><i class="fas fa-exclamation-circle"></i> ยังไม่ลง</span>';

                    // html += '<tr class="' + rowClass + '">';
                    html += '<tr>';
                    html += '<td><strong style="color: #007bff;">' + (repair.document_no || '-') + '</strong></td>';
                    html += '<td>' + formatDateDMY(repair.start_job) + '</td>';
                    html += '<td>' + (repair.machine_number || '-') + '</td>';
                    html += '<td>' + (repair.reported_by    || '-') + '</td>';
                    html += '<td>' + issueText + '</td>';
                    html += '<td>' + actionTypeText + '</td>';
                    html += '<td>' + statusBadge + '</td>';
                    html += '<td>' + (repair.handled_by      || '-') + '</td>';
                    html += '<td>' + registryCell + '</td>';
                    html += '<td class="text-center">';
                    html += '<a href="print_form.php?id=' + repair.id + '" class="btn btn-sm btn-primary" target="_blank" title="ดูรายละเอียด"><i class="fas fa-eye"></i></a> ';
                    html += '<button class="btn btn-sm btn-success" onclick="printRepair(' + repair.id + ')" title="พิมพ์ใบแจ้งซ่อม"><i class="fas fa-print"></i></button>';
                    html += '</td>';
                    html += '</tr>';
                });
            } else {
                html = '<tr><td colspan="10" class="text-center">ไม่พบข้อมูล</td></tr>';
            }

            $('#repairsTableBody').html(html);
            renderRepairsPagination(total, totalPages, currentPage);
        },
        error: function() {
            $('#repairsTableBody').html('<tr><td colspan="10" class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>');
            $('#repairsPaginationWrap').hide();
        }
    });
}

// ==================== Pagination ====================
function renderRepairsPagination(total, totalPages, currentPage) {
    var $wrap  = $('#repairsPaginationWrap');
    var $info  = $('#repairsPaginationInfo');
    var $pager = $('#repairsPagination');

    if (totalPages <= 1) {
        $info.text('ทั้งหมด ' + total + ' รายการ');
        $pager.html('');
        $wrap.show();
        return;
    }

    var start = (currentPage - 1) * repairsLimit + 1;
    var end   = Math.min(currentPage * repairsLimit, total);
    $info.text('แสดง ' + start + '-' + end + ' จาก ' + total + ' รายการ');

    var pages = '';
    pages += '<li class="page-item' + (currentPage === 1 ? ' disabled' : '') + '">' +
             '<a class="page-link" href="#" onclick="goRepairsPage(' + (currentPage - 1) + ');return false;">&laquo;</a></li>';

    var sp = Math.max(1, currentPage - 2);
    var ep = Math.min(totalPages, currentPage + 2);
    if (sp > 1) {
        pages += '<li class="page-item"><a class="page-link" href="#" onclick="goRepairsPage(1);return false;">1</a></li>';
        if (sp > 2) pages += '<li class="page-item disabled"><a class="page-link">...</a></li>';
    }
    for (var p = sp; p <= ep; p++) {
        pages += '<li class="page-item' + (p === currentPage ? ' active' : '') + '">' +
                 '<a class="page-link" href="#" onclick="goRepairsPage(' + p + ');return false;">' + p + '</a></li>';
    }
    if (ep < totalPages) {
        if (ep < totalPages - 1) pages += '<li class="page-item disabled"><a class="page-link">...</a></li>';
        pages += '<li class="page-item"><a class="page-link" href="#" onclick="goRepairsPage(' + totalPages + ');return false;">' + totalPages + '</a></li>';
    }
    pages += '<li class="page-item' + (currentPage === totalPages ? ' disabled' : '') + '">' +
             '<a class="page-link" href="#" onclick="goRepairsPage(' + (currentPage + 1) + ');return false;">&raquo;</a></li>';

    $pager.html(pages);
    $wrap.show();
}

function goRepairsPage(page) {
    loadRepairs(
        $('#filter_repair_date').val(),
        $('#filter_document_no').val(),
        $('#filter_status').val(),
        $('#filter_registry_signer').val(),
        page,
        $('#filter_machine_number').val(),
        $('#filter_job_type').val()
    );
    $('html, body').animate({ scrollTop: $('#repairsTableBody').offset().top - 80 }, 200);
}

// ==================== Filter / Clear ====================
function filterRepairs() {
    loadRepairs(
        $('#filter_repair_date').val(),
        $('#filter_document_no').val(),
        $('#filter_status').val(),
        $('#filter_registry_signer').val(),
        1,
        $('#filter_machine_number').val(),
        $('#filter_job_type').val()
    );
}

function clearFilters() {
    $('#filter_repair_date, #filter_document_no, #filter_registry_signer, #filter_machine_number').val('');
    $('#filter_status, #filter_job_type').val('');
    loadRepairs();
}

// ==================== Print / Delete ====================
function printRepair(id) {
    var win = window.open('print_form.php?id=' + id, '_blank');
    win.onload = function() { win.print(); };
}

function deleteRepair(id) {
    if (!confirm('คุณต้องการลบใบแจ้งซ่อมนี้หรือไม่?')) return;
    $.ajax({
        url: '../api/delete_repair.php',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ id: id }),
        success: function(response) {
            if (response.success) {
                alert('ลบข้อมูลเรียบร้อย');
                loadRepairs();
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        }
    });
}

// ==================== Page Init ====================
$(document).ready(function() {
    loadRepairs();

    // Master data tabs
    $('#reserve1-tab').on('shown.bs.tab', function() { loadMasterData('company'); });
    $('#company-tab').on('click',    function() { loadMasterData('company');    });
    $('#branch-tab').on('click',     function() { loadMasterData('branch');     });
    $('#division-tab').on('click',   function() { loadMasterData('division');   });
    $('#department-tab').on('click', function() { loadMasterData('department'); });
    $('#issue-tab').on('click',      function() { loadMasterData('issue');      });

    // Users tab
    $('#users-tab').on('shown.bs.tab', function() {
        if (typeof loadUsers === 'function') loadUsers();
    });
});
