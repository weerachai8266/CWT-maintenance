<?php
session_start();

// ตรวจสอบการ login
if (!isset($_SESSION['technician_logged_in']) || $_SESSION['technician_logged_in'] !== true) {
    header('Location: ../auth/login.php');
    exit;
}

require_once '../config/config.php';
require_once '../config/db.php';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>สร้าง QR Code เครื่องจักร | <?= SYSTEM_NAME ?></title>
    <link rel="stylesheet" href="../assets/vendor/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="../assets/vendor/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="../assets/vendor/fonts/sarabun.css">
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .machine-card {
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 8px;
            background: #fff;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: border-color .15s, background .15s;
        }
        .machine-card:hover  { background: #f0f4ff; border-color: #80bdff; }
        .machine-card.active { background: #e7f1ff; border-color: #0d6efd; border-width: 2px; }
        .machine-code { font-weight: 700; font-size: 1.05em; color: #0d6efd; }
        .machine-meta { color: #6c757d; font-size: 0.82em; }
        #machine-list { max-height: 70vh; overflow-y: auto; padding-right: 4px; }
        .filter-bar   { background: #f8f9fa; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
        .qr-label-box {
            border: 2px solid #343a40;
            border-radius: 8px;
            padding: 18px;
            text-align: center;
            background: #fff;
            display: inline-block;
        }
        .qr-label-box .qr-header       { font-size: .72em; color: #6c757d; }
        .qr-label-box .qr-machine-code  { font-size: 1.2em; font-weight: 700; }
        .qr-label-box .qr-machine-name  { font-size: .85em; color: #495057; margin-top: 3px; }
        .qr-label-box .qr-scan-text     { font-size: .72em; color: #6c757d; margin-top: 10px; }
        .qr-label-box .qr-dept-info      { font-size: .78em; color: #495057; margin-top: 4px; border-top: 1px solid #dee2e6; padding-top: 4px; }
        #qr-canvas canvas, #qr-canvas img {
            border: 6px solid #fff;
            box-shadow: 0 2px 10px rgba(0,0,0,.15);
            display: block;
            margin: 10px auto;
        }
        .placeholder-panel { color: #adb5bd; padding: 60px 20px; text-align: center; }
        .btn-remove-queue {
            position: absolute; top: -10px; right: -10px;
            background: #dc3545; border: none; color: #fff;
            border-radius: 50%; width: 22px; height: 22px;
            font-size: .75em; line-height: 22px; text-align: center;
            cursor: pointer; padding: 0;
        }
        #queue-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area {
                position: absolute; top: 0; left: 0; width: 100%;
                display: flex !important; flex-wrap: wrap;
                justify-content: center; align-items: flex-start;
                padding: 10px; gap: 10px;
            }
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container-fluid">
        <a class="navbar-brand" href="../index.php"><i class="fas fa-tools"></i> ระบบแจ้งซ่อม</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ml-auto">
                <li class="nav-item"><a class="nav-link" href="../index.php"><i class="fas fa-home"></i> หน้าแรก</a></li>
                <li class="nav-item"><a class="nav-link" href="repair_form.php"><i class="fas fa-clipboard-list"></i> แจ้งซ่อม</a></li>
                <li class="nav-item"><a class="nav-link" href="machines.php"><i class="fas fa-user-cog"></i> เจ้าหน้าที่ MT</a></li>
                <li class="nav-item active"><a class="nav-link" href="qr_machine.php"><i class="fas fa-qrcode"></i> QR Code</a></li>
                <li class="nav-item">
                    <span class="nav-link text-light"><i class="fas fa-user"></i> <?= htmlspecialchars($_SESSION['technician_username']) ?></span>
                </li>
                <li class="nav-item"><a class="nav-link" href="../auth/logout.php"><i class="fas fa-sign-out-alt"></i> ออกจากระบบ</a></li>
            </ul>
        </div>
    </div>
</nav>

<div class="container-fluid mt-4">
    <div class="row mb-3">
        <div class="col">
            <h2><i class="fas fa-qrcode"></i> สร้าง QR Code สำหรับแจ้งซ่อมเครื่องจักร</h2>
            <p class="text-muted mb-0">เลือกเครื่องจักร → กรอกข้อมูล → สร้าง QR → พิมพ์ติดเครื่องจักร</p>
        </div>
    </div>

    <div class="row">
        <!-- ===== LEFT: รายการเครื่องจักร ===== -->
        <div class="col-md-5">
            <div class="filter-bar">
                <div class="form-row">
                    <div class="col">
                        <input type="text" class="form-control" id="search-code"
                               placeholder="🔍 ค้นหารหัส / ชื่อเครื่องจักร...">
                    </div>
                    <div class="col-auto">
                        <select class="form-control" id="filter-branch">
                            <option value="">ทุกสาขา</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="machine-list">
                <div class="text-center text-muted py-4">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p class="mt-2">กำลังโหลด...</p>
                </div>
            </div>
        </div>

        <!-- ===== RIGHT: QR Panel ===== -->
        <div class="col-md-7">
            <div class="card shadow-sm">
                <div class="card-header bg-dark text-white">
                    <h5 class="mb-0"><i class="fas fa-qrcode"></i> สร้าง QR Code</h5>
                </div>
                <div class="card-body" id="qr-panel">
                    <div class="placeholder-panel">
                        <i class="fas fa-hand-pointer fa-3x mb-3"></i>
                        <p class="h6">← เลือกเครื่องจักรทางด้านซ้าย</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Hidden print area (ไม่แสดงบนหน้าจอ — ใช้สำหรับ print เท่านั้น) -->
<div id="print-area" style="display:none;"></div>

<!-- Queue section -->
<div class="container-fluid mt-3" id="queue-section" style="display:none;">
    <div class="card shadow-sm">
        <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="fas fa-list"></i> รายการ QR Code ที่จะพิมพ์ (<span id="queue-count">0</span> รายการ)</h5>
            <div>
                <button type="button" class="btn btn-light btn-sm mr-2" id="btn-clear-queue">
                    <i class="fas fa-trash"></i> ล้างทั้งหมด
                </button>
                <button type="button" class="btn btn-warning btn-sm" id="btn-print-all">
                    <i class="fas fa-print"></i> พิมพ์ทั้งหมด
                </button>
            </div>
        </div>
        <div class="card-body">
            <div id="queue-grid"></div>
        </div>
    </div>
</div>

<script src="../assets/vendor/jquery/jquery-3.5.1.min.js"></script>
<script src="../assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="../assets/vendor/qrcodejs/qrcode.min.js"></script>
<script src="../assets/js/master_data.js"></script>

<script>
'use strict';

var allMachines     = [];
var selectedMachine = null;
var printQueue      = [];
var lastDivision    = '';
var lastDepartment  = '';
var BASE_URL        = '<?= rtrim(BASE_URL, '/') ?>';

/* ========== Init ========== */
$(function () {
    loadBranches('#filter-branch', 'ทุกสาขา');
    fetchMachines();

    $('#search-code').on('input', renderList);
    $('#filter-branch').on('change', renderList);

    // Event delegation — ทำงานกับ DOM ที่ render ภายหลัง
    $(document).on('click', '.btn-select-machine', function (e) {
        e.stopPropagation();
        selectMachine($(this).data('code'));
    });
    $(document).on('click', '.machine-card', function () {
        selectMachine($(this).data('code'));
    });
    $(document).on('change', '#sel-division, #sel-department', function () {
        updatePreview();
    });
    $(document).on('click', '#btn-add-queue', function () {
        addToQueue();
    });
    $(document).on('click', '.btn-remove-queue', function () {
        var idx = parseInt($(this).data('idx'));
        printQueue.splice(idx, 1);
        renderQueue();
    });
    $(document).on('click', '#btn-clear-queue', function () {
        printQueue = [];
        renderQueue();
    });
    $(document).on('click', '#btn-print-all', function () {
        renderPrintArea();
        setTimeout(function () { window.print(); }, 300);
    });
});

/* ========== Fetch machines ========== */
function fetchMachines() {
    $.ajax({
        url: '../api/machines.php',
        type: 'GET',
        dataType: 'json',
        success: function (res) {
            if (res.success && res.data) {
                allMachines = res.data.sort(function (a, b) {
                    return a.machine_code.localeCompare(b.machine_code);
                });
                renderList();
            } else {
                $('#machine-list').html('<div class="alert alert-warning">ไม่มีข้อมูลเครื่องจักร</div>');
            }
        },
        error: function () {
            $('#machine-list').html('<div class="alert alert-danger">โหลดข้อมูลไม่ได้</div>');
        }
    });
}

/* ========== Render list ========== */
function renderList() {
    var kw     = ($('#search-code').val() || '').toLowerCase().trim();
    var branch = $('#filter-branch').val() || '';

    var list = allMachines.filter(function (m) {
        if (branch && m.branch !== branch) return false;
        if (!kw) return true;
        return (m.machine_code   || '').toLowerCase().includes(kw) ||
               (m.machine_name   || '').toLowerCase().includes(kw) ||
               (m.machine_number || '').toLowerCase().includes(kw);
    });

    if (list.length === 0) {
        $('#machine-list').html('<div class="text-center text-muted py-3">ไม่พบเครื่องจักร</div>');
        return;
    }

    var activeCode = selectedMachine ? selectedMachine.machine_code : '';
    var html = '';
    list.forEach(function (m) {
        var isActive = m.machine_code === activeCode ? ' active' : '';
        html += '<div class="machine-card' + isActive + '" data-code="' + esc(m.machine_code) + '">';
        html += '  <div>';
        html += '    <div class="machine-code">' + esc(m.machine_code) + '</div>';
        html += '    <div class="machine-meta">' + esc(m.machine_name) + '</div>';
        if (m.machine_number) {
            html += '  <div class="machine-meta">หมายเลข: ' + esc(m.machine_number) + '</div>';
        }
        html += '  </div>';
        html += '  <div class="text-right text-nowrap">';
        if (m.branch) {
            html += '<span class="badge badge-info mr-1">' + esc(m.branch) + '</span>';
        }
        html += '    <button type="button" class="btn btn-sm btn-outline-primary btn-select-machine"'
             +  '            data-code="' + esc(m.machine_code) + '">'
             +  '      <i class="fas fa-qrcode"></i> เลือก</button>';
        html += '  </div>';
        html += '</div>';
    });
    $('#machine-list').html(html);
}

/* ========== Select machine → show config panel ========== */
function selectMachine(code) {
    var m = allMachines.find(function (x) { return x.machine_code === code; });
    if (!m) return;
    selectedMachine = m;

    // Highlight
    $('.machine-card').removeClass('active');
    $('.machine-card[data-code="' + esc(code) + '"]').addClass('active');

    // Build right panel HTML
    var html = '';
    html += '<div class="alert alert-primary py-2 mb-3">';
    html += '  <strong>' + esc(m.machine_code) + '</strong> — ' + esc(m.machine_name);
    if (m.branch) html += ' &nbsp;<span class="badge badge-info">' + esc(m.branch) + '</span>';
    html += '</div>';

    html += '<div class="form-row">';
    html += '  <div class="form-group col-md-6">';
    html += '    <label>ฝ่าย <span class="text-danger">*</span></label>';
    html += '    <select class="form-control" id="sel-division"><option value="">-- เลือกฝ่าย --</option></select>';
    html += '  </div>';
    html += '  <div class="form-group col-md-6">';
    html += '    <label>หน่วยงาน <span class="text-danger">*</span></label>';
    html += '    <select class="form-control" id="sel-department"><option value="">-- เลือกหน่วยงาน --</option></select>';
    html += '  </div>';
    html += '</div>';

    html += '<button type="button" class="btn btn-primary btn-block" id="btn-add-queue">';
    html += '  <i class="fas fa-plus"></i> เพิ่มในรายการพิมพ์</button>';

    // Preview section
    html += '<div id="qr-preview-section" style="display:none;margin-top:20px;">';
    html += '  <hr>';
    html += '  <h6 class="text-muted text-center">ตัวอย่าง QR Code</h6>';
    html += '  <div style="text-align:center;">';
    html += '    <div class="qr-label-box" style="display:inline-block;">';
    html += '      <div class="qr-header">แจ้งซ่อมเครื่องจักร</div>';
    html += '      <div class="qr-machine-code" id="preview-code"></div>';
    html += '      <div class="qr-machine-name" id="preview-name"></div>';
    html += '      <div id="qr-preview-canvas" style="margin:6px auto;"></div>';
    html += '      <div class="qr-dept-info" id="preview-dept"></div>';
    html += '      <div class="qr-scan-text"><i class="fas fa-qrcode"></i> สแกนเพื่อแจ้งซ่อม</div>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="mt-2">';
    html += '    <label class="small text-muted">URL ที่ใช้ในการสแกน</label>';
    html += '    <input type="text" class="form-control form-control-sm" id="qr-preview-url" readonly>';
    html += '  </div>';
    html += '</div>';

    $('#qr-panel').html(html);

    // Load dropdowns — auto-restore last selected division/department
    loadDivisions('#sel-division', '-- เลือกฝ่าย --', function () {
        if (lastDivision) {
            $('#sel-division').val(lastDivision);
        }
        loadDepartments('#sel-department', '-- เลือกหน่วยงาน --', function () {
            if (lastDepartment) {
                $('#sel-department').val(lastDepartment);
                updatePreview();
            }
        });
    });
}

/* ========== Live preview ========== */
function updatePreview() {
    if (!selectedMachine) return;
    var division   = $('#sel-division').val();
    var department = $('#sel-department').val();

    if (!division || !department) {
        $('#qr-preview-section').hide();
        return;
    }

    var m   = selectedMachine;
    var url = BASE_URL + '/pages/repair_form.php?' + new URLSearchParams({
        machine:    m.machine_code,
        branch:     m.branch      || '',
        division:   division,
        department: department
    }).toString();

    lastDivision  = division;
    lastDepartment = department;

    $('#preview-code').text(m.machine_code);
    $('#preview-name').text(m.machine_name);
    $('#preview-dept').text(division + ' / ' + department);
    $('#qr-preview-url').val(url);

    $('#qr-preview-canvas').html('');
    new QRCode(document.getElementById('qr-preview-canvas'), {
        text:         url,
        width:        250,
        height:       250,
        colorDark:    '#000000',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });

    $('#qr-preview-section').show();
}

/* ========== Add to print queue ========== */
function addToQueue() {
    if (!selectedMachine) { alert('กรุณาเลือกเครื่องจักรก่อน'); return; }
    var division   = $('#sel-division').val();
    var department = $('#sel-department').val();
    if (!division || !department) {
        alert('กรุณาเลือกฝ่ายและหน่วยงานก่อน');
        return;
    }

    var m   = selectedMachine;
    var url = BASE_URL + '/pages/repair_form.php?' + new URLSearchParams({
        machine:    m.machine_code,
        branch:     m.branch      || '',
        division:   division,
        department: department
    }).toString();

    var exists = printQueue.find(function (q) {
        return q.machine.machine_code === m.machine_code &&
               q.division === division && q.department === department;
    });
    if (exists) { alert('รายการนี้อยู่ในคิวพิมพ์แล้ว'); return; }

    printQueue.push({ machine: m, division: division, department: department, url: url });
    renderQueue();

    var $btn = $('#btn-add-queue');
    $btn.html('<i class="fas fa-check"></i> เพิ่มแล้ว!').removeClass('btn-primary').addClass('btn-success');
    setTimeout(function () {
        $btn.html('<i class="fas fa-plus"></i> เพิ่มในรายการพิมพ์').removeClass('btn-success').addClass('btn-primary');
    }, 1500);
}

/* ========== Render queue (on-screen preview) ========== */
function renderQueue() {
    if (printQueue.length === 0) {
        $('#queue-section').hide();
        return;
    }
    $('#queue-count').text(printQueue.length);
    $('#queue-section').show();

    var html = '';
    printQueue.forEach(function (item, idx) {
        html += '<div style="position:relative;display:inline-block;">';
        html += '  <div class="qr-label-box">';
        html += '    <div class="qr-header">แจ้งซ่อมเครื่องจักร</div>';
        html += '    <div class="qr-machine-code">' + esc(item.machine.machine_code) + '</div>';
        html += '    <div class="qr-machine-name">' + esc(item.machine.machine_name) + '</div>';
        html += '    <div id="qr-queue-' + idx + '" style="margin:6px auto;"></div>';
        html += '    <div class="qr-dept-info">' + esc(item.division) + ' / ' + esc(item.department) + '</div>';
        html += '    <div class="qr-scan-text"><i class="fas fa-qrcode"></i> สแกนเพื่อแจ้งซ่อม</div>';
        html += '  </div>';
        html += '  <button type="button" class="btn-remove-queue" data-idx="' + idx + '" title="ลบออก">&times;</button>';
        html += '</div>';
    });
    $('#queue-grid').html(html);

    printQueue.forEach(function (item, idx) {
        new QRCode(document.getElementById('qr-queue-' + idx), {
            text:         item.url,
            width:        150,
            height:       150,
            colorDark:    '#000000',
            colorLight:   '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    });
}

/* ========== Render print area (larger QR for printing) ========== */
function renderPrintArea() {
    var html = '';
    printQueue.forEach(function (item, idx) {
        html += '<div class="qr-label-box" style="margin:6px;">';
        html += '  <div class="qr-header">แจ้งซ่อมเครื่องจักร</div>';
        html += '  <div class="qr-machine-code">' + esc(item.machine.machine_code) + '</div>';
        html += '  <div class="qr-machine-name">' + esc(item.machine.machine_name) + '</div>';
        html += '  <div id="qr-print-' + idx + '" style="margin:8px auto;"></div>';
        html += '  <div class="qr-dept-info">' + esc(item.division) + ' / ' + esc(item.department) + '</div>';
        html += '  <div class="qr-scan-text"><i class="fas fa-qrcode"></i> สแกนเพื่อแจ้งซ่อม</div>';
        html += '</div>';
    });
    $('#print-area').html(html);

    printQueue.forEach(function (item, idx) {
        new QRCode(document.getElementById('qr-print-' + idx), {
            text:         item.url,
            width:        200,
            height:       200,
            colorDark:    '#000000',
            colorLight:   '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    });
}

/* ========== Escape HTML ========== */
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
</script>

</body>
</html>
