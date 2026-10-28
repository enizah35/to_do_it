/* ==========================================================================
   To Do It — script partagé (mur de post-its, calendrier, modale de tâche)
   ========================================================================== */

const PALETTE = ['#FDE68A', '#FED7AA', '#FBCFE8', '#DDD6FE', '#BFDBFE', '#BBF7D0'];
const DEFAULT_COLOR = PALETTE[0];

/* ==================== U T I L I T A I R E S ==================== */

function postJSON(url, data) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(response => response.json());
}

function postForm(url, fields) {
    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => body.append(key, value ?? ''));
    return fetch(url, { method: 'POST', body }).then(response => response.json());
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// "2026-10-28 09:00:00" ou Date -> Date locale
function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(String(value).replace(' ', 'T'));
}

// Formate la date JavaScript en format SQL (YYYY-MM-DD HH:MM:SS) en respectant le fuseau horaire local
function formatLocal(date) {
    let local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 19).replace('T', ' ');
}

// Valeur attendue par <input type="datetime-local">
function toInputValue(value) {
    const date = toDate(value);
    return date ? formatLocal(date).slice(0, 16).replace(' ', 'T') : '';
}

// Prochaine heure pleine, pratique comme date par défaut
function nextHour() {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return date;
}

// "Aujourd'hui · 18:00", "Demain · 09:00", "jeu. 30 oct."...
function formatWhen(value) {
    const date = toDate(value);
    if (!date) return '';

    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);

    let day;
    if (diff === 0) day = "Aujourd'hui";
    else if (diff === 1) day = 'Demain';
    else if (diff === -1) day = 'Hier';
    else if (diff > 1 && diff < 7) day = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    else day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    day = day.charAt(0).toUpperCase() + day.slice(1);

    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    return hasTime ? `${day} · ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : day;
}

function isTyping(target) {
    return target.closest('input, textarea, select, [contenteditable]');
}

/* ==================== T O A S T S ==================== */

function toast(message, { actionLabel, onAction, duration = 4000 } = {}) {
    const container = document.getElementById('toasts');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${escapeHtml(message)}</span>`;

    const dismiss = () => {
        el.classList.add('is-leaving');
        setTimeout(() => el.remove(), 200);
    };

    if (actionLabel) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = actionLabel;
        button.addEventListener('click', () => {
            onAction();
            dismiss();
        });
        el.appendChild(button);
    }

    container.appendChild(el);
    setTimeout(dismiss, duration);
}

/* ==================== S U P P R E S S I O N  (avec annulation) ==================== */

const pendingDeletes = new Map();

// Retire tout de suite de l'écran, mais n'appelle l'API qu'après le délai d'annulation
function deleteWithUndo(taskId, { label = 'Note supprimée', onRemove, onRestore }) {
    onRemove();
    const timer = setTimeout(() => {
        pendingDeletes.delete(taskId);
        deleteTask(taskId, () => {});
    }, 5000);
    pendingDeletes.set(taskId, timer);

    toast(label, {
        actionLabel: 'Annuler',
        duration: 5000,
        onAction: () => {
            clearTimeout(timer);
            pendingDeletes.delete(taskId);
            onRestore();
        }
    });
}

// Si l'utilisateur quitte la page pendant le délai, on envoie quand même les suppressions
window.addEventListener('pagehide', () => {
    pendingDeletes.forEach((timer, taskId) => {
        clearTimeout(timer);
        navigator.sendBeacon('api/delete_task.php', new Blob([JSON.stringify({ id_task: taskId })], { type: 'application/json' }));
    });
    pendingDeletes.clear();
});

// Fonction utilitaire pour supprimer une tâche via l'API
function deleteTask(taskId, onSuccess) {
    postJSON('api/delete_task.php', { id_task: taskId })
        .then(data => {
            if (data.success) {
                onSuccess();
            } else {
                toast(data.error || 'Erreur lors de la suppression.');
            }
        })
        .catch(() => toast('Connexion au serveur impossible.'));
}

// Fonction utilitaire pour mettre à jour les dates via l'API
function updateTaskDates(event) {
    let data = {
        id_task: event.id,
        start_date: formatLocal(event.start)
    };

    if (event.end) {
        data.end_date = formatLocal(event.end);
    }

    postJSON('api/update_task.php', data)
        .then(data => {
            if (!data.success) {
                toast(data.error || 'Erreur lors de la modification de la date.');
            }
        })
        .catch(() => toast('Connexion au serveur impossible.'));
}

/* ==================== M O D A L E   D E   T Â C H E ==================== */

const TaskDialog = (() => {
    const dialog = document.getElementById('task-dialog');
    if (!dialog) return null;

    const form = document.getElementById('task-form');
    const label = document.getElementById('task-dialog-label');
    const deleteBtn = dialog.querySelector('[data-delete]');
    let current = null; // { task, onSaved, onDelete }

    function setSheetColor(color) {
        dialog.style.setProperty('--note-bg', color);
    }

    function open({ task = {}, onSaved, onDelete, label: title }) {
        const isNew = !task.id_task;
        current = { task, onSaved, onDelete };

        form.reset();
        form.elements.id.value = task.id_task || '';
        form.elements.pos_x.value = task.pos_x ?? '';
        form.elements.pos_y.value = task.pos_y ?? '';
        form.elements.title.value = task.title || '';
        form.elements.description.value = task.description || '';
        form.elements.start.value = toInputValue(task.start_date || nextHour());
        form.elements.end.value = toInputValue(task.end_date);

        const color = (task.color || DEFAULT_COLOR).toUpperCase();
        const radio = [...form.elements.color].find(r => r.value === color);
        if (radio) radio.checked = true;
        setSheetColor(color);

        label.textContent = title || (isNew ? 'Nouvelle note' : 'Modifier la note');
        deleteBtn.hidden = isNew;

        dialog.showModal();
        const titleInput = form.elements.title;
        titleInput.focus();
        titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
    }

    function close() {
        dialog.close();
        current = null;
    }

    function save() {
        if (!form.reportValidity()) return;

        const { task, onSaved } = current;
        const values = {
            title: form.elements.title.value.trim(),
            description: form.elements.description.value.trim(),
            start_date: form.elements.start.value.replace('T', ' '),
            end_date: form.elements.end.value ? form.elements.end.value.replace('T', ' ') : null,
            // Les anciennes couleurs (hors palette) sont conservées si on n'en choisit pas d'autre
            color: form.querySelector('input[name="color"]:checked')?.value || task.color || DEFAULT_COLOR
        };

        if (!values.title) {
            form.elements.title.focus();
            return;
        }

        const request = task.id_task
            ? postForm('api/update_task.php', {
                'edit-id_task': task.id_task,
                'edit-title': values.title,
                'edit-description': values.description,
                'edit-start': values.start_date,
                'edit-end': values.end_date,
                'edit-color': values.color
            })
            : postForm('api/create_task.php', {
                'event-title': values.title,
                'event-description': values.description,
                'event-start': values.start_date,
                'event-end': values.end_date,
                'event-color': values.color,
                'pos_x': form.elements.pos_x.value,
                'pos_y': form.elements.pos_y.value
            });

        request
            .then(data => {
                if (!data.success) {
                    toast(data.error || "Erreur lors de l'enregistrement.");
                    return;
                }
                const saved = { ...task, ...values, id_task: task.id_task || data.id_task };
                close();
                onSaved && onSaved(saved, !task.id_task);
            })
            .catch(() => toast('Connexion au serveur impossible.'));
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        save();
    });

    form.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            save();
        }
        // Entrée dans le titre : on passe à la description plutôt que de valider
        if (e.key === 'Enter' && e.target === form.elements.title) {
            e.preventDefault();
            form.elements.description.focus();
        }
    });

    form.addEventListener('change', e => {
        if (e.target.name === 'color') setSheetColor(e.target.value);
    });

    dialog.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));

    // Clic en dehors de la carte = fermer
    dialog.addEventListener('click', e => {
        if (e.target === dialog) close();
    });

    deleteBtn.addEventListener('click', () => {
        const { task, onDelete } = current;
        close();
        onDelete && onDelete(task);
    });

    return { open, close, isOpen: () => dialog.open };
})();

/* ==================== M U R   D E   P O S T - I T S ==================== */

function initBoard() {
    const board = document.getElementById('board');
    if (!board) return;

    const NOTE_W = 230;
    const NOTE_H = 210;
    const GAP = 28;
    const PAD = 28;
    const isCompact = () => window.matchMedia('(max-width: 760px)').matches;

    const tasks = new Map();
    let zIndex = 10;

    const emptyState = document.getElementById('board-empty');
    const countLabel = document.getElementById('board-count');
    const search = document.getElementById('board-search');

    // Petite rotation stable par note, pour l'effet "vrai post-it"
    const rotationFor = id => ((id * 37) % 7 - 3) * 0.6;

    function noteHtml(task) {
        const dots = PALETTE.map(c =>
            `<button type="button" class="note-dot" style="background:${c}" data-color="${c}" aria-label="Couleur ${c}"></button>`
        ).join('');
        const when = formatWhen(task.start_date);
        return `
            <div class="note-title">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="note-body">${escapeHtml(task.description)}</div>` : '<div class="note-body"></div>'}
            <div class="note-foot">
                ${when ? `<span class="note-date"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${escapeHtml(when)}</span>` : '<span></span>'}
            </div>
            <div class="note-actions">
                ${dots}
                <button type="button" class="note-del" aria-label="Supprimer">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>
                </button>
            </div>`;
    }

    function renderNote(task, { animate = false } = {}) {
        let el = document.getElementById('task-' + task.id_task);
        if (!el) {
            el = document.createElement('article');
            el.className = 'note';
            el.id = 'task-' + task.id_task;
            el.dataset.id = task.id_task;
            el.tabIndex = 0;
            board.appendChild(el);
        }
        el.innerHTML = noteHtml(task);
        el.style.setProperty('--note-bg', task.color || DEFAULT_COLOR);
        el.style.setProperty('--r', rotationFor(task.id_task) + 'deg');
        el.style.left = task.pos_x + 'px';
        el.style.top = task.pos_y + 'px';
        if (animate) {
            el.classList.add('is-new');
            el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });
        }
        return el;
    }

    // L'ordre du DOM sert à la grille mobile : on suit la disposition du mur (haut → bas, gauche → droite)
    function orderByPosition() {
        const ROW = NOTE_H / 2;
        [...tasks.values()]
            .sort((a, b) => Math.floor(a.pos_y / ROW) - Math.floor(b.pos_y / ROW) || a.pos_x - b.pos_x)
            .forEach(task => {
                const el = document.getElementById('task-' + task.id_task);
                if (el) board.appendChild(el);
            });
    }

    function refreshMeta() {
        orderByPosition();
        const count = tasks.size;
        emptyState.hidden = count > 0;
        countLabel.textContent = count === 0
            ? 'Votre mur est vide pour l’instant.'
            : `${count} note${count > 1 ? 's' : ''} sur votre mur`;
        fitBoardHeight();
        applySearch();
    }

    function fitBoardHeight() {
        if (isCompact()) {
            board.style.height = '';
            return;
        }
        let bottom = 0;
        board.querySelectorAll('.note').forEach(el => {
            bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
        });
        board.style.height = bottom ? (bottom + 120) + 'px' : '';
    }

    function savePosition(task) {
        postJSON('api/update_position.php', { id_task: task.id_task, pos_x: task.pos_x, pos_y: task.pos_y })
            .catch(() => toast('Position non sauvegardée.'));
    }

    function columns() {
        return Math.max(1, Math.floor((board.clientWidth - PAD * 2 + GAP) / (NOTE_W + GAP)));
    }

    function slot(index) {
        const cols = columns();
        return {
            x: PAD + (index % cols) * (NOTE_W + GAP),
            y: PAD + Math.floor(index / cols) * (NOTE_H + GAP)
        };
    }

    // Premier emplacement de la grille qui ne chevauche aucune note existante
    function freeSlot(exceptId) {
        const others = [...tasks.values()].filter(t => t.id_task !== exceptId && !(t.pos_x === 0 && t.pos_y === 0));
        for (let i = 0; i < 500; i++) {
            const { x, y } = slot(i);
            const overlaps = others.some(t =>
                x < t.pos_x + NOTE_W && x + NOTE_W > t.pos_x && y < t.pos_y + NOTE_H && y + NOTE_H > t.pos_y
            );
            if (!overlaps) return { x, y };
        }
        return slot(0);
    }

    function openCreate(position) {
        const pos = position || freeSlot();
        TaskDialog.open({
            task: { pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) },
            onSaved: (task) => {
                task.pos_x = Number(task.pos_x) || 0;
                task.pos_y = Number(task.pos_y) || 0;
                tasks.set(task.id_task, task);
                const el = renderNote(task, { animate: true });
                el.style.zIndex = ++zIndex;
                refreshMeta();
                toast('Note ajoutée');
            }
        });
    }

    function openEdit(task) {
        TaskDialog.open({
            task,
            onSaved: (saved) => {
                tasks.set(saved.id_task, saved);
                renderNote(saved);
                refreshMeta();
            },
            onDelete: removeNote
        });
    }

    function removeNote(task) {
        const el = document.getElementById('task-' + task.id_task);
        deleteWithUndo(task.id_task, {
            onRemove: () => {
                tasks.delete(task.id_task);
                if (el) {
                    el.classList.add('is-leaving');
                    setTimeout(() => el.remove(), 250);
                }
                setTimeout(refreshMeta, 260);
            },
            onRestore: () => {
                tasks.set(task.id_task, task);
                renderNote(task, { animate: true });
                refreshMeta();
            }
        });
    }

    function changeColor(task, color) {
        task.color = color;
        document.getElementById('task-' + task.id_task)?.style.setProperty('--note-bg', color);
        postJSON('api/update_color.php', { id_task: task.id_task, color })
            .then(data => { if (!data.success) toast('Couleur non sauvegardée.'); });
    }

    function applySearch() {
        const query = search.value.trim().toLowerCase();
        board.querySelectorAll('.note').forEach(el => {
            const task = tasks.get(Number(el.dataset.id));
            const match = !query || !task || `${task.title} ${task.description || ''}`.toLowerCase().includes(query);
            el.classList.toggle('is-dimmed', !match);
        });
    }

    // Range toutes les notes en grille, par date
    function tidy() {
        const sorted = [...tasks.values()].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
        sorted.forEach((task, i) => {
            const { x, y } = slot(i);
            task.pos_x = x;
            task.pos_y = y;
            const el = document.getElementById('task-' + task.id_task);
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            savePosition(task);
        });
        setTimeout(fitBoardHeight, 460);
    }

    /* ---- Glisser-déposer (souris + tactile) ---- */
    let drag = null;

    board.addEventListener('pointerdown', e => {
        const el = e.target.closest('.note');
        if (!el || e.button !== 0 || e.target.closest('button')) return;
        drag = {
            el,
            task: tasks.get(Number(el.dataset.id)),
            startX: e.clientX,
            startY: e.clientY,
            originX: el.offsetLeft,
            originY: el.offsetTop,
            moved: false
        };
    });

    window.addEventListener('pointermove', e => {
        if (!drag || isCompact()) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        if (!drag.moved) {
            if (Math.hypot(dx, dy) < 5) return;
            drag.moved = true;
            drag.el.classList.add('is-dragging');
            drag.el.style.zIndex = ++zIndex;
            drag.el.setPointerCapture?.(e.pointerId);
        }

        const maxX = board.clientWidth - drag.el.offsetWidth;
        drag.el.style.left = Math.min(Math.max(0, drag.originX + dx), Math.max(0, maxX)) + 'px';
        drag.el.style.top = Math.max(0, drag.originY + dy) + 'px';
    });

    // Défilement tactile : le navigateur annule le pointeur, ce n'est ni un clic ni un glisser
    window.addEventListener('pointercancel', () => {
        drag?.el.classList.remove('is-dragging');
        drag = null;
    });

    window.addEventListener('pointerup', () => {
        if (!drag) return;
        const { el, task, moved } = drag;
        drag = null;

        if (moved) {
            el.classList.remove('is-dragging');
            task.pos_x = parseInt(el.style.left, 10);
            task.pos_y = parseInt(el.style.top, 10);
            savePosition(task);
            fitBoardHeight();
            orderByPosition();
        } else {
            openEdit(task);
        }
    });

    /* ---- Actions sur les notes ---- */
    board.addEventListener('click', e => {
        const el = e.target.closest('.note');
        if (!el) return;
        const task = tasks.get(Number(el.dataset.id));

        const dot = e.target.closest('.note-dot');
        if (dot) changeColor(task, dot.dataset.color);
        if (e.target.closest('.note-del')) removeNote(task);
    });

    board.addEventListener('keydown', e => {
        const el = e.target.closest('.note');
        if (!el || e.target !== el) return;
        const task = tasks.get(Number(el.dataset.id));
        if (e.key === 'Enter') openEdit(task);
        if (e.key === 'Delete' || e.key === 'Backspace') removeNote(task);
    });

    // Double-clic sur le mur = nouvelle note à cet endroit
    board.addEventListener('dblclick', e => {
        if (e.target.closest('.note, .empty-inner') || isCompact()) return;
        const rect = board.getBoundingClientRect();
        openCreate({
            x: Math.max(0, e.clientX - rect.left - NOTE_W / 2),
            y: Math.max(0, e.clientY - rect.top - 30)
        });
    });

    document.getElementById('new-note-btn').addEventListener('click', () => openCreate());
    document.querySelectorAll('[data-new-note]').forEach(btn => btn.addEventListener('click', () => openCreate()));
    document.getElementById('tidy-btn').addEventListener('click', tidy);
    search.addEventListener('input', applySearch);

    document.addEventListener('keydown', e => {
        if (TaskDialog.isOpen() || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            openCreate();
        }
        if (e.key === '/') {
            e.preventDefault();
            search.focus();
        }
    });

    window.addEventListener('resize', fitBoardHeight);

    /* ---- Premier affichage ---- */
    (window.TASKS || []).forEach(raw => {
        const task = {
            ...raw,
            id_task: Number(raw.id_task),
            pos_x: Number(raw.pos_x) || 0,
            pos_y: Number(raw.pos_y) || 0
        };
        tasks.set(task.id_task, task);
    });

    // Les notes jamais déplacées reçoivent une place libre, une fois pour toutes
    tasks.forEach(task => {
        if (task.pos_x === 0 && task.pos_y === 0) {
            const { x, y } = freeSlot(task.id_task);
            task.pos_x = x;
            task.pos_y = y;
            if (!isCompact()) savePosition(task);
        }
        renderNote(task);
    });

    refreshMeta();
}

/* ==================== C A L E N D R I E R ==================== */

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    const compact = window.matchMedia('(max-width: 760px)').matches;

    const taskFromEvent = event => ({
        id_task: Number(event.id),
        title: event.title,
        description: event.extendedProps.description || '',
        start_date: event.start,
        end_date: event.end,
        color: event.extendedProps.color || event.backgroundColor
    });

    const calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'fr',
        initialView: compact ? 'listWeek' : 'dayGridMonth',
        headerToolbar: compact
            ? { left: 'prev,next', center: 'title', right: 'today' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
        footerToolbar: compact ? { center: 'dayGridMonth,listWeek' } : false,
        buttonText: { today: "Aujourd'hui", month: 'Mois', week: 'Semaine', list: 'Liste' },
        height: 'auto',
        firstDay: 1,
        dayMaxEvents: 3,
        nowIndicator: true,
        eventDisplay: 'block',
        eventTextColor: '#2b2722',
        eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
        views: { dayGridMonth: { displayEventTime: false } },
        slotMinTime: '07:00:00',
        events: 'api/read_tasks.php',
        editable: true, // Permet le Drag & Drop et le redimensionnement

        // Quand on déplace / redimensionne une tâche
        eventDrop: info => updateTaskDates(info.event),
        eventResize: info => updateTaskDates(info.event),

        // Clic sur un jour vide = nouvelle tâche ce jour-là
        dateClick: info => {
            const start = new Date(info.date);
            if (info.allDay) start.setHours(9, 0, 0, 0);
            openCreate(start);
        },

        eventClick: info => openEdit(info.event),

        eventsSet: renderUpcoming
    });
    calendar.render();

    function openCreate(start) {
        TaskDialog.open({
            label: 'Nouvelle tâche',
            task: { start_date: start || nextHour() },
            onSaved: () => {
                calendar.refetchEvents();
                toast('Tâche ajoutée');
            }
        });
    }

    function openEdit(event) {
        TaskDialog.open({
            label: 'Modifier la tâche',
            task: taskFromEvent(event),
            onSaved: () => calendar.refetchEvents(),
            onDelete: task => deleteWithUndo(task.id_task, {
                label: 'Tâche supprimée',
                onRemove: () => event.remove(),
                onRestore: () => calendar.refetchEvents()
            })
        });
    }

    function renderUpcoming(events) {
        const list = document.getElementById('upcoming-list');
        if (!list) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const upcoming = events
            .filter(e => (e.end || e.start) >= now)
            .sort((a, b) => a.start - b.start)
            .slice(0, 8);

        if (!upcoming.length) {
            list.innerHTML = '<li class="upcoming-empty">Rien de prévu. Profitez-en ☕</li>';
            return;
        }

        list.innerHTML = '';
        upcoming.forEach(event => {
            const li = document.createElement('li');
            li.innerHTML = `
                <button type="button" class="upcoming-item">
                    <span class="upcoming-color" style="background:${escapeHtml(event.backgroundColor || DEFAULT_COLOR)}"></span>
                    <span>
                        <span class="upcoming-title">${escapeHtml(event.title)}</span><br>
                        <span class="upcoming-when">${escapeHtml(formatWhen(event.start))}</span>
                    </span>
                </button>`;
            li.querySelector('button').addEventListener('click', () => openEdit(event));
            list.appendChild(li);
        });
    }

    document.querySelectorAll('[data-new-note]').forEach(btn => btn.addEventListener('click', () => openCreate()));

    document.addEventListener('keydown', e => {
        if (TaskDialog.isOpen() || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            openCreate();
        }
    });
}

initBoard();
initCalendar();
