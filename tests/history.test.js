import { describe, it, expect, beforeEach } from 'vitest';
import { initHistory, renderHistoryTable, renderHistoryTotals } from '../js/history.js';
import { openDatabase, addVisit } from '../js/db.js';

function setupRoot() {
  document.body.innerHTML = `
    <input type="date" id="history-date" />
    <div id="history-table"></div>
    <div id="history-totals"></div>
  `;
  return document.body;
}

function makeVisit(overrides = {}) {
  return {
    store: 'STORE',
    date: '2026-06-12',
    groupId: 'g1',
    startTime: '20:00',
    completedAt: '21:30',
    table: '3',
    completed: true,
    note: '常連',
    nominations: [],
    castColumns: Array(11).fill(null).map(() => ['', '']),
    payments: [
      { method: '現金', amount: 5000 },
      { method: 'カード', amount: 3000 },
    ],
    ...overrides,
  };
}

describe('renderHistoryTable', () => {
  it('renders headers: No., 開始時, 組, 完了時, 卓番, 付け回し履歴, 合計, 備考', () => {
    const container = document.createElement('div');
    renderHistoryTable(container, [makeVisit()]);

    const headers = Array.from(container.querySelectorAll('th')).map((th) => th.textContent);
    expect(headers).toEqual(['No.', '開始時', '組', '完了時', '卓番', '付け回し履歴', '合計', '備考']);
  });

  it('renders correct cell values for a visit', () => {
    const container = document.createElement('div');
    renderHistoryTable(container, [makeVisit()]);

    const row = container.querySelector('tbody tr.visit-row');
    const cells = Array.from(row.children);

    expect(cells[0].textContent).toBe('1');      // No.
    expect(cells[1].textContent).toBe('20:00');  // 開始時
    expect(cells[2].textContent).toBe('1');      // 組
    expect(cells[3].textContent).toBe('21:30');  // 完了時
    expect(cells[4].textContent).toBe('3');      // 卓番
    // cells[5] = 付け回し履歴
    expect(cells[6].querySelector('button').textContent).toBe('¥8000'); // 合計
    expect(cells[7].textContent).toBe('常連');   // 備考
  });

  it('opens a payment detail modal when the 合計 button is clicked', () => {
    const container = document.createElement('div');
    const visit = makeVisit({
      plannedEndTime: '21:00',
      nominations: [{ name: 'みお', isRed: false }],
      castColumns: [['ゆい', ''], ...Array(10).fill(null).map(() => ['', ''])],
    });

    renderHistoryTable(container, [visit]);

    const totalBtn = container.querySelector('[data-action="show-payment-detail"]');
    expect(totalBtn).not.toBeNull();
    totalBtn.click();

    const modal = document.querySelector('.history-payment-modal');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('¥8000');
    expect(modal.textContent).toContain('現金 ¥5000');
    expect(modal.textContent).toContain('カード ¥3000');
    expect(modal.textContent).toContain('みお');
    expect(modal.textContent).toContain('ゆい');
  });

  it('closes the payment detail modal when the overlay is clicked', () => {
    const container = document.createElement('div');
    renderHistoryTable(container, [makeVisit()]);

    container.querySelector('[data-action="show-payment-detail"]').click();
    expect(document.querySelector('.history-payment-modal')).not.toBeNull();

    document.querySelector('.modal-overlay').click();
    expect(document.querySelector('.history-payment-modal')).toBeNull();
  });

  it('shows cast column summary in 付け回し履歴 cell', () => {
    const container = document.createElement('div');
    const castColumns = Array(11).fill(null).map(() => ['', '']);
    castColumns[0] = ['アカリ', 'ユキ'];
    castColumns[1] = ['みお', ''];
    const visit = makeVisit({ castColumns });

    renderHistoryTable(container, [visit]);

    const row = container.querySelector('tbody tr.visit-row');
    expect(row.children[5].textContent).toContain('S: アカリ・ユキ');
    expect(row.children[5].textContent).toContain('N1: みお');
  });
});

describe('renderHistoryTotals', () => {
  it('renders daily totals cards for completed visits', () => {
    const container = document.createElement('div');
    const visit = makeVisit({ completed: true });

    renderHistoryTotals(container, [visit]);

    const cards = Array.from(container.querySelectorAll('.totals-card')).map((card) => card.textContent);
    expect(cards).toEqual(['入客数: 1', '売上合計: ¥8000', 'カード売上: ¥3000', '客単価: ¥8000']);
  });
});

describe('initHistory', () => {
  let dbCounter = 0;

  beforeEach(() => {
    document.body.innerHTML = '';
    dbCounter += 1;
  });

  it('defaults the date input to today and shows that day\'s visits', async () => {
    const root = setupRoot();
    const dbName = `history-test-db-${dbCounter}`;
    const today = new Date().toISOString().slice(0, 10);

    const db = await openDatabase(dbName);
    await addVisit(db, makeVisit({ date: today }));
    db.close();

    await initHistory(root, { dbName });

    expect(root.querySelector('#history-date').value).toBe(today);
    expect(root.querySelectorAll('#history-table tbody tr.visit-row')).toHaveLength(1);
  });

  it('reloads visits for the newly selected date when the date input changes', async () => {
    const root = setupRoot();
    const dbName = `history-test-db-${dbCounter}`;
    const today = new Date().toISOString().slice(0, 10);

    const db = await openDatabase(dbName);
    await addVisit(db, makeVisit({ date: today }));
    await addVisit(db, makeVisit({ date: '2026-01-01', groupId: 'g2', table: '7' }));
    db.close();

    await initHistory(root, { dbName });

    const dateInput = root.querySelector('#history-date');
    dateInput.value = '2026-01-01';
    dateInput.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const rows = root.querySelectorAll('#history-table tbody tr.visit-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('7');
  });
});
