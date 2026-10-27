<?php
session_start();
require '../includes/config.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: connexion.html');
    exit;
}

$id_user = $_SESSION['user_id'];
$message = '';
$error = '';

// Traitement du formulaire de mise à jour
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $surname = trim($_POST['surname'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($name) || empty($surname) || empty($email)) {
        $error = "Les champs Nom, Prénom et Email sont obligatoires.";
    } else {
        try {
            if (!empty($password)) {
                // Mise à jour avec nouveau mot de passe
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE utilisateur SET name = ?, surname = ?, email = ?, password = ? WHERE id_user = ?");
                $stmt->execute([$name, $surname, $email, $hashed_password, $id_user]);
            } else {
                // Mise à jour sans toucher au mot de passe
                $stmt = $pdo->prepare("UPDATE utilisateur SET name = ?, surname = ?, email = ? WHERE id_user = ?");
                $stmt->execute([$name, $surname, $email, $id_user]);
            }

            // Mise à jour de la session si le nom a changé
            $_SESSION['user_name'] = $name;
            $message = "Vos informations ont été mises à jour.";
        } catch (PDOException $e) {
            // Gestion de l'erreur d'email en doublon
            if ($e->getCode() == 23505) {
                $error = "Cet email est déjà utilisé par un autre compte.";
            } else {
                $error = "Erreur lors de la mise à jour : " . $e->getMessage();
            }
        }
    }
}

// Récupération des données actuelles pour pré-remplir le formulaire
try {
    $stmt = $pdo->prepare("SELECT name, surname, email FROM utilisateur WHERE id_user = ?");
    $stmt->execute([$id_user]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $error = "Erreur de récupération des données.";
}

$pageTitle = 'Paramètres';
$activePage = 'setting.php';
?>
<!DOCTYPE html>
<html lang="fr">

<head>
    <?php require '../includes/head.php'; ?>
</head>

<body>
    <div class="app">
        <?php require '../includes/sidebar.php'; ?>

        <main class="main">
            <header class="page-header">
                <div>
                    <h1 class="page-title">Paramètres</h1>
                    <p class="page-sub">Gérez les informations de votre compte.</p>
                </div>
            </header>

            <div class="settings-wrap">
                <section class="card settings-card">
                    <h2>Profil</h2>
                    <p class="hint">Ces informations ne sont visibles que par vous.</p>

                    <form class="settings-form" method="POST" action="setting.php">
                        <?php if ($message): ?>
                            <div class="alert alert-success"><?= htmlspecialchars($message) ?></div>
                        <?php endif; ?>
                        <?php if ($error): ?>
                            <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
                        <?php endif; ?>

                        <div class="field-row">
                            <div class="field">
                                <label for="name">Prénom</label>
                                <input class="input" type="text" id="name" name="name" value="<?= htmlspecialchars($user['name'] ?? '') ?>" required>
                            </div>
                            <div class="field">
                                <label for="surname">Nom</label>
                                <input class="input" type="text" id="surname" name="surname" value="<?= htmlspecialchars($user['surname'] ?? '') ?>" required>
                            </div>
                        </div>
                        <div class="field">
                            <label for="email">Adresse e-mail</label>
                            <input class="input" type="email" id="email" name="email" value="<?= htmlspecialchars($user['email'] ?? '') ?>" required>
                        </div>

                        <div class="divider"></div>

                        <div class="field">
                            <label for="password">Nouveau mot de passe</label>
                            <input class="input" type="password" id="password" name="password" placeholder="Laisser vide pour ne pas changer" autocomplete="new-password">
                        </div>

                        <div class="settings-actions">
                            <button type="submit" class="btn">Enregistrer</button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    </div>
</body>

</html>
