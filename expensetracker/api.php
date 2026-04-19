<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ─── MySQL Database Connection ───────────────
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

// ─── Auto-create tables ───────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

// ─── Get user_id from request ─────────────────
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' || $method === 'PUT') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
} else {
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
}

if (!$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please log in.']);
    exit();
}

$action = $_GET['action'] ?? '';

switch ($method) {

    // ─── GET: List or Summary ─────────────────
    case 'GET':
        if ($action === 'summary') {
            $month = $_GET['month'] ?? date('Y-m');

            $stmt = $pdo->prepare("
                SELECT category, SUM(amount) AS total, COUNT(*) AS count
                FROM expenses
                WHERE user_id = :user_id AND DATE_FORMAT(date, '%Y-%m') = :month
                GROUP BY category ORDER BY total DESC
            ");
            $stmt->execute([':user_id' => $user_id, ':month' => $month]);
            $categories = $stmt->fetchAll();

            $stmt2 = $pdo->prepare("
                SELECT SUM(amount) AS total FROM expenses
                WHERE user_id = :user_id AND DATE_FORMAT(date, '%Y-%m') = :month
            ");
            $stmt2->execute([':user_id' => $user_id, ':month' => $month]);
            $totalRow = $stmt2->fetch();

            echo json_encode(['categories' => $categories, 'total' => $totalRow['total'] ?? 0]);

        } else {
            $month    = $_GET['month'] ?? '';
            $category = $_GET['category'] ?? '';
            $query    = "SELECT * FROM expenses WHERE user_id = :user_id";
            $params   = [':user_id' => $user_id];

            if ($month) {
                $query .= " AND DATE_FORMAT(date, '%Y-%m') = :month";
                $params[':month'] = $month;
            }
            if ($category && $category !== 'All') {
                $query .= " AND category = :category";
                $params[':category'] = $category;
            }
            $query .= " ORDER BY date DESC, created_at DESC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll());
        }
        break;

    // ─── POST: Add Expense ────────────────────
    case 'POST':
        if (!$data || !isset($data['title'], $data['amount'], $data['category'], $data['date'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            break;
        }

        $stmt = $pdo->prepare("
            INSERT INTO expenses (user_id, title, amount, category, date, note)
            VALUES (:user_id, :title, :amount, :category, :date, :note)
        ");
        $stmt->execute([
            ':user_id'  => $user_id,
            ':title'    => trim($data['title']),
            ':amount'   => (float) $data['amount'],
            ':category' => $data['category'],
            ':date'     => $data['date'],
            ':note'     => $data['note'] ?? ''
        ]);

        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // ─── PUT: Edit Expense ────────────────────
    case 'PUT':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Valid ID required']);
            break;
        }

        if (!$data || !isset($data['title'], $data['amount'], $data['category'], $data['date'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            break;
        }

        $stmt = $pdo->prepare("
            UPDATE expenses
            SET title = :title, amount = :amount, category = :category, date = :date, note = :note
            WHERE id = :id AND user_id = :user_id
        ");
        $stmt->execute([
            ':id'       => $id,
            ':user_id'  => $user_id,
            ':title'    => trim($data['title']),
            ':amount'   => (float) $data['amount'],
            ':category' => $data['category'],
            ':date'     => $data['date'],
            ':note'     => $data['note'] ?? ''
        ]);

        echo json_encode(['success' => true]);
        break;

    // ─── DELETE: Remove Expense ───────────────
    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Valid ID required']);
            break;
        }

        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = :id AND user_id = :user_id");
        $stmt->execute([':id' => $id, ':user_id' => $user_id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>