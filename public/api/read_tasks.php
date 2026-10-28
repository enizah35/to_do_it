<?php
session_start();
require '../../includes/config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit;
}

$id_user = $_SESSION['user_id'];

try {
    // Les alias 'start' et 'end' sont exigés par la structure standard de FullCalendar
    $stmt = $pdo->prepare("SELECT id_task as id, title, description, start_date as start, end_date as end, color FROM task WHERE id_user = ?");
    $stmt->execute([$id_user]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($tasks as &$task) {
        // On retire les fins vides pour que le calendrier ne buggue pas sur les événements d'un jour
        if ($task['end'] === null) {
            unset($task['end']);
        }
        // Couleur du post-it reprise dans le calendrier
        $task['backgroundColor'] = $task['color'];
        $task['borderColor'] = $task['color'];
    }

    echo json_encode($tasks);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Erreur serveur SQL']);
}
?>
