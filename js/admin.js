import { openDatabase, getCasts, addCast, updateCast, deleteCast, getVisitsByStoreAndDate, addNotePreset, getNotePresets, deleteNotePreset } from './db.js';
import { assignGroupNumbers } from './models.js';

const STORE_NAME = 'STORE';

export function renderCastList(container, casts, { onToggleWorking, onRename, onDelete } = {}) {
  container.innerHTML = '';
  const list = document.createElement('ul');
  list.className = 'cast-list';

  for (const cast of casts) {
    const item = document.createElement('li');
    item.dataset.castId = String(cast.id);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'cast-name';
    nameSpan.textContent = cast.name;
    nameSpan.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cast-name-input';
      input.value = cast.name;
      nameSpan.replaceWith(input);
      input.focus();

      const commit = () => {
        const newName = input.value.trim();
        if (newName && newName !== cast.name) {
          onRename(cast, newName);
        } else {
          input.replaceWith(nameSpan);
        }
      };

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          input.blur();
        }
      });
    });
    item.appendChild(nameSpan);

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'cast-working';
    checkbox.checked = cast.working;
    checkbox.addEventListener('change', () => {
      onToggleWorking(cast, checkbox.checked);
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('出勤'));
    item.appendChild(label);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'cast-delete';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
      onDelete(cast);
    });
    item.appendChild(deleteButton);

    list.appendChild(item);
  }

  container.appendChild(list);
}

export function renderCompletionList(container, visits) {
  container.innerHTML = '';

  const groupNumbers = assignGroupNumbers(visits);
  const completed = visits.filter((visit) => visit.completed);

  const list = document.createElement('ul');
  list.className = 'completion-list';

  for (const visit of completed) {
    const item = document.createElement('li');
    item.textContent = `${groupNumbers.get(visit.groupId)}組 卓${visit.table} 完了:${visit.completedAt}`;
    list.appendChild(item);
  }

  container.appendChild(list);
}

export function renderNotePresetList(container, presets, { onDelete } = {}) {
  container.innerHTML = '';
  const list = document.createElement('ul');
  list.className = 'note-presets-list';

  for (const preset of presets) {
    const item = document.createElement('li');
    item.dataset.presetId = String(preset.id);

    const text = document.createElement('span');
    text.textContent = preset.text;
    item.appendChild(text);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
      onDelete(preset);
    });
    item.appendChild(deleteButton);

    list.appendChild(item);
  }

  container.appendChild(list);
}

export async function initAdmin(root, { dbName = 'list-app-db' } = {}) {
  const db = await openDatabase(dbName);
  const listContainer = root.querySelector('#cast-list');
  const nameInput = root.querySelector('#new-cast-name');
  const addButton = root.querySelector('#add-cast-button');
  const completionContainer = root.querySelector('#completion-list');
  const presetsContainer = root.querySelector('#note-presets-list');
  const presetInput = root.querySelector('#new-note-preset');
  const addPresetButton = root.querySelector('#add-note-preset-button');
  const today = new Date().toISOString().slice(0, 10);

  async function refresh() {
    const casts = await getCasts(db, STORE_NAME);
    renderCastList(listContainer, casts, {
      onToggleWorking: async (cast, working) => {
        await updateCast(db, { ...cast, working });
        await refresh();
      },
      onRename: async (cast, newName) => {
        await updateCast(db, { ...cast, name: newName });
        await refresh();
      },
      onDelete: async (cast) => {
        if (!confirm(`「${cast.name}」を削除しますか？`)) {
          return;
        }
        await deleteCast(db, cast.id);
        await refresh();
      },
    });
  }

  async function refreshCompletionList() {
    const visits = await getVisitsByStoreAndDate(db, STORE_NAME, today);
    renderCompletionList(completionContainer, visits);
  }

  async function refreshPresets() {
    const presets = await getNotePresets(db, STORE_NAME);
    renderNotePresetList(presetsContainer, presets, {
      onDelete: async (preset) => {
        if (!confirm(`「${preset.text}」を削除しますか？`)) {
          return;
        }
        await deleteNotePreset(db, preset.id);
        await refreshPresets();
      },
    });
  }

  addButton.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      return;
    }
    await addCast(db, { store: STORE_NAME, name, working: true });
    nameInput.value = '';
    await refresh();
  });

  addPresetButton.addEventListener('click', async () => {
    const text = presetInput.value.trim();
    if (!text) {
      return;
    }
    const presets = await getNotePresets(db, STORE_NAME);
    if (presets.length >= 20) {
      alert('プリセットは最大20個までです');
      return;
    }
    await addNotePreset(db, { store: STORE_NAME, text });
    presetInput.value = '';
    await refreshPresets();
  });

  await refresh();
  await refreshCompletionList();
  await refreshPresets();
}
