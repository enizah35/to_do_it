<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: connexion.html');
    exit;
}

$pageTitle = 'Calendrier';
$activePage = 'calendrier.php';
?>
<!DOCTYPE html>
<html lang="fr">

<head>
    <?php require '../includes/head.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.15/locales/fr.global.min.js"></script>
    <script src="../assets/js/script.js?v=<?= filemtime(__DIR__ . '/../assets/js/script.js') ?>" defer></script>
</head>

<body>
    <div class="app">
        <?php require '../includes/sidebar.php'; ?>

        <main class="main">
            <header class="page-header">
                <div>
                    <h1 class="page-title">Calendrier</h1>
                    <p class="page-sub">Cliquez sur un jour pour planifier, glissez une tâche pour la déplacer.</p>
                </div>
                <div class="toolbar">
                    <button class="btn" type="button" data-new-note>
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        Nouvelle tâche
                    </button>
                </div>
            </header>

            <div class="calendar-layout">
                <section class="card calendar-card">
                    <div id="calendar"></div>
                </section>

                <aside class="card upcoming">
                    <h2>À venir</h2>
                    <ul class="upcoming-list" id="upcoming-list"></ul>
                </aside>
            </div>
        </main>
    </div>

    <?php require '../includes/task_modal.php'; ?>
</body>

</html>
