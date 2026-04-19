<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ─── MySQL Connection ─────────────────────────
$host     = 'localhost';
$dbname   = 'expensetracker';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// ─── Auto-create users table ──────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        email      VARCHAR(150) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

// ─── Also add user_id to expenses if missing ─
try {
    $pdo->exec("ALTER TABLE expenses ADD COLUMN user_id INT DEFAULT NULL");
} catch (PDOException $e) {
    // Column already exists, ignore
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$data   = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

// ─── SIGNUP ───────────────────────────────────
if ($action === 'signup') {
    $name     = trim($data['name'] ?? '');
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$name || !$email || !$password) {
        echo json_encode(['error' => 'All fields are required.']);
        exit();
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['error' => 'Invalid email address.']);
        exit();
    }
    if (strlen($password) < 6) {
        echo json_encode(['error' => 'Password must be at least 6 characters.']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'An account with this email already exists.']);
        exit();
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt   = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (:name, :email, :password)");
    $stmt->execute([':name' => $name, ':email' => $email, ':password' => $hashed]);
    $newUserId = $pdo->lastInsertId();

    // Return user data — stored in localStorage by app.js
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully.',
        'user_id' => $newUserId,
        'name'    => $name,
        'email'   => $email
    ]);
}

// ─── LOGIN ────────────────────────────────────
elseif ($action === 'login') {
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        echo json_encode(['error' => 'Email and password are required.']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode(['error' => 'Invalid email or password.']);
        exit();
    }

    // Return user data — stored in localStorage by app.js
    echo json_encode([
        'success' => true,
        'user_id' => $user['id'],
        'name'    => $user['name'],
        'email'   => $user['email']
    ]);
}

// ─── LOGOUT ───────────────────────────────────
elseif ($action === 'logout') {
    // No session to destroy — just confirm
    echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
}

else {
    echo json_encode(['error' => 'Invalid action.']);
}
?>