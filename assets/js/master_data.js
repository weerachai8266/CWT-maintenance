// ฟังก์ชันโหลด master data ใช้ซ้ำได้ทุกหน้า

function loadBranches(selectId, firstOptionText = "ทั้งหมด", callback) {
    console.log('loadBranches called for', selectId);
    var $select = $(selectId);
    if ($select.length === 0) {
        console.warn('Selector not found for loadBranches:', selectId);
        if (typeof callback === 'function') callback({ success: false, data: [] });
        return;
    }
    $.ajax({
        url: '../api/master_data.php',
        method: 'GET',
        data: { action: 'list', type: 'branch' },
        dataType: 'json',
        success: function(response) {
            console.log('loadBranches response:', response);
            $select.empty();
            $select.append('<option value="">' + firstOptionText + '</option>');
            if (response && response.success && Array.isArray(response.data)) {
                response.data.forEach(function(branch) {
                    if (branch.is_active == 1) {
                        // Use branch.name as the option value (user requested names)
                        var val = branch.name || branch.id;
                        $select.append('<option value="' + val + '">' + branch.name + '</option>');
                    }
                });
            } else {
                console.warn('No branch data or response.success is false', response);
            }
            if (typeof callback === 'function') {
                try { callback(response); } catch (err) { console.error('loadBranches callback error:', err); }
            }
        },
        error: function(xhr, status, err) {
            console.error('Error loading branches:', status, err, xhr && xhr.responseText);
            $select.empty();
            $select.append('<option value="">' + firstOptionText + '</option>');
            if (typeof callback === 'function') callback({ success: false, data: [] });
        }
    });
}

function loadDivisions(selectId, firstOptionText = "ทั้งหมด") {
    $.ajax({
        url: '../api/master_data.php',
        method: 'GET',
        data: { action: 'list', type: 'division' },
        success: function(response) {
            if (response.success) {
                var $select = $(selectId);
                $select.empty();
                $select.append('<option value="">' + firstOptionText + '</option>');
                response.data.forEach(function(item) {
                    if (item.is_active == 1) {
                        $select.append('<option value="' + item.name + '">' + item.name + '</option>');
                    }
                });
            }
        }
    });
}

function loadDepartments(selectId, firstOptionText = "ทั้งหมด") {
    $.ajax({
        url: '../api/master_data.php',
        method: 'GET',
        data: { action: 'list', type: 'department' },
        success: function(response) {
            if (response.success) {
                var $select = $(selectId);
                $select.empty();
                $select.append('<option value="">' + firstOptionText + '</option>');
                response.data.forEach(function(item) {
                    if (item.is_active == 1) {
                        $select.append('<option value="' + item.name + '">' + item.name + '</option>');
                    }
                });
            }
        }
    });
}

function loadIssues(selectId, firstOptionText = "ทั้งหมด") {
    $.ajax({
        url: '../api/master_data.php',
        method: 'GET',
        data: { action: 'list', type: 'issue' },
        success: function(response) {
            if (response.success) {
                var $select = $(selectId);
                $select.empty();
                $select.append('<option value="">' + firstOptionText + '</option>');
                response.data.forEach(function(item) {
                    if (item.is_active == 1) {
                        $select.append('<option value="' + item.name + '">' + item.name + '</option>');
                    }
                });
            }
        }
    });
}

// ==================== Master Data CRUD (used in machines.php Tab 5) ====================
var currentMasterType = '';

function loadMasterData(type) {
    currentMasterType = type;
    var tbody = $('#' + type + 'TableBody');
    tbody.html('<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด...</td></tr>');

    $.ajax({
        url: '../api/master_data.php',
        method: 'GET',
        data: { action: 'list', type: type },
        success: function(response) {
            if (response.success) {
                displayMasterData(type, response.data);
            } else {
                tbody.html('<tr><td colspan="6" class="text-center text-danger">' + response.message + '</td></tr>');
            }
        },
        error: function() {
            tbody.html('<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>');
        }
    });
}

function displayMasterData(type, data) {
    var tbody = $('#' + type + 'TableBody');
    var colspan = (type === 'department') ? 7 : 6;
    var html = '';

    if (data.length === 0) {
        tbody.html('<tr><td colspan="' + colspan + '" class="text-center">ไม่มีข้อมูล</td></tr>');
        return;
    }

    data.forEach(function(item) {
        var statusBadge = item.is_active == 1
            ? '<span class="badge badge-success">ใช้งาน</span>'
            : '<span class="badge badge-secondary">ไม่ใช้งาน</span>';

        html += '<tr>';
        html += '<td class="text-center">' + item.id + '</td>';
        html += '<td>' + (item.name || '-') + '</td>';
        if (type === 'department') {
            html += '<td>' + (item.group_id ? item.group_id + (item.group_name ? ' - ' + item.group_name : '') : (item.group_name || '-')) + '</td>';
        }
        html += '<td class="text-center"><small>' + (item.created_by || '-') + '</small></td>';
        html += '<td class="text-center"><small>' + (item.updated_by || '-') + '</small></td>';
        html += '<td class="text-center">' + statusBadge + '</td>';
        html += '<td class="text-center">';
        html += '<button class="btn btn-sm btn-primary" onclick="editMasterItem(\'' + type + '\', ' + item.id + ')" title="แก้ไข"><i class="fas fa-edit"></i></button> ';
        html += '<button class="btn btn-sm btn-warning" onclick="toggleMasterStatus(\'' + type + '\', ' + item.id + ')" title="เปลี่ยนสถานะ"><i class="fas fa-power-off"></i></button> ';
        html += '<button class="btn btn-sm btn-danger" onclick="deleteMasterItem(\'' + type + '\', ' + item.id + ')" title="ลบ"><i class="fas fa-trash"></i></button>';
        html += '</td>';
        html += '</tr>';
    });

    tbody.html(html);
}

function openMasterModal(type) {
    currentMasterType = type;
    $('#master_type').val(type);
    $('#master_id').val('');
    $('#masterForm')[0].reset();

    if (type === 'department') {
        $('#group_name_field').show();
    } else {
        $('#group_name_field').hide();
        $('#master_group_id').val('');
        $('#master_group_name').val('');
    }

    var titleMap = { company: 'เพิ่มบริษัท', branch: 'เพิ่มสาขา', division: 'เพิ่มฝ่าย', department: 'เพิ่มหน่วยงาน', issue: 'เพิ่มอาการเสีย' };
    $('#masterModalTitle').html('<i class="fas fa-plus"></i> ' + (titleMap[type] || 'เพิ่มข้อมูล'));
    $('#masterModal').modal('show');
}

function editMasterItem(type, id) {
    currentMasterType = type;
    $.ajax({
        url: '../api/master_data.php',
        method: 'GET',
        data: { action: 'get', type: type, id: id },
        success: function(response) {
            if (response.success) {
                var item = response.data;
                $('#master_type').val(type);
                $('#master_id').val(item.id);
                $('#master_name').val(item.name);

                if (type === 'department') {
                    $('#master_group_id').val(item.group_id || '');
                    $('#master_group_name').val(item.group_name || '');
                    $('#group_name_field').show();
                } else {
                    $('#master_group_name').val('');
                    $('#group_name_field').hide();
                }

                var titleMap = { company: 'แก้ไขบริษัท', branch: 'แก้ไขสาขา', division: 'แก้ไขฝ่าย', department: 'แก้ไขหน่วยงาน', issue: 'แก้ไขอาการเสีย' };
                $('#masterModalTitle').html('<i class="fas fa-edit"></i> ' + (titleMap[type] || 'แก้ไขข้อมูล'));
                $('#masterModal').modal('show');
            }
        }
    });
}

function deleteMasterItem(type, id) {
    if (!confirm('คุณต้องการลบข้อมูลนี้หรือไม่?')) return;
    $.ajax({
        url: '../api/master_data.php',
        method: 'POST',
        data: { action: 'delete', type: type, id: id },
        success: function(response) {
            if (response.success) {
                alert('ลบข้อมูลเรียบร้อย');
                loadMasterData(type);
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        }
    });
}

function toggleMasterStatus(type, id) {
    $.ajax({
        url: '../api/master_data.php',
        method: 'POST',
        data: { action: 'toggle_status', type: type, id: id },
        success: function(response) {
            if (response.success) {
                loadMasterData(type);
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        }
    });
}

$(document).ready(function() {
    // Master form submit
    $('#masterForm').on('submit', function(e) {
        e.preventDefault();
        $.ajax({
            url: '../api/master_data.php',
            method: 'POST',
            data: $(this).serialize() + '&action=save',
            success: function(response) {
                if (response.success) {
                    alert('บันทึกข้อมูลเรียบร้อย');
                    $('#masterModal').modal('hide');
                    loadMasterData(currentMasterType);
                } else {
                    alert('เกิดข้อผิดพลาด: ' + response.message);
                }
            },
            error: function() {
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        });
    });
});
