<?php
// Navigation latérale (barre d'onglets sur mobile). Attend $activePage.
$navItems = [
    'tab_bord.php'    => ['Mon mur', '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'],
    'calendrier.php'  => ['Calendrier', '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v3M16 2.5v3"/>'],
    'setting.php'     => ['Paramètres', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
];
$userName = $_SESSION['user_name'] ?? '';
?>
<aside class="sidebar">
    <a class="brand" href="tab_bord.php">
        <img class="logo-img" src="../assets/images/logo_todoit.png" alt="">
        <span>To Do It</span>
    </a>
    <nav class="nav" aria-label="Navigation principale">
        <?php foreach ($navItems as $href => [$label, $icon]): ?>
            <a class="nav-link" href="<?= $href ?>" <?= $activePage === $href ? 'aria-current="page"' : '' ?>>
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><?= $icon ?></svg>
                <span><?= $label ?></span>
            </a>
        <?php endforeach; ?>
    </nav>
    <div class="sidebar-footer">
        <span class="avatar" aria-hidden="true"><?= htmlspecialchars(mb_strtoupper(mb_substr($userName, 0, 1))) ?></span>
        <span class="sidebar-user"><?= htmlspecialchars($userName) ?></span>
        <a class="icon-btn" href="deconnexion.php" title="Se déconnecter" aria-label="Se déconnecter">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>
        </a>
    </div>
</aside>
