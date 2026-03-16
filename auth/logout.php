<?php
session_start();
require_once '../config/db.php';

// บันทึก logout log ก่อน destroy session
if (isset($_SESSION['technician_logged_in']) && $_SESSION['technician_logged_in'] === true) {
    $user_id  = $_SESSION['user_id']             ?? null;
    $username = $_SESSION['technician_username'] ?? '';

    // รับ IP
    $ip = '0.0.0.0';
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_REAL_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            $candidate = trim(explode(',', $_SERVER[$key])[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP)) { $ip = $candidate; break; }
        }
    }

    // parse UA
    $ua          = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
    $device_type = 'Desktop';
    $browser     = 'Unknown';
    $os          = 'Unknown';

    if      (preg_match('/Windows NT 10/i',  $ua))   $os = 'Windows 10/11';
    elseif  (preg_match('/Windows/i',        $ua))   $os = 'Windows';
    elseif  (preg_match('/Android (\d+[\.\d]*)/i', $ua, $m)) $os = 'Android ' . $m[1];
    elseif  (preg_match('/iPhone OS ([\d_]+)/i', $ua, $m))   $os = 'iOS ' . str_replace('_', '.', $m[1]);
    elseif  (preg_match('/Mac OS X ([\d_]+)/i', $ua, $m))    $os = 'macOS ' . str_replace('_', '.', $m[1]);
    elseif  (preg_match('/Linux/i',           $ua))  $os = 'Linux';

    if      (preg_match('/bot|crawl|spider/i', $ua)) $device_type = 'Bot';
    elseif  (preg_match('/iPad/i',             $ua)) $device_type = 'Tablet';
    elseif  (preg_match('/Mobile|Android|iPhone/i', $ua)) $device_type = 'Mobile';

    if      (preg_match('/Edg\/(\d+)/i', $ua, $m))     $browser = 'Edge ' . $m[1];
    elseif  (preg_match('/OPR\/(\d+)/i', $ua, $m))     $browser = 'Opera ' . $m[1];
    elseif  (preg_match('/Chrome\/(\d+)/i', $ua, $m))  $browser = 'Chrome ' . $m[1];
    elseif  (preg_match('/Firefox\/(\d+)/i', $ua, $m)) $browser = 'Firefox ' . $m[1];
    elseif  (preg_match('/Safari\/(\d+)/i', $ua, $m) && !preg_match('/Chrome/i', $ua)) $browser = 'Safari';

    try {
        $stmt = $conn->prepare("
            INSERT INTO mt_login_log
                (user_id, username, ip_address, device_type, browser, os, user_agent, status, note)
            VALUES
                (:user_id, :username, :ip, :device_type, :browser, :os, :ua, 'logout', :note)
        ");
        $stmt->execute([
            ':user_id'     => $user_id,
            ':username'    => $username,
            ':ip'          => $ip,
            ':device_type' => $device_type,
            ':browser'     => $browser,
            ':os'          => $os,
            ':ua'          => $ua,
            ':note'        => 'Session duration: ' . round((time() - ($_SESSION['login_time'] ?? time())) / 60) . ' min',
        ]);
    } catch (PDOException $e) {
        error_log('logout log error: ' . $e->getMessage());
    }
}

// ลบข้อมูล session
unset($_SESSION['technician_logged_in']);
unset($_SESSION['technician_username']);
unset($_SESSION['login_time']);

// ทำลาย session
session_destroy();

// Redirect กลับไปหน้า login
header('Location: login.php');
exit;
?>
