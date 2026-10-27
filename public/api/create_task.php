<?php
session_start();
require '../../includes/config.php';

header('Content-Type: application/json');

// Vérification de sécurité
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Non authentifié']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = isset($_POST['event-title']) ? trim($_POST['event-title']) : '';
    $description = isset($_POST['event-description']) ? trim($_POST['event-description']) : '';
    $start = isset($_POST['event-start']) ? trim($_POST['event-start']) : '';
    $end = isset($_POST['event-end']) ? trim($_POST['event-end']) : null;
    $id_user = $_SESSION['user_id'];

    $color = isset($_POST['event-color']) ? $_POST['event-color'] : '#FDE68A';
    $pos_x = isset($_POST['pos_x']) ? (int)$_POST['pos_x'] : 0;
    $pos_y = isset($_POST['pos_y']) ? (int)$_POST['pos_y'] : 0;

    if (!preg_match('/^#[a-f0-9]{6}$/i', $color)) {
        $color = '#FDE68A';
    }

    if (empty($title) || empty($start)) {
        echo json_encode(['success' => false, 'error' => 'Le titre et la date de début sont obligatoires.']);
        exit;
    }

    if (empty($end)) {
        $end = null;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO task (id_user, title, description, start_date, end_date, color, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id_task");
        $stmt->execute([$id_user, $title, $description, $start, $end, $color, $pos_x, $pos_y]);
        echo json_encode(['success' => true, 'id_task' => $stmt->fetchColumn()]);
    } catch(PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Erreur serveur SQL : ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée.']);
}
?>
