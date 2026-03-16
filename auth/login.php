<?php
session_start();
require_once '../config/db.php';

// ถ้า login แล้วให้ redirect ไปหน้า machines
if (isset($_SESSION['technician_logged_in']) && $_SESSION['technician_logged_in'] === true) {
    header('Location: ../pages/machines.php');
    exit;
}

/* ========== Helper: รับ IP จริงของผู้ใช้ ========== */
function get_client_ip(): string {
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_REAL_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = trim(explode(',', $_SERVER[$key])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return '0.0.0.0';
}

/* ========== Helper: วิเคราะห์ User-Agent ========== */
function parse_user_agent(string $ua): array {
    $browser     = 'Unknown';
    $os          = 'Unknown';
    $device_type = 'Desktop';

    // --- OS ---
    if      (preg_match('/Windows NT 10/i', $ua))   $os = 'Windows 10/11';
    elseif  (preg_match('/Windows NT 6\.3/i', $ua)) $os = 'Windows 8.1';
    elseif  (preg_match('/Windows NT 6\.1/i', $ua)) $os = 'Windows 7';
    elseif  (preg_match('/Windows/i', $ua))          $os = 'Windows';
    elseif  (preg_match('/Android (\d+[\.\d]*)/i', $ua, $m)) $os = 'Android ' . $m[1];
    elseif  (preg_match('/iPhone OS ([\d_]+)/i', $ua, $m))   $os = 'iOS ' . str_replace('_', '.', $m[1]);
    elseif  (preg_match('/iPad.*OS ([\d_]+)/i', $ua, $m))    $os = 'iPadOS ' . str_replace('_', '.', $m[1]);
    elseif  (preg_match('/Mac OS X ([\d_]+)/i', $ua, $m))    $os = 'macOS ' . str_replace('_', '.', $m[1]);
    elseif  (preg_match('/Linux/i', $ua))            $os = 'Linux';

    // --- Device type ---
    if      (preg_match('/bot|crawl|spider|slurp|mediapartners/i', $ua)) $device_type = 'Bot';
    elseif  (preg_match('/iPad/i', $ua))             $device_type = 'Tablet';
    elseif  (preg_match('/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i', $ua)) $device_type = 'Mobile';

    // --- Browser (ต้อง check Edge/OPR ก่อน Chrome) ---
    if      (preg_match('/Edg\/(\d+)/i', $ua, $m))     $browser = 'Edge ' . $m[1];
    elseif  (preg_match('/OPR\/(\d+)/i', $ua, $m))     $browser = 'Opera ' . $m[1];
    elseif  (preg_match('/SamsungBrowser\/(\d+)/i', $ua, $m)) $browser = 'Samsung ' . $m[1];
    elseif  (preg_match('/Chrome\/(\d+)/i', $ua, $m))  $browser = 'Chrome ' . $m[1];
    elseif  (preg_match('/Firefox\/(\d+)/i', $ua, $m)) $browser = 'Firefox ' . $m[1];
    elseif  (preg_match('/Safari\/(\d+)/i', $ua, $m) && !preg_match('/Chrome/i', $ua)) {
        if (preg_match('/Version\/(\d+)/i', $ua, $mv)) $browser = 'Safari ' . $mv[1];
        else $browser = 'Safari';
    }
    elseif  (preg_match('/MSIE (\d+)|Trident.*rv:(\d+)/i', $ua, $m)) $browser = 'IE ' . ($m[1] ?: $m[2]);

    return compact('browser', 'os', 'device_type');
}

/* ========== Helper: บันทึก login log ========== */
function write_login_log(PDO $conn, ?int $user_id, string $username, string $status, string $note = ''): void {
    $ip  = get_client_ip();
    $ua  = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
    $parsed = parse_user_agent($ua);
    try {
        $stmt = $conn->prepare("
            INSERT INTO mt_login_log
                (user_id, username, ip_address, device_type, browser, os, user_agent, status, note)
            VALUES
                (:user_id, :username, :ip, :device_type, :browser, :os, :ua, :status, :note)
        ");
        $stmt->execute([
            ':user_id'     => $user_id,
            ':username'    => $username,
            ':ip'          => $ip,
            ':device_type' => $parsed['device_type'],
            ':browser'     => $parsed['browser'],
            ':os'          => $parsed['os'],
            ':ua'          => $ua,
            ':status'      => $status,
            ':note'        => $note,
        ]);
    } catch (PDOException $e) {
        error_log('write_login_log error: ' . $e->getMessage());
    }
}

// ตรวจสอบการ login
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
    } else {
        try {
            // ดึงข้อมูล user จากฐานข้อมูล
            $stmt = $conn->prepare("
                SELECT id, username, password, full_name, role, email, 
                       employee_id, department, branch, position, is_active,
                       login_attempts, locked_until
                FROM mt_users 
                WHERE username = :username
            ");
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // ตรวจสอบว่า account ถูกล็อคหรือไม่
                if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
                    $error = 'บัญชีของคุณถูกล็อค กรุณารอ ' . date('H:i:s', strtotime($user['locked_until']) - time()) . ' นาที';
                    write_login_log($conn, (int)$user['id'], $username, 'locked', 'Account locked until ' . $user['locked_until']);
                } 
                // ตรวจสอบสถานะ active
                elseif ($user['is_active'] != 1) {
                    $error = 'บัญชีของคุณถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
                    write_login_log($conn, (int)$user['id'], $username, 'disabled', 'Account is inactive');
                }
                // ตรวจสอบรหัสผ่าน
                elseif (password_verify($password, $user['password'])) {
                    // Login สำเร็จ
                    $_SESSION['technician_logged_in'] = true;
                    $_SESSION['technician_username'] = $user['username'];
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_full_name'] = $user['full_name'];
                    $_SESSION['user_role'] = $user['role'];
                    $_SESSION['user_email'] = $user['email'];
                    $_SESSION['user_department'] = $user['department'];
                    $_SESSION['user_branch'] = $user['branch'];
                    $_SESSION['login_time'] = time();
                    
                    // รีเซ็ต login attempts, อัปเดต last_login และ last_login_ip
                    $ip = get_client_ip();
                    $updateStmt = $conn->prepare("
                        UPDATE mt_users 
                        SET login_attempts = 0, 
                            locked_until = NULL,
                            last_login = NOW(),
                            last_login_ip = :ip
                        WHERE id = :id
                    ");
                    $updateStmt->execute([':ip' => $ip, ':id' => $user['id']]);

                    write_login_log($conn, (int)$user['id'], $username, 'success');

                    header('Location: ../pages/machines.php');
                    exit;
                } else {
                    // รหัสผ่านผิด - เพิ่ม login attempts
                    $attempts = $user['login_attempts'] + 1;
                    $locked_until = null;
                    
                    // ล็อค account ถ้าพยายามเกิน 5 ครั้ง
                    if ($attempts >= 5) {
                        $locked_until = date('Y-m-d H:i:s', strtotime('+15 minutes'));
                        $error = 'คุณพยายาม login ผิดเกินกำหนด บัญชีถูกล็อคเป็นเวลา 15 นาที';
                        write_login_log($conn, (int)$user['id'], $username, 'locked', 'Too many attempts - account locked 15 min');
                    } else {
                        $error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (พยายาม ' . $attempts . '/5 ครั้ง)';
                        write_login_log($conn, (int)$user['id'], $username, 'failed', 'Wrong password attempt ' . $attempts . '/5');
                    }
                    
                    $updateStmt = $conn->prepare("
                        UPDATE mt_users 
                        SET login_attempts = :attempts,
                            locked_until = :locked_until
                        WHERE id = :id
                    ");
                    $updateStmt->execute([
                        ':attempts' => $attempts,
                        ':locked_until' => $locked_until,
                        ':id' => $user['id']
                    ]);
                }
            } else {
                $error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
                write_login_log($conn, null, $username, 'failed', 'Username not found');
            }
        } catch (PDOException $e) {
            error_log('Login error: ' . $e->getMessage());
            $error = 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เข้าสู่ระบบ - เจ้าหน้าที่ซ่อมบำรุง</title>
    <link rel="stylesheet" href="../assets/vendor/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="../assets/vendor/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="../assets/vendor/fonts/sarabun.css">
    <style>
        * {
            font-family: 'Sarabun', sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            max-width: 450px;
            width: 100%;
            animation: fadeInUp 0.6s ease;
        }
        
        .login-header {
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .login-header i {
            font-size: 3.5rem;
            margin-bottom: 15px;
            animation: pulse 2s infinite;
        }
        
        .login-header h2 {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .login-header p {
            font-size: 1rem;
            opacity: 0.95;
            margin: 0;
        }
        
        .login-body {
            padding: 40px 35px;
        }
        
        .form-group label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
        }
        
        .form-control {
            border-radius: 10px;
            border: 2px solid #e9ecef;
            padding: 12px 15px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .form-control:focus {
            border-color: #ffc107;
            box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
        }
        
        .input-group-text {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-right: none;
            border-radius: 10px 0 0 10px;
        }
        
        .input-group .form-control {
            border-left: none;
            border-radius: 0 10px 10px 0;
        }
        
        .btn-login {
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
            border: none;
            border-radius: 10px;
            padding: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            color: white;
            width: 100%;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(255, 193, 7, 0.4);
        }
        
        .btn-back {
            background: #6c757d;
            border: none;
            border-radius: 10px;
            padding: 10px;
            font-size: 1rem;
            font-weight: 600;
            color: white;
            width: 100%;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .btn-back:hover {
            background: #5a6268;
            color: white;
        }
        
        .alert {
            border-radius: 10px;
            border: none;
            animation: shake 0.5s;
        }
        
        .login-info {
            background: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 0.9rem;
        }
        
        .login-info strong {
            display: block;
            margin-bottom: 10px;
            color: #007bff;
        }
        
        .login-info code {
            background: white;
            padding: 2px 6px;
            border-radius: 4px;
            color: #e83e8c;
            font-size: 0.85rem;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        
        @media (max-width: 576px) {
            .login-header {
                padding: 30px 20px;
            }
            
            .login-header h2 {
                font-size: 1.5rem;
            }
            
            .login-body {
                padding: 30px 25px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <i class="fas fa-user-cog"></i>
            <h2>เจ้าหน้าที่ซ่อมบำรุง</h2>
            <p>กรุณาเข้าสู่ระบบ</p>
        </div>
        
        <div class="login-body">
            <?php if ($error): ?>
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label for="username">
                        <i class="fas fa-user"></i> ชื่อผู้ใช้
                    </label>
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">
                                <i class="fas fa-user"></i>
                            </span>
                        </div>
                        <input type="text" class="form-control" id="username" name="username" 
                               placeholder="กรอกชื่อผู้ใช้" required autofocus>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="password">
                        <i class="fas fa-lock"></i> รหัสผ่าน
                    </label>
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">
                                <i class="fas fa-lock"></i>
                            </span>
                        </div>
                        <input type="password" class="form-control" id="password" name="password" 
                               placeholder="กรอกรหัสผ่าน" required>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-login">
                    <i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ
                </button>
                
                <a href="../index.php" class="btn btn-back">
                    <i class="fas fa-arrow-left"></i> กลับหน้าแรก
                </a>
            </form>
            
            <!-- <div class="login-info">
                <strong><i class="fas fa-info-circle"></i> ข้อมูลสำหรับทดสอบ:</strong>
                <div>Username: <code>admin</code> / Password: <code>admin123</code></div>
                <div>Username: <code>technician</code> / Password: <code>tech123</code></div>
                <div>Username: <code>maintenance</code> / Password: <code>mt123</code></div>
            </div> -->
        </div>
    </div>
    
    <script src="../assets/vendor/jquery/jquery-3.5.1.min.js"></script>
    <script src="../assets/vendor/bootstrap/js/bootstrap.min.js"></script>
</body>
</html>
