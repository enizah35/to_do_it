<?php
session_start();
require '../includes/config.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: connexion.html');
    exit;
}

$id_user = $_SESSION['user_id'];
$tasks = [];
try {
    $stmt = $pdo->prepare("SELECT id_task, title, description, start_date, end_date, pos_x, pos_y, color FROM task WHERE id_user = ? ORDER BY start_date ASC");
    $stmt->execute([$id_user]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $error = "Erreur lors de la récupération des tâches.";
}

$pageTitle = 'Mon mur';
$activePage = 'tab_bord.php';
$hour = (int)date('G');
$greeting = $hour < 5 || $hour >= 18 ? 'Bonsoir' : 'Bonjour';
?>
<!DOCTYPE html>
<html lang="fr">

<head>
    <?php require '../includes/head.php'; ?>
    <script src="../assets/js/script.js?v=<?= filemtime(__DIR__ . '/../assets/js/script.js') ?>" defer></script>
</head>

<body>
    <div class="app">
        <?php require '../includes/sidebar.php'; ?>

        <main class="main">
            <header class="page-header">
                <div>
                    <h1 class="page-title"><?= $greeting ?>, <?= htmlspecialchars($_SESSION['user_name']) ?></h1>
                    <p class="page-sub" id="board-count"></p>
                </div>
                <div class="toolbar">
                    <label class="search">
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                        <input class="input" type="search" id="board-search" placeholder="Rechercher…" aria-label="Rechercher une note">
                    </label>
                    <button class="btn btn-ghost hide-mobile" id="tidy-btn" type="button" title="Aligner toutes les notes">
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
                        Ranger
                    </button>
                    <button class="btn" id="new-note-btn" type="button">
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        Nouvelle note
                    </button>
                </div>
            </header>

            <?php if (isset($error)): ?>
                <p class="alert alert-error" style="margin: 0 36px 16px"><?= $error ?></p>
            <?php endif; ?>

            <div class="board-wrap">
                <div class="board dotted" id="board">
                    <div class="empty" id="board-empty" hidden>
                        <div class="empty-inner">
                            <div class="empty-art" aria-hidden="true"><span></span><span></span><span></span></div>
                            <h2>Un mur tout neuf</h2>
                            <p>Ajoutez votre première note, puis déplacez-la où vous voulez.</p>
                            <button class="btn" type="button" data-new-note>Créer une note</button>
                        </div>
                    </div>
                    <p class="board-hint">Double-cliquez pour ajouter une note · <kbd>N</kbd></p>
                </div>
            </div>
        </main>
    </div>

    <?php require '../includes/task_modal.php'; ?>

    <script>
        window.TASKS = <?= json_encode($tasks, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
</body>

</html>
