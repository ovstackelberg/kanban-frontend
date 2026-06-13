const API = window.API_URL || 'http://localhost:8001';

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchTasks() {
  const res = await fetch(`${API}/tasks`);
  return res.json();
}

async function createTask(title, description, status) {
  const res = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, status }),
  });
  return res.json();
}

async function updateTask(id, title, description, status, order) {
  const res = await fetch(`${API}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, status, order }),
  });
  return res.json();
}

async function deleteTask(id) {
  await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
}

// ── State ────────────────────────────────────────────────────────────────────

let tasks = [];          // all tasks from latest fetch
let activeTask = null;   // task currently open in the modal

// ── Render ───────────────────────────────────────────────────────────────────

async function loadAndRender() {
  tasks = await fetchTasks();
  renderBoard();
}

function renderBoard() {
  for (const status of ['todo', 'in_progress', 'done']) {
    const container = document.getElementById(`cards-${status}`);
    container.innerHTML = '';

    const columnTasks = tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.order - b.order);

    for (const task of columnTasks) {
      container.appendChild(createCardEl(task));
    }
  }
}

function createCardEl(task) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;
  card.innerHTML = `<div class="card-title">${escapeHtml(task.title)}</div>`;

  card.addEventListener('click', () => openDetailModal(task));
  card.addEventListener('dragstart', onDragStart);
  card.addEventListener('dragend', onDragEnd);

  return card;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Modal ────────────────────────────────────────────────────────────────────

const overlay      = document.getElementById('modal-overlay');
const modalDetail  = document.getElementById('modal-detail');
const modalCreate  = document.getElementById('modal-create');

function openDetailModal(task) {
  activeTask = task;

  modalDetail.classList.remove('hidden', 'editing');
  modalCreate.classList.add('hidden');

  document.getElementById('detail-title').value = task.title;
  document.getElementById('detail-status').value = task.status;
  document.getElementById('detail-description').value = task.description;
  document.getElementById('detail-description-rendered').innerHTML =
    task.description ? marked.parse(task.description) : '';

  overlay.classList.remove('hidden');
  document.getElementById('detail-title').focus();
}

function openCreateModal(status) {
  activeTask = null;

  modalDetail.classList.add('hidden');
  modalCreate.classList.remove('hidden');
  modalCreate.classList.remove('editing');

  document.getElementById('create-title').value = '';
  document.getElementById('create-description').value = '';
  document.getElementById('create-status').value = status;

  overlay.classList.remove('hidden');
  document.getElementById('create-title').focus();
}

function closeModal() {
  overlay.classList.add('hidden');
  activeTask = null;
  modalDetail.classList.remove('editing');
}

// Toggle description edit mode in detail view
document.getElementById('toggle-edit-btn').addEventListener('click', () => {
  modalDetail.classList.toggle('editing');

  const btn = document.getElementById('toggle-edit-btn');
  if (modalDetail.classList.contains('editing')) {
    btn.textContent = 'Preview';
  } else {
    // Update rendered preview from textarea content
    const desc = document.getElementById('detail-description').value;
    document.getElementById('detail-description-rendered').innerHTML =
      desc ? marked.parse(desc) : '';
    btn.textContent = 'Edit';
  }
});

// Click rendered description to enter edit mode
document.getElementById('detail-description-rendered').addEventListener('click', () => {
  modalDetail.classList.add('editing');
  document.getElementById('toggle-edit-btn').textContent = 'Preview';
  document.getElementById('detail-description').focus();
});

// Save existing task
document.getElementById('save-task-btn').addEventListener('click', async () => {
  if (!activeTask) return;
  const title = document.getElementById('detail-title').value.trim();
  if (!title) { alert('Title is required.'); return; }

  const status = document.getElementById('detail-status').value;
  const description = document.getElementById('detail-description').value;

  // If status changed, we need to set order to null so backend appends to end of new column
  const order = status === activeTask.status ? activeTask.order : null;

  await updateTask(activeTask.id, title, description, status, order);
  closeModal();
  await loadAndRender();
});

// Delete task
document.getElementById('delete-task-btn').addEventListener('click', async () => {
  if (!activeTask) return;
  if (!confirm(`Delete "${activeTask.title}"?`)) return;
  await deleteTask(activeTask.id);
  closeModal();
  await loadAndRender();
});

// Create task
document.getElementById('confirm-create-btn').addEventListener('click', async () => {
  const title = document.getElementById('create-title').value.trim();
  if (!title) { alert('Title is required.'); return; }
  const description = document.getElementById('create-description').value;
  const status = document.getElementById('create-status').value;

  await createTask(title, description, status);
  closeModal();
  await loadAndRender();
});

// Close on overlay click or X button
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.getElementById('modal-close').addEventListener('click', closeModal);

// Add Task buttons
document.querySelectorAll('.add-task-btn').forEach(btn => {
  btn.addEventListener('click', () => openCreateModal(btn.dataset.status));
});

// ── Drag & Drop ──────────────────────────────────────────────────────────────

let draggedId = null;
let placeholder = null;

function onDragStart(e) {
  draggedId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';

  placeholder = document.createElement('div');
  placeholder.className = 'card-placeholder';
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  placeholder?.remove();
  placeholder = null;
  document.querySelectorAll('.cards').forEach(c => c.classList.remove('drag-over'));
}

function setupDropZone(container) {
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.classList.add('drag-over');

    // Insert placeholder at the right position
    const afterEl = getDragAfterElement(container, e.clientY);
    if (afterEl == null) {
      container.appendChild(placeholder);
    } else {
      container.insertBefore(placeholder, afterEl);
    }
  });

  container.addEventListener('dragleave', e => {
    // Only remove highlight if leaving the container entirely
    if (!container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over');
      placeholder?.remove();
    }
  });

  container.addEventListener('drop', async e => {
    e.preventDefault();
    container.classList.remove('drag-over');

    const newStatus = container.closest('.column').dataset.status;
    const afterEl = getDragAfterElement(container, e.clientY);

    // Build the new ordered list of task ids for this column
    const columnCards = [...container.querySelectorAll('.card:not(.dragging)')];
    const afterIndex = afterEl ? columnCards.indexOf(afterEl) : columnCards.length;

    // Tasks currently in this column (excluding the dragged one)
    const columnTaskIds = columnCards.map(c => c.dataset.id);
    // Insert dragged task at the right index
    columnTaskIds.splice(afterIndex, 0, draggedId);

    // Find all tasks that need updating
    const updates = [];
    columnTaskIds.forEach((id, idx) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const newOrder = idx + 1;
      // Update if status or order changed
      if (task.status !== newStatus || task.order !== newOrder) {
        updates.push(updateTask(id, task.title, task.description, newStatus, newOrder));
      }
    });

    // Also re-index the source column if the task moved out of it
    const draggedTask = tasks.find(t => t.id === draggedId);
    if (draggedTask && draggedTask.status !== newStatus) {
      const sourceCards = [...document.getElementById(`cards-${draggedTask.status}`)
        .querySelectorAll('.card:not(.dragging)')];
      sourceCards.forEach((card, idx) => {
        const task = tasks.find(t => t.id === card.dataset.id);
        if (!task) return;
        const newOrder = idx + 1;
        if (task.order !== newOrder) {
          updates.push(updateTask(task.id, task.title, task.description, task.status, newOrder));
        }
      });
    }

    placeholder?.remove();
    await Promise.all(updates);
    await loadAndRender();
  });
}

/** Returns the card element that comes directly after the drag position, or null if at end. */
function getDragAfterElement(container, y) {
  const draggableCards = [...container.querySelectorAll('.card:not(.dragging)')];
  return draggableCards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element ?? null;
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

// Set up drop zones once — containers persist across re-renders
for (const status of ['todo', 'in_progress', 'done']) {
  setupDropZone(document.getElementById(`cards-${status}`));
}

loadAndRender();
