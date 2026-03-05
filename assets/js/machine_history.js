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
        'PM':  { label: 'PM - Preventive Maintenance', color: 'badge-primary',  icon: 'fa-tools' },
        'CAL': { label: 'CAL - Calibration',           color: 'badge-info',     icon: 'fa-ruler-combined' },
        'OVH': { label: 'OVH - Overhaul',              color: 'badge-warning',  icon: 'fa-cogs' },
        'INS': { label: 'INS - Inspection',            color: 'badge-secondary',icon: 'fa-search' },
        'RPR': { label: 'RPR - Repair',                color: 'badge-danger',   icon: 'fa-wrench' }
    };
    var statusMap = {
        'pending':     { label: 'รอดำเนินการ',   color: 'badge-secondary' },
        'in-progress': { label: 'กำลังดำเนินการ', color: 'badge-info'      },
        'completed':   { label: 'เสร็จสิ้น',      color: 'badge-success'   },
        'cancelled':   { label: 'ยกเลิก',         color: 'badge-danger'    }
    };

    var wt     = workTypeMap[data.work_type]  || { label: data.work_type || '-',  color: 'badge-secondary', icon: 'fa-file-alt' };
    var st     = statusMap[data.status]       || { label: data.status    || '-',  color: 'badge-secondary' };

    // helper: render a labelled value cell
    function cell(label, value, bold) {
        return '<div class="mb-2">' +
               '<div class="text-muted" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;">' + label + '</div>' +
               '<div class="' + (bold ? 'font-weight-bold' : '') + '" style="font-size:.95rem;">' + (value || '-') + '</div>' +
               '</div>';
    }

    var html = '';

    /* ── Header banner ── */
    html += '<div class="rounded p-3 mb-3" style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);color:#fff;">';
    html +=   '<div class="d-flex align-items-center justify-content-between flex-wrap">';
    html +=     '<div>';
    html +=       '<div style="font-size:1.1rem;font-weight:700;letter-spacing:.03em;">' +
                    '<i class="fas fa-microchip mr-2"></i>' + (data.machine_code || '-') + '</div>';
    html +=       '<div style="opacity:.85;font-size:.9rem;">' + (data.machine_name || '') + '</div>';
    html +=     '</div>';
    html +=     '<div class="text-right">';
    html +=       '<span class="badge badge-light text-dark px-2 py-1 mr-1" style="font-size:.85rem;">' +
                    '<i class="fas ' + wt.icon + ' mr-1"></i>' + wt.label + '</span>';
    html +=       '<span class="badge ' + st.color + ' px-2 py-1" style="font-size:.85rem;">' + st.label + '</span>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';

    /* ── Document info strip ── */
    html += '<div class="d-flex flex-wrap border rounded mb-3" style="background:#f8f9fa;">';
    html +=   '<div class="px-3 py-2 border-right flex-fill">' + cell('เลขที่เอกสาร', '<span style="color:#1565c0;font-size:1rem;">' + (data.document_no || '-') + '</span>', true) + '</div>';
    html +=   '<div class="px-3 py-2 border-right flex-fill">' + cell('วันที่แจ้ง / ทำงาน', '<i class="fas fa-calendar-alt mr-1 text-muted"></i>' + formatDateDMY(data.work_date)) + '</div>';
    html +=   '<div class="px-3 py-2 border-right flex-fill">' + cell('เริ่มปฏิบัติงาน',   '<i class="fas fa-play-circle mr-1 text-success"></i>' + formatDateTimeTH(data.start_date)) + '</div>';
    html +=   '<div class="px-3 py-2 flex-fill">'              + cell('เสร็จสิ้น',          '<i class="fas fa-flag-checkered mr-1 text-danger"></i>' + formatDateTimeTH(data.completed_date)) + '</div>';
    html += '</div>';

    /* ── รายละเอียดงาน ── */
    function textBox(label, icon, value, color) {
        color = color || '#495057';
        return '<div class="mb-3">' +
               '<div class="font-weight-bold mb-1" style="color:' + color + ';">' +
               '<i class="fas ' + icon + ' mr-1"></i>' + label + '</div>' +
               '<div class="border rounded p-2" style="background:#fff;white-space:pre-wrap;min-height:56px;font-size:.9rem;line-height:1.6;">' +
               nl2br(value || '<span class="text-muted">-</span>') + '</div></div>';
    }

    html += textBox('อาการเสีย / ปัญหา / รายละเอียด', 'fa-exclamation-triangle', data.issue_description, '#c62828');
    html += textBox('วิธีแก้ไข / การซ่อม',             'fa-check-circle',         data.solution_description, '#2e7d32');
    html += textBox('รายการอะไหล่ที่ใช้',               'fa-box-open',             data.parts_used, '#1565c0');

    /* ── เวลา + ค่าใช้จ่าย ── */
    html += '<div class="row mb-3">';
    html +=   '<div class="col-12"><div class="font-weight-bold text-muted mb-2" style="font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;">' +
              '<i class="fas fa-clock mr-1"></i>เวลาปฏิบัติงาน</div></div>';

    html +=   '<div class="col-6 col-md-3">';
    html +=     '<div class="border rounded text-center py-2 mb-2" style="background:#e8f5e9;">';
    html +=       '<div class="text-muted" style="font-size:.72rem;">ชั่วโมงปฏิบัติงาน</div>';
    html +=       '<div class="font-weight-bold" style="font-size:1.4rem;color:#2e7d32;">' + (data.work_hours || '0') + '</div>';
    html +=       '<div class="text-muted" style="font-size:.72rem;">ชั่วโมง</div>';
    html +=     '</div>';
    html +=   '</div>';

    html +=   '<div class="col-6 col-md-3">';
    html +=     '<div class="border rounded text-center py-2 mb-2" style="background:#fce4ec;">';
    html +=       '<div class="text-muted" style="font-size:.72rem;">เวลาหยุดเครื่อง</div>';
    html +=       '<div class="font-weight-bold" style="font-size:1.4rem;color:#c62828;">' + (data.downtime_hours || '0') + '</div>';
    html +=       '<div class="text-muted" style="font-size:.72rem;">ชั่วโมง</div>';
    html +=     '</div>';
    html +=   '</div>';

    html +=   '<div class="col-12 col-md-6">';
    html +=     '<div class="border rounded p-2 mb-2" style="background:#fff8e1;">';
    html +=       '<div class="text-muted mb-1" style="font-size:.72rem;text-transform:uppercase;">ค่าใช้จ่าย (บาท)</div>';
    html +=       '<div class="d-flex justify-content-between flex-wrap">';
    html +=         '<span><span class="text-muted" style="font-size:.8rem;">ค่าแรง</span><br><strong>' + formatCurrency(data.labor_cost) + '</strong></span>';
    html +=         '<span><span class="text-muted" style="font-size:.8rem;">ค่าอะไหล่</span><br><strong>' + formatCurrency(data.parts_cost) + '</strong></span>';
    html +=         '<span><span class="text-muted" style="font-size:.8rem;">อื่นๆ</span><br><strong>' + formatCurrency(data.other_cost) + '</strong></span>';
    html +=         '<span class="border-left pl-2 ml-1"><span class="text-muted" style="font-size:.8rem;">รวม</span><br>' +
                    '<strong style="font-size:1.05rem;color:#1565c0;">' + formatCurrency(data.total_cost) + '</strong></span>';
    html +=       '</div>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';

    /* ── ผู้เกี่ยวข้อง + หมายเหตุ ── */
    html += '<div class="row">';
    html +=   '<div class="col-md-4">' + cell('<i class="fas fa-bullhorn mr-1"></i> ผู้แจ้ง', '<span class="font-weight-bold">' + (data.reported_by || '-') + '</span>') + '</div>';
    html +=   '<div class="col-md-4">' + cell('<i class="fas fa-hard-hat mr-1"></i> ผู้รับผิดชอบ / ช่าง', '<span class="font-weight-bold">' + (data.handled_by || '-') + '</span>') + '</div>';
    html +=   '<div class="col-md-4">' + cell('<i class="fas fa-sticky-note mr-1"></i> หมายเหตุ', nl2br(data.note) || '-') + '</div>';
    html += '</div>';

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

// ==================== Tab 4: Machine History Dropdown + Info ====================
var machinesData = [];

function loadMachinesDropdown() {
    $.ajax({
        url: '../api/machines.php',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                machinesData = response.data;
                var options = '';
                response.data.forEach(function(machine) {
                    options += '<option value="' + machine.machine_code + '">' +
                               machine.machine_code + ' - ' + machine.machine_name + '</option>';
                });
                $('#history_machine_datalist').html(options);
            }
        }
    });
}

function showMachineHistory(machineId, machineCode) {
    $.ajax({
        url: '../api/machines.php?id=' + machineId,
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                displayMachineInfo(response.data);
                loadMachineHistoryByCode(machineCode);
            }
        }
    });
}

function displayMachineInfo(machine) {
    var statusClassMap = { active: 'badge-success', maintenance: 'badge-warning', broken: 'badge-danger', retired: 'badge-secondary' };
    var statusClass = statusClassMap[machine.machine_status] || 'badge-info';
    $('#machine_status_badge').html('<strong>สถานะ: </strong><span class="badge ' + statusClass + ' badge-lg">' + getStatusText(machine.machine_status) + '</span>');

    var price = '-';
    if (machine.purchase_price) {
        price = parseFloat(machine.purchase_price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
    }

    var purchaseDate  = formatDateDMY(machine.purchase_date);
    var startDate     = formatDateDMY(machine.start_date);
    var registerDate  = formatDateDMY(machine.register_date);

    var infoHtml = '<div class="row mb-3">' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>ชื่อเครื่องจักร:</strong></div><div class="col-7">' + (machine.machine_name || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>บริษัทผู้ผลิต:</strong></div><div class="col-7">' + (machine.manufacturer || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>ราคาซื้อ:</strong></div><div class="col-7">' + price + '</div></div></div>' +
        '</div>' +
        '<div class="row mb-3">' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>รหัส:</strong></div><div class="col-7">' + (machine.machine_code || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>ผู้แทนจำหน่าย:</strong></div><div class="col-7">' + (machine.supplier || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>วันที่ซื้อ:</strong></div><div class="col-7">' + purchaseDate + '</div></div></div>' +
        '</div>' +
        '<div class="row mb-3">' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>หน่วยงานที่รับผิดชอบ:</strong></div><div class="col-7">' + (machine.responsible_dept || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>รุ่น:</strong></div><div class="col-7">' + (machine.model || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>วันที่เริ่มใช้งาน:</strong></div><div class="col-7">' + startDate + '</div></div></div>' +
        '</div>' +
        '<div class="row mb-3">' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>พื้นที่ใช้งาน:</strong></div><div class="col-7">' + (machine.work_area || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>ขนาด:</strong></div><div class="col-7">' + (machine.horsepower || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>วันที่ขึ้นทะเบียน:</strong></div><div class="col-7">' + registerDate + '</div></div></div>' +
        '</div>' +
        '<div class="row">' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>ประเภทเครื่องจักร:</strong></div><div class="col-7">' + (machine.machine_type || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>น้ำหนัก:</strong></div><div class="col-7">' + (machine.weight || '-') + '</div></div></div>' +
        '<div class="col-md-4"><div class="row"><div class="col-5 text-right"><strong>เบอร์โทรติดต่อ:</strong></div><div class="col-7">' + (machine.contact_phone || '-') + '</div></div></div>' +
        '</div>';

    $('#machine_current_info').html(infoHtml);
    $('#machine_info_card').show();
}

function getStatusText(status) {
    var map = { active: 'ใช้งาน', maintenance: 'ซ่อมบำรุง', broken: 'ชำรุด', retired: 'เลิกใช้งาน' };
    return map[status] || status || 'ไม่ระบุ';
}

// Event bindings for Tab 4
$(document).ready(function() {
    $('#reserve2-tab').on('shown.bs.tab', function() {
        loadMachinesDropdown();
    });

    $('#btn_show_history').on('click', function() {
        var machineCode = $('#history_machine_select_input').val().trim();
        if (!machineCode) {
            alert('กรุณาพิมพ์หรือเลือกรหัสเครื่องจักร');
            return;
        }
        var machine = machinesData.find(function(m) { return m.machine_code === machineCode; });
        if (!machine) {
            alert('ไม่พบรหัสเครื่องจักรนี้');
            return;
        }
        showMachineHistory(machine.id, machineCode);
    });
});
