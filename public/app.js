(function() {
  const api = {
    async getLists() {
      const res = await fetch('/api/lists');
      return res.json();
    },
    async createList(name, color) {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      return res.json();
    },
    async deleteList(id) {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' });
    },
    async getListItems(listId) {
      const res = await fetch(`/api/lists/${listId}/items`);
      return res.json();
    },
    async addItem(listId, text) {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return res.json();
    },
    async toggleItem(id) {
      const res = await fetch(`/api/items/${id}/toggle`, { method: 'POST' });
      return res.json();
    },
    async deleteItem(id) {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
    },
    async getStats() {
      const res = await fetch('/api/stats');
      return res.json();
    },
    async getProgress(listId) {
      const res = await fetch(`/api/lists/${listId}/progress`);
      return res.json();
    }
  };

  let lists = [];
  let listItems = {};
  let selectedColor = '#6366f1';

  // DOM Elements
  const listsContainer = document.getElementById('lists-container');
  const addListForm = document.getElementById('add-list-form');
  const addListContainer = document.getElementById('add-list-container');
  const listNameInput = document.getElementById('list-name-input');
  const btnCreateList = document.getElementById('btn-create-list');
  const btnShowAddList = document.getElementById('btn-show-add-list');
  const btnCancelList = document.getElementById('btn-cancel-list');
  const celebrationOverlay = document.getElementById('celebration-overlay');
  const streakCount = document.getElementById('streak-count');
  const totalCompleted = document.getElementById('total-completed');
  const globalPercent = document.getElementById('global-percent');

  // Color picker
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
    });
  });

  // Add List button
  btnShowAddList.addEventListener('click', () => {
    addListForm.classList.remove('hidden');
    addListContainer.classList.add('hidden');
    listNameInput.value = '';
    listNameInput.focus();
  });

  btnCancelList.addEventListener('click', hideAddListForm);

  function hideAddListForm() {
    addListForm.classList.add('hidden');
    addListContainer.classList.remove('hidden');
  }

  // Create list
  btnCreateList.addEventListener('click', createList);
  listNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createList();
  });

  async function createList() {
    const name = listNameInput.value.trim();
    if (!name) {
      listNameInput.style.borderColor = '#ef4444';
      setTimeout(() => listNameInput.style.borderColor = '', 1000);
      return;
    }

    const list = await api.createList(name, selectedColor);
    lists.unshift(list);
    listItems[list.id] = [];

    hideAddListForm();
    renderLists();
  }

  // Delete list
  async function handleDeleteList(e, listId) {
    e.stopPropagation();
    if (!confirm('Delete this list?')) return;

    await api.deleteList(listId);
    lists = lists.filter(l => l.id !== listId);
    delete listItems[listId];

    renderLists();
  }

  // Add item
  async function handleAddItem(e, listId) {
    e.preventDefault();
    const input = document.getElementById(`item-input-${listId}`);
    const text = input.value.trim();
    if (!text) return;

    const item = await api.addItem(listId, text);
    if (!listItems[listId]) listItems[listId] = [];
    listItems[listId].push(item);

    input.value = '';
    renderListItems(listId);
  }

  // Toggle item
  async function handleToggleItem(e, itemId, listId) {
    if (e.target.closest('.btn-delete-item')) return;

    const itemEl = e.currentTarget;
    itemEl.classList.add('checking');

    const item = await api.toggleItem(itemId);

    setTimeout(() => itemEl.classList.remove('checking'), 400);

    if (!listItems[listId]) listItems[listId] = [];
    const idx = listItems[listId].findIndex(i => i.id === itemId);
    if (idx !== -1) {
      listItems[listId][idx] = item;
    }

    renderListItems(listId);
    updateStats();

    if (item.completed) {
      const rect = itemEl.getBoundingClientRect();
      confetti.burst(100, rect.left + rect.width / 2, rect.top);
      setTimeout(() => confetti.burst(80, rect.left + rect.width / 2, rect.top), 200);
      setTimeout(() => confetti.rain(60), 100);
    }

    // Check if list is complete
    const progress = await api.getProgress(listId);
    if (progress.percent === 100 && progress.total > 0) {
      showCelebration();
    }
  }

  // Delete item
  async function handleDeleteItem(e, itemId) {
    e.stopPropagation();
    await api.deleteItem(itemId);

    const btn = e.target.closest('.btn-delete-item');
    const listId = btn ? parseInt(btn.dataset.listId) : parseInt(e.currentTarget.dataset.listId);
    if (listItems[listId]) {
      listItems[listId] = listItems[listId].filter(i => i.id !== itemId);
    }

    renderListItems(listId);
  }

  // Celebration
  function showCelebration() {
    celebrationOverlay.classList.remove('hidden');
    confetti.rain(200);

    setTimeout(() => {
      celebrationOverlay.classList.add('hidden');
    }, 3001);
  }

  celebrationOverlay.addEventListener('click', () => {
    celebrationOverlay.classList.add('hidden');
  });

  // Render lists
  function renderLists() {
    if (lists.length === 0) {
      listsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h2>No lists yet!</h2>
          <p>Create your first checklist to get started</p>
        </div>
      `;
      return;
    }

    listsContainer.innerHTML = lists.map(list => {
      const items = listItems[list.id] || [];
      const completed = items.filter(i => i.completed).length;
      const total = items.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return `
        <div class="list-card" style="--list-color: ${list.color}">
          <div class="list-header">
            <div style="flex: 1;">
              <div class="list-title">${escapeHtml(list.name)}</div>
              <div class="list-progress">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                </div>
                <span class="progress-text">${percent}%</span>
              </div>
            </div>
            <button class="btn-delete-list" data-list-id="${list.id}" title="Delete list">&times;</button>
          </div>
          <div class="items-container">
            <div class="items-list" id="items-list-${list.id}">
              ${items.map(item => renderItem(item, list.color)).join('')}
            </div>
            <div class="add-item-container">
              <form class="add-item-form" data-list-id="${list.id}">
                <input type="text" class="add-item-input" id="item-input-${list.id}" placeholder="Add an item..." maxlength="100">
                <button type="submit" class="btn-add-item" style="--list-color: ${list.color}; background: ${list.color};">+</button>
              </form>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners
    listsContainer.querySelectorAll('.btn-delete-list').forEach(btn => {
      btn.addEventListener('click', (e) => handleDeleteList(e, parseInt(btn.dataset.listId)));
    });

    listsContainer.querySelectorAll('.add-item-form').forEach(form => {
      form.addEventListener('submit', (e) => handleAddItem(e, parseInt(form.dataset.listId)));
    });

    listsContainer.querySelectorAll('.item').forEach(item => {
      item.addEventListener('click', (e) => {
        const itemId = parseInt(item.dataset.itemId);
        const listId = parseInt(item.dataset.listId);
        handleToggleItem(e, itemId, listId);
      });
    });

    listsContainer.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', (e) => handleDeleteItem(e, parseInt(btn.dataset.itemId)));
    });
  }

  function renderListItems(listId) {
    const itemsList = document.getElementById(`items-list-${listId}`);
    if (!itemsList) return;

    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const items = listItems[listId] || [];
    itemsList.innerHTML = items.map(item => renderItem(item, list.color)).join('');

    itemsList.querySelectorAll('.item').forEach(item => {
      item.addEventListener('click', (e) => {
        const itemId = parseInt(item.dataset.itemId);
        handleToggleItem(e, itemId, listId);
      });
    });

    itemsList.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', (e) => handleDeleteItem(e, parseInt(btn.dataset.itemId)));
    });

    // Update progress
    const card = itemsList.closest('.list-card');
    if (card) {
      const completed = items.filter(i => i.completed).length;
      const total = items.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const progressBar = card.querySelector('.progress-bar-fill');
      const progressText = card.querySelector('.progress-text');
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressText) progressText.textContent = `${percent}%`;
    }
  }

  function renderItem(item, color) {
    return `
      <div class="item ${item.completed ? 'completed' : ''}" data-item-id="${item.id}" data-list-id="${item.list_id}" style="--list-color: ${color}">
        <div class="item-checkbox"></div>
        <span class="item-text">${escapeHtml(item.text)}</span>
        <button class="btn-delete-item" data-item-id="${item.id}" data-list-id="${item.list_id}" title="Delete item">&times;</button>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Update stats
  async function updateStats() {
    const stats = await api.getStats();
    streakCount.textContent = stats.streak || 0;
    totalCompleted.textContent = stats.total_completed || 0;

    if (stats.total_items && stats.completed_items) {
      const percent = stats.total_items > 0
        ? Math.round((stats.completed_items / stats.total_items) * 100)
        : 0;
      globalPercent.textContent = `${percent}%`;
    }
  }

  // Initialize
  async function init() {
    lists = await api.getLists();
    for (const list of lists) {
      listItems[list.id] = await api.getListItems(list.id);
    }
    renderLists();
    updateStats();

    // Refresh stats periodically
    setInterval(updateStats, 10000);
  }

  init();
})();
