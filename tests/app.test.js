import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initApp } from '../js/app.js';
import { openDatabase, seedDefaultCasts, getCasts, updateCast } from '../js/db.js';
import { addMinutesToTime } from '../js/models.js';
import { flushAsync } from './helpers.js';

function setupRoot() {
  document.body.innerHTML = `
    <button id="new-visit-button">新規来店</button>
    <div id="working-casts"></div>
    <div id="grid"></div>
    <div id="totals"></div>
  `;
  return document.body;
}

function findConfirmButton(modal) {
  return Array.from(modal.querySelectorAll('button')).find(
    (b) => b.textContent === '来店登録'
  );
}

describe('initApp', () => {
  let dbCounter = 0;

  beforeEach(() => {
    document.body.innerHTML = '';
    dbCounter += 1;
  });

  it('renders an empty grid and zeroed totals on first load', async () => {
    const root = setupRoot();

    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(0);
    expect(root.querySelector('#totals').textContent).toContain('入客数: 0');
  });

  it('creates one row per person when a new visit is registered', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();

    const modal = document.querySelector('.new-visit-modal');
    modal.querySelector('[data-size="3"]').click();
    findConfirmButton(modal).click();

    await flushAsync();

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(3);
  });

  it('marks a row completed and updates totals when its complete button is clicked', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    root.querySelector('[data-field="complete"]').click();
    await flushAsync();

    const opsModal = document.querySelector('.operations-modal');
    expect(opsModal).not.toBeNull();
    opsModal.querySelector('.complete-confirm').click();
    await flushAsync();

    const row = root.querySelector('#grid tbody tr');
    expect(row.classList.contains('completed')).toBe(true);
    expect(root.querySelector('#totals').textContent).toContain('入客数: 1');
  });

  it('reverts a completed row when 完了を解除 is clicked in the operations panel', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    root.querySelector('[data-field="complete"]').click();
    await flushAsync();
    document.querySelector('.operations-modal .complete-confirm').click();
    await flushAsync();

    expect(root.querySelector('#grid tbody tr').classList.contains('completed')).toBe(true);

    root.querySelector('[data-field="complete"]').click();
    await flushAsync();
    document.querySelector('.operations-modal .revert-confirm').click();
    await flushAsync();

    expect(root.querySelector('#grid tbody tr').classList.contains('completed')).toBe(false);
    expect(root.querySelector('#totals').textContent).toContain('入客数: 0');
  });

  it('opens a cast popover for the nomination cell using seeded casts', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    const nominationButton = root.querySelector('[data-field="nomination"]');
    nominationButton.click();

    const popover = document.querySelector('.cast-popover');
    expect(popover).not.toBeNull();
    expect(popover.querySelectorAll('button').length).toBeGreaterThan(1);
  });

  it('only shows working casts in the cast popover', async () => {
    const root = setupRoot();
    const dbName = `app-test-db-${dbCounter}`;

    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ', 'リン', 'カリン', 'トモミ', 'サキ']);
    const [firstCast] = await getCasts(db, 'STORE');
    await updateCast(db, { ...firstCast, working: false });
    db.close();

    await initApp(root, { dbName });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    const nominationButton = root.querySelector('[data-field="nomination"]');
    nominationButton.click();

    const popover = document.querySelector('.cast-popover');
    const names = Array.from(popover.querySelectorAll('button')).map((b) => b.textContent);

    expect(names).not.toContain(firstCast.name);
    expect(names).toContain('リン');
  });

  it('shows the working casts in the header', async () => {
    const root = setupRoot();
    const dbName = `app-test-db-${dbCounter}`;

    const db = await openDatabase(dbName);
    await seedDefaultCasts(db, 'STORE', ['マイ', 'リン', 'カリン', 'トモミ', 'サキ']);
    const [firstCast] = await getCasts(db, 'STORE');
    await updateCast(db, { ...firstCast, working: false });
    db.close();

    await initApp(root, { dbName });

    const text = root.querySelector('#working-casts').textContent;
    expect(text).not.toContain(firstCast.name);
    expect(text).toContain('リン');
  });

  it('rounds the start time to the nearest 5 minutes when registering a new visit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 5, 10, 20, 12, 0));

    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    const startCell = root.querySelector('#grid tbody tr').children[1];
    expect(startCell.textContent).toContain('20:10');

    vi.useRealTimers();
  });

  it('deletes a row when its delete button is clicked and confirmed', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    modal.querySelector('[data-size="3"]').click();
    findConfirmButton(modal).click();
    await flushAsync();

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(3);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    root.querySelector('[data-field="complete"]').click();
    await flushAsync();
    document.querySelector('.operations-modal [data-action="delete"]').click();
    await flushAsync();

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(2);
  });

  it('does not delete a row when the confirmation is cancelled', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    root.querySelector('[data-field="complete"]').click();
    await flushAsync();
    document.querySelector('.operations-modal [data-action="delete"]').click();
    await flushAsync();

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(1);
  });

  it('adds a new row to the same group when "組に追加" is clicked', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    expect(root.querySelectorAll('#grid tbody tr')).toHaveLength(1);

    root.querySelector('[data-field="complete"]').click();
    await flushAsync();
    document.querySelector('.operations-modal [data-action="add-to-group"]').click();
    await flushAsync();

    const rows = root.querySelectorAll('#grid tbody tr');
    expect(rows).toHaveLength(2);

    const groupCells = Array.from(rows).map((tr) => tr.children[2].textContent);
    expect(groupCells[0]).toBe(groupCells[1]);
  });

  it('sets the planned end time when a start-time duration button is clicked', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    const startCell = root.querySelector('#grid tbody tr').children[1];
    const startTime = startCell.querySelector('span').textContent;

    startCell.querySelector('[data-duration="40"]').click();
    await flushAsync();

    const plannedEndCell = root.querySelector('#grid tbody tr').children[1].querySelector('.start-cell-planned');
    expect(plannedEndCell.textContent).toBe(addMinutesToTime(startTime, 40));
  });

  it('adds a nomination when selecting a cast for an unnominated visit, and supports a second slot via "+追加"', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    root.querySelector('[data-field="nomination"]').click();

    let popover = document.querySelector('.cast-popover');
    let castButtons = Array.from(popover.querySelectorAll('button')).filter(
      (b) => b.textContent !== '未指名にする'
    );
    castButtons[0].click();
    await flushAsync();

    expect(root.querySelectorAll('.nomination-row')).toHaveLength(1);

    const addButton = root.querySelector('[data-action="add-nomination"]');
    addButton.click();

    popover = document.querySelector('.cast-popover');
    castButtons = Array.from(popover.querySelectorAll('button')).filter(
      (b) => b.textContent !== '未指名にする'
    );
    castButtons[1].click();
    await flushAsync();

    expect(root.querySelectorAll('.nomination-row')).toHaveLength(2);
  });

  it('removes a nomination slot when "未指名にする" is selected', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    root.querySelector('[data-field="nomination"]').click();
    let popover = document.querySelector('.cast-popover');
    const castButtons = Array.from(popover.querySelectorAll('button')).filter(
      (b) => b.textContent !== '未指名にする'
    );
    castButtons[0].click();
    await flushAsync();

    expect(root.querySelectorAll('.nomination-row')).toHaveLength(1);

    root.querySelector('[data-field="nomination"]').click();
    popover = document.querySelector('.cast-popover');
    popover.querySelector('.cast-popover-clear').click();
    await flushAsync();

    expect(root.querySelectorAll('.nomination-row')).toHaveLength(0);
    expect(root.querySelector('[data-field="nomination"]').textContent).toBe('未指名');
  });

  it('toggles the red-text flag for a nomination and persists it', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    root.querySelector('[data-field="nomination"]').click();
    const popover = document.querySelector('.cast-popover');
    const castButtons = Array.from(popover.querySelectorAll('button')).filter(
      (b) => b.textContent !== '未指名にする'
    );
    castButtons[0].click();
    await flushAsync();

    const colorButton = root.querySelector('[data-action="toggle-nomination-color"]');
    colorButton.click();
    await flushAsync();

    const nameButton = root.querySelector('[data-field="nomination"]');
    expect(nameButton.classList.contains('nomination-red')).toBe(true);
  });

  it('cycles an extension boundary bar and persists it when clicked', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    const bar = root.querySelectorAll('.ext-bar')[0];
    bar.click();
    await flushAsync();

    expect(root.querySelectorAll('.ext-bar')[0].classList.contains('ext-bar--half')).toBe(true);
  });

  it('opens the accounting modal when the accounting cell is clicked', async () => {
    const root = setupRoot();
    await initApp(root, { dbName: `app-test-db-${dbCounter}` });

    root.querySelector('#new-visit-button').click();
    const modal = document.querySelector('.new-visit-modal');
    findConfirmButton(modal).click();
    await flushAsync();

    root.querySelector('[data-field="accounting"]').click();

    expect(document.querySelector('.accounting-modal')).not.toBeNull();
  });
});
