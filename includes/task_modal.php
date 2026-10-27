<?php
// Modale de création / édition d'une tâche, partagée par le mur et le calendrier.
$palette = [
    '#FDE68A' => 'Jaune',
    '#FED7AA' => 'Pêche',
    '#FBCFE8' => 'Rose',
    '#DDD6FE' => 'Lavande',
    '#BFDBFE' => 'Bleu',
    '#BBF7D0' => 'Vert',
];
?>
<dialog class="task-dialog" id="task-dialog" aria-labelledby="task-dialog-label">
    <form class="task-form" id="task-form" method="dialog">
        <input type="hidden" name="id">
        <input type="hidden" name="pos_x">
        <input type="hidden" name="pos_y">

        <div class="task-sheet">
            <div class="task-sheet-head">
                <span id="task-dialog-label">Nouvelle note</span>
                <button type="button" class="icon-btn" data-close aria-label="Fermer">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <input class="task-title-input" name="title" placeholder="Titre" maxlength="255" autocomplete="off" required>
            <textarea class="task-desc-input" name="description" placeholder="Quelques détails…" rows="3"></textarea>
        </div>

        <div class="task-meta">
            <div class="field-row">
                <div class="field">
                    <label for="task-start">Début</label>
                    <input class="input" type="datetime-local" id="task-start" name="start" required>
                </div>
                <div class="field">
                    <label for="task-end">Fin <span style="font-weight:400;color:var(--text-3)">(optionnel)</span></label>
                    <input class="input" type="datetime-local" id="task-end" name="end">
                </div>
            </div>
            <div class="field">
                <span class="field-label">Couleur</span>
                <div class="swatches" role="radiogroup" aria-label="Couleur">
                    <?php foreach ($palette as $hex => $name): ?>
                        <label class="swatch" style="background: <?= $hex ?>" title="<?= $name ?>">
                            <input type="radio" name="color" value="<?= $hex ?>" aria-label="<?= $name ?>">
                        </label>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="task-footer">
            <button type="button" class="btn btn-danger" data-delete>
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>
                Supprimer
            </button>
            <span class="spacer"></span>
            <button type="button" class="btn btn-quiet" data-close>Annuler</button>
            <button type="submit" class="btn">Enregistrer <kbd class="hide-mobile" style="background:transparent;border-color:currentColor;color:inherit;opacity:.6">Ctrl ↵</kbd></button>
        </div>
    </form>
</dialog>

<div class="toasts" id="toasts" aria-live="polite"></div>
