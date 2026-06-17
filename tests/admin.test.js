import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initAdmin } from '../js/admin.js';
import { openDatabase, seedDefaultCasts, getCasts, updateCast, deleteCast, addVisit, addNotePreset, getNotePresets } from '../js/db.js';
import { flushAsync } from './helpers.js';

function setupRoot() {
  document.body.innerHTML = `
    <div id="cast-list"></div>
    <input type="text" id="new-cast-name" />
    <button id="add-cast-button">追加</button>
    <div id="note-presets-list"></div>
    <input type="text" id="new-note-preset" />
    <button id="add-note-preset-button">追加</button>
    <div id="completion-list"></div>
  `;
  return document.body;
}

describe('initAdmin', () => {
  let dbCounter = 0;

  beforeEach(() => {
    document.body.innerHTML = '';
    dbCounter += 1;
  });

  it('renders seeded casts in the list', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;

    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ', 'リン']);
    db.close();

    await initAdmin(root, { dbName });

    const items = root.querySelectorAll('#cast-list li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.cast-name').textContent).toBe('マイ');
    expect(items[0].querySelector('.cast-working').checked).toBe(true);
  });

  it('adds a new cast', async () => {
    const root = setupRoot();
    await initAdmin(root, { dbName: `admin-test-db-${dbCounter}` });

    root.querySelector('#new-cast-name').value = 'サキ';
    root.querySelector('#add-cast-button').click();
    await flushAsync();

    const items = root.querySelectorAll('#cast-list li');
    const names = Array.from(items).map((li) => li.querySelector('.cast-name').textContent);
    expect(names).toContain('サキ');
  });

  it('toggles working flag', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ']);
    db.close();

    await initAdmin(root, { dbName });

    const checkbox = root.querySelector('.cast-working');
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    await flushAsync();

    const db2 = await openDatabase(dbName);
    const [cast] = await getCasts(db2, 'STORE');
    expect(cast.working).toBe(false);
    db2.close();
  });

  it('renames a cast via inline edit', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ']);
    db.close();

    await initAdmin(root, { dbName });

    const nameSpan = root.querySelector('.cast-name');
    nameSpan.click();

    const input = root.querySelector('.cast-name-input');
    input.value = 'マイコ';
    input.dispatchEvent(new Event('blur'));
    await flushAsync();

    const db2 = await openDatabase(dbName);
    const [cast] = await getCasts(db2, 'STORE');
    expect(cast.name).toBe('マイコ');
    db2.close();
  });

  it('deletes a cast after confirmation', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ', 'リン']);
    db.close();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await initAdmin(root, { dbName });

    const deleteButton = root.querySelector('.cast-delete');
    deleteButton.click();
    await flushAsync();

    const db2 = await openDatabase(dbName);
    const remaining = await getCasts(db2, 'STORE');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('リン');
    db2.close();
  });

  it('does not delete a cast when confirmation is cancelled', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ']);
    db.close();

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await initAdmin(root, { dbName });

    const deleteButton = root.querySelector('.cast-delete');
    deleteButton.click();
    await flushAsync();

    const db2 = await openDatabase(dbName);
    const remaining = await getCasts(db2, 'STORE');
    expect(remaining).toHaveLength(1);
    db2.close();
  });

  it('shows completed visits with group number, table number and completion time', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const today = new Date().toISOString().slice(0, 10);

    const db = await openDatabase(dbName);
    await addVisit(db, {
      store: 'STORE',
      date: today,
      groupId: 'g1',
      startTime: '20:00',
      table: '3',
      completed: true,
      completedAt: '21:30',
    });
    await addVisit(db, {
      store: 'STORE',
      date: today,
      groupId: 'g2',
      startTime: '20:30',
      table: '5',
      completed: false,
      completedAt: '',
    });
    db.close();

    await initAdmin(root, { dbName });

    const items = root.querySelectorAll('#completion-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('1組');
    expect(items[0].textContent).toContain('3');
    expect(items[0].textContent).toContain('21:30');
  });

  it('adds a note preset and displays it', async () => {
    const root = setupRoot();
    await initAdmin(root, { dbName: `admin-test-db-${dbCounter}` });

    root.querySelector('#new-note-preset').value = '常連';
    root.querySelector('#add-note-preset-button').click();
    await flushAsync();

    const items = root.querySelectorAll('#note-presets-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('常連');
  });

  it('deletes a note preset after confirmation', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const db = await openDatabase(dbName);
    await addNotePreset(db, { store: 'STORE', text: '常連' });
    db.close();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await initAdmin(root, { dbName });

    const deleteButton = root.querySelector('#note-presets-list button');
    deleteButton.click();
    await flushAsync();

    const db2 = await openDatabase(dbName);
    const remaining = await getNotePresets(db2, 'STORE');
    expect(remaining).toHaveLength(0);
    db2.close();
  });

  it('prevents adding more than 20 note presets', async () => {
    const root = setupRoot();
    const dbName = `admin-test-db-${dbCounter}`;
    const db = await openDatabase(dbName);

    for (let i = 0; i < 20; i += 1) {
      await addNotePreset(db, { store: 'STORE', text: `プリセット${i + 1}` });
    }
    db.close();

    vi.spyOn(window, 'alert');

    await initAdmin(root, { dbName });

    root.querySelector('#new-note-preset').value = '21番目';
    root.querySelector('#add-note-preset-button').click();
    await flushAsync();

    expect(window.alert).toHaveBeenCalledWith('プリセットは最大20個までです');

    const db2 = await openDatabase(dbName);
    const presets = await getNotePresets(db2, 'STORE');
    expect(presets).toHaveLength(20);
    db2.close();
  });
});
