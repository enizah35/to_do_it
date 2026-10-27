<?php
session_start();
require '../../includes/config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Non authentifié']);
    exit;
}

// L'API peut recevoir du JSON brut (Drag & Drop) OU du vrai POST multipart (Formulaire Modal)
$contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';

if (strpos($contentType, 'application/json') !== false) {
    // Cas 1: Drag & Drop (Dates uniquement)
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($data && isset($data['id_task'], $data['start_date'])) {
        $id_task = $data['id_task'];
        $start = $data['start_date'];
        $end = isset($data['end_date']) && !empty($data['end_date']) ? $data['end_date'] : null;
        $id_user = $_SESSION['user_id'];

        try {
            $stmt = $pdo->prepare("UPDATE task SET start_date = ?, end_date = ? WHERE id_task = ? AND id_user = ?");
            $stmt->execute([$start, $end, $id_task, $id_user]);
            echo json_encode(['success' => true]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'error' => 'Erreur serveur SQL : ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Données dates invalides.']);
    }

} else {
    // Cas 2: Formulaire d'édition Modal (Titre, Desc, Couleur, etc.)
    if (isset($_POST['edit-id_task'], $_POST['edit-title'], $_POST['edit-start'])) {
        $id_task = $_POST['edit-id_task'];
        $title = trim($_POST['edit-title']);
        $description = isset($_POST['edit-description']) ? trim($_POST['edit-description']) : '';
        $start = trim($_POST['edit-start']);
        $end = isset($_POST['edit-end']) && !empty(trim($_POST['edit-end'])) ? trim($_POST['edit-end']) : null;
        $color = isset($_POST['edit-color']) ? $_POST['edit-color'] : '#FDE68A';
        $id_user = $_SESSION['user_id'];

        if (!preg_match('/^#[a-f0-9]{6}$/i', $color)) {
            $color = '#FDE68A';
        }

        if (empty($title) || empty($start)) {
            echo json_encode(['success' => false, 'error' => 'Le titre et la date de début sont obligatoires.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE task SET title = ?, description = ?, start_date = ?, end_date = ?, color = ? WHERE id_task = ? AND id_user = ?");
            $stmt->execute([$title, $description, $start, $end, $color, $id_task, $id_user]);
            echo json_encode(['success' => true]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'error' => 'Erreur serveur SQL : ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Données de formulaire invalides.']);
    }
}
?>
