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

/**
 * ตรวจจับประเภทอุปกรณ์ / Browser / OS ของผู้ใช้
 * ใช้ร่วมกันทุกหน้าที่ต้องการ device tracking
 */
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // ตรวจจับประเภทอุปกรณ์
    if (/tablet|ipad|playbook|silk/i.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform))) {
        deviceType = 'tablet';
    } else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        deviceType = 'mobile';
    }

    // ตรวจจับ Browser (ลำดับสำคัญ: Edge/Opera ก่อน Chrome)
    if (ua.indexOf('Edg') > -1) {
        browser = 'Edge';
    } else if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) {
        browser = 'Opera';
    } else if (ua.indexOf('Chrome') > -1) {
        browser = 'Chrome';
    } else if (ua.indexOf('Safari') > -1) {
        browser = 'Safari';
    } else if (ua.indexOf('Firefox') > -1) {
        browser = 'Firefox';
    } else if (ua.indexOf('Trident') > -1 || ua.indexOf('MSIE') > -1) {
        browser = 'Internet Explorer';
    }

    // ตรวจจับ OS (ลำดับสำคัญ: Android ก่อน Linux, iOS ก่อน macOS)
    if (ua.indexOf('Android') > -1) {
        os = 'Android';
    } else if (/iPad|iPhone|iPod/.test(ua) || (ua.indexOf('Mac') > -1 && navigator.maxTouchPoints > 1)) {
        os = 'iOS';
    } else if (ua.indexOf('Win') > -1) {
        os = 'Windows';
    } else if (ua.indexOf('Mac') > -1) {
        os = 'macOS';
    } else if (ua.indexOf('Linux') > -1) {
        os = 'Linux';
    }

    return { device_type: deviceType, browser: browser, os: os };
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
