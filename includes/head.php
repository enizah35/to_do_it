<?php
// <head> commun aux pages connectées. Attend $pageTitle.
?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#eceef2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0e11" media="(prefers-color-scheme: dark)">
<title><?= htmlspecialchars($pageTitle) ?> · To Do It</title>
<link rel="icon" href="../assets/images/logo_todoit.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/style.css?v=<?= filemtime(__DIR__ . '/../assets/css/style.css') ?>">
