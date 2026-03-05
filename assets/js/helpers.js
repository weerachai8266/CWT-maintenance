/**
 * helpers.js
 * ฟังก์ชัน utility ใช้ร่วมกันทุกหน้า
 */

// แปลง YYYY-MM-DD → DD-MM-YYYY
function formatDateDMY(dateStr) {
    if (!dateStr) return '-';
    var m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || '-';
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '-' + mm + '-' + yyyy;
}

// แปลง YYYY-MM-DD HH:MM:SS → DD-MM-YYYY HH:MM
function formatDateTimeTH(dateStr) {
    if (!dateStr) return '-';
    var m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1] + ' ' + m[4] + ':' + m[5];
    return formatDateDMY(dateStr);
}

// อัปเดต placeholder เลขเอกสารตามประเภทงาน
function updateDocumentNoPrefix() {
    var workType = $('#history_work_type').val();
    var year = new Date().getFullYear() + 543;
    var year2digit = year.toString().slice(-2);
    var prefixExamples = {
        'PM':  'PM001/'  + year2digit,
        'CAL': 'CAL001/' + year2digit,
        'OVH': 'OVH001/' + year2digit,
        'INS': 'INS001/' + year2digit
    };
    $('#history_document_no').attr('placeholder', prefixExamples[workType] || '(สร้างอัตโนมัติ)');
}
