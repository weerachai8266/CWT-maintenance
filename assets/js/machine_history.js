/**
 * Machine History Management
 * จัดการประวัติการซ่อม/PM/Calibration ของเครื่องจักร
 */

// ==================== Utility Functions ====================
/**
 * แปลง newline (\n) เป็น <br> สำหรับแสดงผลใน HTML
 */
function nl2br(text) {
    if (!text) return '-';
    return text.replace(/\n/g, '<br>');
}

// Pagination state สำหรับประวัติ
var historyCurrentMachineCode = '';
var historyCurrentPage = 1;
var historyLimit = 30;

// ==================== โหลดประวัติเครื่องจักร (server-side pagination) ====================
function loadMachineHistoryByCode(machineCode, page) {
    page = page || 1;
    historyCurrentMachineCode = machineCode;
    historyCurrentPage = page;

    console.log('Loading history for machine:', machineCode, 'page:', page);
    $.ajax({
        url: '../api/machine_history.php',
        method: 'GET',
        data: { machine_code: machineCode, page: page, limit: historyLimit },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.data && response.data.rows !== undefined) {
                var d = response.data;
                displayMachineHistory(d.rows, page);
                renderHistoryPagination(d.total, d.total_pages, d.page);
            } else {
                displayMachineHistory([], 1);
                $('#historyPaginationWrap').hide();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading machine history:', error);
            displayMachineHistory([], 1);
            $('#historyPaginationWrap').hide();
        }
    });
}

function goHistoryPage(page) {
    loadMachineHistoryByCode(historyCurrentMachineCode, page);
    $('html, body').animate({ scrollTop: $('#repair_history_card').offset().top - 80 }, 200);
}

function renderHistoryPagination(total, totalPages, currentPage) {
    var $wrap  = $('#historyPaginationWrap');
    var $info  = $('#historyPaginationInfo');
    var $pager = $('#historyPagination');

    if (totalPages <= 1) {
        $info.text('ทั้งหมด ' + total + ' รายการ');
        $pager.html('');
        $wrap.show();
        return;
    }

    var start = (currentPage - 1) * historyLimit + 1;
    var end   = Math.min(currentPage * historyLimit, total);
    $info.text('แสดง ' + start + '-' + end + ' จาก ' + total + ' รายการ');

    var pages = '';
    pages += '<li class="page-item' + (currentPage === 1 ? ' disabled' : '') + '">' +
             '<a class="page-link" href="#" onclick="goHistoryPage(' + (currentPage - 1) + ');return false;">&laquo;</a></li>';

    var sp = Math.max(1, currentPage - 2);
    var ep = Math.min(totalPages, currentPage + 2);
    if (sp > 1) {
        pages += '<li class="page-item"><a class="page-link" href="#" onclick="goHistoryPage(1);return false;">1</a></li>';
        if (sp > 2) pages += '<li class="page-item disabled"><a class="page-link">...</a></li>';
    }
    for (var p = sp; p <= ep; p++) {
        pages += '<li class="page-item' + (p === currentPage ? ' active' : '') + '">' +
                 '<a class="page-link" href="#" onclick="goHistoryPage(' + p + ');return false;">' + p + '</a></li>';
    }
    if (ep < totalPages) {
        if (ep < totalPages - 1) pages += '<li class="page-item disabled"><a class="page-link">...</a></li>';
        pages += '<li class="page-item"><a class="page-link" href="#" onclick="goHistoryPage(' + totalPages + ');return false;">' + totalPages + '</a></li>';
    }
    pages += '<li class="page-item' + (currentPage === totalPages ? ' disabled' : '') + '">' +
             '<a class="page-link" href="#" onclick="goHistoryPage(' + (currentPage + 1) + ');return false;">&raquo;</a></li>';

    $pager.html(pages);
    $wrap.show();
}

// ==================== แสดงประวัติในตาราง ====================
function displayMachineHistory(historyData, page) {
    page = page || 1;
    const tbody = $('#repair_history_body');
    let html = '';
    
    if (!historyData || historyData.length === 0) {
        html = '<tr><td colspan="14" class="text-center">ไม่มีประวัติการซ่อม</td></tr>';
        tbody.html(html);
        $('#repair_history_card').show();
        return;
    }
    
    historyData.forEach(function(item, index) {
        var rowNo = (page - 1) * historyLimit + index + 1;
        html += '<tr>';
        html += '<td class="text-center">' + rowNo + '</td>';
        html += '<td class="text-center">' + formatDateDMY(item.work_date) + '</td>';
        html += '<td>' + (item.document_no || '-') + '</td>';
        html += '<td>' + nl2br(item.issue_description) + '</td>';
        html += '<td>' + nl2br(item.solution_description) + '</td>';
        html += '<td style="min-width: 300px;">' + nl2br(item.parts_used) + '</td>';
        html += '<td class="text-right">' + formatCurrency(item.total_cost) + '</td>';
        html += '<td class="text-center">' + (item.work_hours || '0') + '</td>';
        html += '<td class="text-center">' + (item.downtime_hours || '0') + '</td>';
        html += '<td>' + (item.handled_by || '-') + '</td>';
        html += '<td class="text-center">';
        html += '<button class="btn btn-sm btn-primary" onclick="viewHistoryDetail(' + item.id + ')" title="ดู"><i class="fas fa-eye"></i></button> ';
        html += '<button class="btn btn-sm btn-warning" onclick="editHistory(' + item.id + ')" title="แก้ไข"><i class="fas fa-edit"></i></button> ';
        html += '<button class="btn btn-sm btn-danger" onclick="deleteHistory(' + item.id + ')" title="ลบ"><i class="fas fa-trash"></i></button>';
        html += '</td>';
        html += '</tr>';
    });
    
    tbody.html(html);
    $('#repair_history_card').show();
}

// ==================== เปิดโมดอลเพิ่มประวัติ ====================
function openAddHistoryModal(machineCode, machineName) {
    $('#historyForm')[0].reset();
    $('#history_id').val('');
    $('#history_machine_code').val(machineCode);
    $('#history_machine_name').val(machineName);
    $('#history_work_date').val(new Date().toISOString().split('T')[0]);
    $('#historyModalTitle').html('<i class="fas fa-plus"></i> เพิ่มประวัติการซ่อม');
    $('#historyModal').modal('show');
}

// ==================== เปิดโมดอลเพิ่มประวัติแบบรวดเร็ว (ไม่ต้องเลือกเครื่อง) ====================
function openQuickAddHistory() {
    $('#historyForm')[0].reset();
    $('#history_id').val('');
    $('#history_machine_code').prop('readonly', false); // ให้แก้ไขได้
    $('#history_machine_name').prop('readonly', true); // แต่ชื่อ auto-fill
    $('#history_work_date').val(new Date().toISOString().split('T')[0]);
    $('#historyModalTitle').html('<i class="fas fa-plus-circle"></i> เพิ่มประวัติ PM / Calibration');
    
    // โหลดรายการเครื่องจักรลง datalist
    loadMachineCodeDatalist();
    
    $('#historyModal').modal('show');
}

// ==================== โหลดรายการเครื่องจักรลง datalist ====================
function loadMachineCodeDatalist() {
    $.ajax({
        url: '../api/machines.php',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                let options = '';
                response.data.forEach(function(machine) {
                    options += '<option value="' + machine.machine_code + '" data-name="' + machine.machine_name + '">';
                });
                $('#history_machine_code_datalist').html(options);
            }
        },
        error: function() {
            console.error('Error loading machine codes');
        }
    });
}

// ==================== แสดงชื่อเครื่องจักรอัตโนมัติ ====================
function fillMachineNameFromCode(machineCode) {
    if (!machineCode) {
        $('#history_machine_name').val('');
        return;
    }
    
    // ค้นหาจาก machines API
    $.ajax({
        url: '../api/machines.php',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                const machine = response.data.find(m => m.machine_code === machineCode);
                if (machine) {
                    $('#history_machine_name').val(machine.machine_name);
                } else {
                    $('#history_machine_name').val('');
                }
            }
        },
        error: function() {
            console.error('Error finding machine name');
        }
    });
}

// ==================== คำนวณเวลาปฏิบัติงาน ====================
function calculateWorkDuration() {
    const startTime = $('#history_start_time').val();
    const endTime = $('#history_end_time').val();
    
    if (!startTime || !endTime) {
        $('#history_work_hours').val(0);
        return;
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
        alert('เวลาเสร็จต้องมากกว่าเวลาเริ่ม');
        $('#history_work_hours').val(0);
        return;
    }
    
    // คำนวณชั่วโมง (ปัดเศษ 2 ตำแหน่ง)
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    $('#history_work_hours').val(diffHours.toFixed(2));
}

// ==================== ดูรายละเอียด ====================
function viewHistoryDetail(id) {
    $.ajax({
        url: '../api/machine_history.php?id=' + id,
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                showHistoryDetailModal(response.data);
            } else {
                alert('ไม่พบข้อมูล');
            }
        },
        error: function() {
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    });
}

function showHistoryDetailModal(data) {
    var workTypeMap = {
        'PM':  'PM (Preventive Maintenance)',
        'CAL': 'Calibration',
        'OVH': 'Overhaul (ยกเครื่องใหม่)',
        'INS': 'ตรวจสอบ (Inspection)',
        'RPR': 'ซ่อม (Repair)'
    };
    var statusMap = {
        'pending':     '<span class="badge badge-warning">ดำเนินการ</span>',
        'in-progress': '<span class="badge badge-info">กำลังดำเนินการ</span>',
        'completed':   '<span class="badge badge-success">เสร็จสิ้น</span>',
        'cancelled':   '<span class="badge badge-danger">ยกเลิก</span>'
    };

    var html = '';

    // ข้อมูลเครื่องจักร
    html += '<div class="row mb-3">';
    html += '<div class="col-md-6"><label class="text-muted small mb-1">รหัสเครื่องจักร</label><div class="font-weight-bold">' + (data.machine_code || '-') + '</div></div>';
    html += '<div class="col-md-6"><label class="text-muted small mb-1">ชื่อเครื่องจักร</label><div>' + (data.machine_name || '-') + '</div></div>';
    html += '</div>';

    // ประเภทงาน / เลขที่เอกสาร / วันที่
    html += '<div class="row mb-3">';
    html += '<div class="col-md-4"><label class="text-muted small mb-1">ประเภทงาน</label><div><span class="badge badge-primary">' + (workTypeMap[data.work_type] || data.work_type || '-') + '</span></div></div>';
    html += '<div class="col-md-4"><label class="text-muted small mb-1">เลขที่เอกสาร</label><div class="font-weight-bold">' + (data.document_no || '-') + '</div></div>';
    html += '<div class="col-md-4"><label class="text-muted small mb-1">วันที่แจ้ง/ทำงาน</label><div>' + formatDateDMY(data.work_date) + '</div></div>';
    html += '</div>';

    html += '<hr>';

    // รายละเอียดงาน
    html += '<div class="form-group"><label class="font-weight-bold">อาการเสีย/ปัญหา/รายละเอียด</label>';
    html += '<div class="border rounded p-2 bg-light" style="white-space:pre-wrap;min-height:60px;">' + nl2br(data.issue_description || '-') + '</div></div>';

    html += '<div class="form-group"><label class="font-weight-bold">วิธีแก้ไข/การซ่อม</label>';
    html += '<div class="border rounded p-2 bg-light" style="white-space:pre-wrap;min-height:60px;">' + nl2br(data.solution_description || '-') + '</div></div>';

    html += '<div class="form-group"><label class="font-weight-bold">รายการอะไหล่ที่ใช้/รหัสอะไหล่</label>';
    html += '<div class="border rounded p-2 bg-light" style="white-space:pre-wrap;min-height:40px;">' + nl2br(data.parts_used || '-') + '</div></div>';

    html += '<hr>';

    // เวลาและค่าใช้จ่าย
    html += '<h6 class="mt-3 mb-2"><i class="fas fa-clock"></i> เวลาและค่าใช้จ่าย</h6>';
    html += '<div class="row mb-3">';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">เวลาเริ่มปฏิบัติงาน</label><div>' + formatDateTimeTH(data.start_date) + '</div></div>';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">เวลาปฏิบัติงานเสร็จ</label><div>' + formatDateTimeTH(data.completed_date) + '</div></div>';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">เวลาปฏิบัติงาน (ชั่วโมง)</label><div>' + (data.work_hours || '0') + ' ชม.</div></div>';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">เวลาหยุดเครื่อง (ชั่วโมง)</label><div>' + (data.downtime_hours || '0') + ' ชม.</div></div>';
    html += '</div>';
    html += '<div class="row mb-3">';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">ค่าแรง (บาท)</label><div>' + formatCurrency(data.labor_cost) + '</div></div>';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">ค่าอะไหล่ (บาท)</label><div>' + formatCurrency(data.parts_cost) + '</div></div>';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">ค่าใช้จ่ายอื่นๆ (บาท)</label><div>' + formatCurrency(data.other_cost) + '</div></div>';
    html += '<div class="col-md-3"><label class="text-muted small mb-1">รวมค่าใช้จ่าย (บาท)</label><div class="font-weight-bold text-primary">' + formatCurrency(data.total_cost) + '</div></div>';
    html += '</div>';

    html += '<hr>';

    // ผู้เกี่ยวข้อง
    html += '<h6 class="mt-3 mb-2"><i class="fas fa-users"></i> ผู้เกี่ยวข้อง</h6>';
    html += '<div class="row mb-3">';
    html += '<div class="col-md-4"><label class="text-muted small mb-1">ผู้แจ้ง</label><div>' + (data.reported_by || '-') + '</div></div>';
    html += '<div class="col-md-4"><label class="text-muted small mb-1">ผู้รับผิดชอบ/ช่าง</label><div>' + (data.handled_by || '-') + '</div></div>';
    html += '<div class="col-md-4"><label class="text-muted small mb-1">สถานะ</label><div>' + (statusMap[data.status] || data.status || '-') + '</div></div>';
    html += '</div>';

    // หมายเหตุ
    html += '<div class="form-group"><label class="font-weight-bold">หมายเหตุ</label>';
    html += '<div class="border rounded p-2 bg-light" style="white-space:pre-wrap;min-height:40px;">' + nl2br(data.note || '-') + '</div></div>';

    $('#historyDetailContent').html(html);
    $('#historyDetailModal').data('history-id', data.id);
    $('#historyDetailModal').modal('show');
}

// ==================== แก้ไขประวัติ ====================
function editHistory(id) {
    $.ajax({
        url: '../api/machine_history.php?id=' + id,
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                fillHistoryForm(response.data);
            } else {
                alert('ไม่พบข้อมูล');
            }
        },
        error: function() {
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    });
}

function fillHistoryForm(data) {
    $('#history_id').val(data.id);
    $('#history_machine_code').val(data.machine_code);
    $('#history_machine_name').val(data.machine_name);
    $('#history_document_no').val(data.document_no);
    
    // ดึง work_type จาก document_no (ถ้ามี)
    if (data.document_no) {
        if (data.document_no.startsWith('PM')) $('#history_work_type').val('PM');
        else if (data.document_no.startsWith('CAL')) $('#history_work_type').val('CAL');
        else if (data.document_no.startsWith('OVH')) $('#history_work_type').val('OVH');
        else if (data.document_no.startsWith('INS')) $('#history_work_type').val('INS');
    }
    
    $('#history_work_date').val(data.work_date);
    // แปลง MySQL DATETIME (YYYY-MM-DD HH:MM:SS) เป็น datetime-local (YYYY-MM-DDTHH:MM)
    function toDatetimeLocal(val) {
        if (!val) return '';
        return val.replace(' ', 'T').substring(0, 16);
    }
    $('#history_start_time').val(toDatetimeLocal(data.start_date));
    $('#history_end_time').val(toDatetimeLocal(data.completed_date));
    if (data.start_date || data.completed_date) calculateWorkDuration();
    $('#history_issue').val(data.issue_description);
    $('#history_solution').val(data.solution_description);
    $('#history_parts').val(data.parts_used);
    $('#history_work_hours').val(data.work_hours);
    $('#history_downtime_hours').val(data.downtime_hours);
    $('#history_labor_cost').val(data.labor_cost);
    $('#history_parts_cost').val(data.parts_cost);
    $('#history_other_cost').val(data.other_cost);
    $('#history_total_cost').val(data.total_cost);
    $('#history_reported_by').val(data.reported_by);
    $('#history_handled_by').val(data.handled_by);
    $('#history_status').val(data.status);
    $('#history_note').val(data.note);
    
    $('#historyModalTitle').html('<i class="fas fa-edit"></i> แก้ไขประวัติการซ่อม');
    $('#historyModal').modal('show');
}

// ==================== บันทึกประวัติ ====================
function saveHistory(event) {
    event.preventDefault();
    
    const id = $('#history_id').val();
    const data = {
        id: id || undefined,
        machine_code: $('#history_machine_code').val(),
        machine_name: $('#history_machine_name').val(),
        work_type: $('#history_work_type').val(), // ประเภทงาน (PM, CAL, REP, INS)
        work_date: $('#history_work_date').val(),
        // ส่ง datetime เต็ม (YYYY-MM-DD HH:MM) ไปบันทึกลง DB DATETIME column
        start_date: ($('#history_start_time').val() || '').replace('T', ' ') || null,
        completed_date: ($('#history_end_time').val() || '').replace('T', ' ') || null,
        issue_description: $('#history_issue').val(),
        solution_description: $('#history_solution').val(),
        parts_used: $('#history_parts').val(),
        work_hours: parseFloat($('#history_work_hours').val()) || 0,
        downtime_hours: parseFloat($('#history_downtime_hours').val()) || 0,
        labor_cost: parseFloat($('#history_labor_cost').val()) || 0,
        parts_cost: parseFloat($('#history_parts_cost').val()) || 0,
        other_cost: parseFloat($('#history_other_cost').val()) || 0,
        total_cost: parseFloat($('#history_total_cost').val()) || 0,
        reported_by: $('#history_reported_by').val(),
        handled_by: $('#history_handled_by').val(),
        status: $('#history_status').val(),
        note: $('#history_note').val()
    };
    
    const method = id ? 'PUT' : 'POST';
    
    $.ajax({
        url: '../api/machine_history.php',
        method: method,
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                let message = id ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ';
                // แสดงเลขที่เอกสารถ้าเป็นการสร้างใหม่
                if (!id && response.data && response.data.document_no) {
                    message += '\nเลขที่เอกสาร: ' + response.data.document_no;
                }
                alert(message);
                $('#historyModal').modal('hide');
                // โหลดประวัติใหม่ (เพิ่มใหม่ → ไปหน้า 1)
                loadMachineHistoryByCode(historyCurrentMachineCode, id ? historyCurrentPage : 1);
                // รีเฟรชรายการใบแจ้งซ่อม Tab 1
                if (typeof loadRepairs === 'function') loadRepairs();
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        },
        error: function() {
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    });
}

// ==================== ลบประวัติ ====================
function deleteHistory(id) {
    if (!confirm('คุณต้องการลบประวัติการซ่อมนี้หรือไม่?')) {
        return;
    }
    
    $.ajax({
        url: '../api/machine_history.php',
        method: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({ id: id }),
        success: function(response) {
            if (response.success) {
                alert('ลบข้อมูลสำเร็จ');
                // โหลดประวัติใหม่ (คงหน้าเดิม)
                loadMachineHistoryByCode(historyCurrentMachineCode, historyCurrentPage);
                // รีเฟรชรายการใบแจ้งซ่อม Tab 1
                if (typeof loadRepairs === 'function') loadRepairs();
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        },
        error: function() {
            alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    });
}

// ==================== คำนวณค่าใช้จ่ายรวม ====================
function calculateTotalCost() {
    const laborCost = parseFloat($('#history_labor_cost').val()) || 0;
    const partsCost = parseFloat($('#history_parts_cost').val()) || 0;
    const otherCost = parseFloat($('#history_other_cost').val()) || 0;
    const total = laborCost + partsCost + otherCost;
    $('#history_total_cost').val(total.toFixed(2));
}

// ==================== Format ตัวเลข ====================
function formatCurrency(amount) {
    if (!amount || amount == 0) return '-';
    return parseFloat(amount).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' บาท';
}

// ==================== Export to Excel ====================
function exportMachineHistory() {
    const machineCode = $('#history_machine_select_input').val().trim();
    
    if (!machineCode) {
        alert('กรุณาเลือกเครื่องจักรก่อน');
        return;
    }
    
    // เปิดหน้าต่างใหม่เพื่อ download Excel
    window.open('../api/export_machine_history.php?machine_code=' + encodeURIComponent(machineCode), '_blank');
}
