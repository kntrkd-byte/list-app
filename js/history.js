import { openDatabase, getVisitsByStoreAndDate } from './db.js';
import { calcRowSales, calcDailyTotals, assignGroupNumbers, sortVisitsByGroup } from './models.js';

const STORE_NAME = 'STORE';

let currentModal = null;
let currentOverlay = null;

function closePaymentDetailModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

function formatCastColumns(castColumns) {
  const labels = ['S', ...Array.from({ length: 10 }, (_, i) => `N${i + 1}`)];
  return (castColumns || [])
    .map((slots, index) => {
      const names = (slots || []).filter((name) => name);
      return names.length === 0 ? null : `${labels[index]}: ${names.join('・')}`;
    })
    .filter((entry) => entry !== null)
    .join(', ');
}

function openPaymentDetailModal(visit, groupNumber) {
  closePaymentDetailModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', closePaymentDetailModal);
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const modal = document.createElement('div');
  modal.className = 'history-payment-modal operations-modal';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.dataset.action = 'close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closePaymentDetailModal);
  modal.appendChild(closeBtn);

  const title = document.createElement('div');
  title.className = 'operations-modal-title';
  title.textContent = `${groupNumber}組 卓${visit.table || '-'}`;
  modal.appendChild(title);

  const times = document.createElement('div');
  times.className = 'history-payment-section';
  times.textContent = `開始 ${visit.startTime}`;
  if (visit.plannedEndTime) times.textContent += ` ／ 終了予定 ${visit.plannedEndTime}`;
  times.textContent += ` ／ 完了 ${visit.completedAt || '-'}`;
  modal.appendChild(times);

  const noms = (visit.nominations || []).map((n) => n.name).join('、') || 'なし';
  const nomSection = document.createElement('div');
  nomSection.className = 'history-payment-section';
  nomSection.textContent = `指名: ${noms}`;
  modal.appendChild(nomSection);

  const castText = formatCastColumns(visit.castColumns);
  if (castText) {
    const castSection = document.createElement('div');
    castSection.className = 'history-payment-section';
    castSection.textContent = `付け回し: ${castText}`;
    modal.appendChild(castSection);
  }

  const payments = visit.payments || [];
  const breakdownTitle = document.createElement('div');
  breakdownTitle.className = 'history-payment-section history-payment-label';
  breakdownTitle.textContent = '入金内訳';
  modal.appendChild(breakdownTitle);

  if (payments.length === 0) {
    const none = document.createElement('div');
    none.className = 'history-payment-section';
    none.textContent = 'なし';
    modal.appendChild(none);
  } else {
    const list = document.createElement('ul');
    list.className = 'history-detail-payments';
    for (const payment of payments) {
      const li = document.createElement('li');
      li.textContent = `${payment.method} ¥${payment.amount}`;
      list.appendChild(li);
    }
    modal.appendChild(list);
  }

  const total = document.createElement('div');
  total.className = 'history-payment-total';
  total.textContent = `合計 ¥${calcRowSales(visit)}`;
  modal.appendChild(total);

  document.body.appendChild(modal);
  currentModal = modal;
}

const HEADERS = ['No.', '開始時', '組', '完了時', '卓番', '付け回し履歴', '合計', '備考'];

export function renderHistoryTable(container, visits) {
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'history-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const text of HEADERS) {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const groupNumbers = assignGroupNumbers(visits);

  visits.forEach((visit, index) => {
    const tr = document.createElement('tr');
    tr.className = 'visit-row';

    const groupNumber = groupNumbers.get(visit.groupId);
    const castSummary = formatCastColumns(visit.castColumns);

    const rowData = [
      { text: String(index + 1) },
      { text: visit.startTime },
      { text: String(groupNumber) },
      { text: visit.completedAt || '-' },
      { text: visit.table || '-' },
      { text: castSummary || '-', className: 'history-cast-cell' },
    ];

    for (const { text, className } of rowData) {
      const td = document.createElement('td');
      td.textContent = text;
      if (className) td.className = className;
      tr.appendChild(td);
    }

    const totalTd = document.createElement('td');
    const totalBtn = document.createElement('button');
    totalBtn.type = 'button';
    totalBtn.dataset.action = 'show-payment-detail';
    totalBtn.className = 'history-total-btn';
    totalBtn.textContent = `¥${calcRowSales(visit)}`;
    totalBtn.addEventListener('click', () => openPaymentDetailModal(visit, groupNumber));
    totalTd.appendChild(totalBtn);
    tr.appendChild(totalTd);

    const noteTd = document.createElement('td');
    noteTd.textContent = visit.note || '';
    tr.appendChild(noteTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

export function renderHistoryTotals(container, visits) {
  const totals = calcDailyTotals(visits);
  container.innerHTML = '';

  const items = [
    ['入客数', `${totals.customerCount}`],
    ['売上合計', `¥${totals.totalSales}`],
    ['カード売上', `¥${totals.cardSales}`],
    ['客単価', `¥${Math.round(totals.averageSpend)}`],
  ];

  for (const [label, value] of items) {
    const card = document.createElement('div');
    card.className = 'totals-card';
    card.textContent = `${label}: ${value}`;
    container.appendChild(card);
  }
}

export async function initHistory(root, { dbName = 'list-app-db' } = {}) {
  const db = await openDatabase(dbName);
  const dateInput = root.querySelector('#history-date');
  const tableContainer = root.querySelector('#history-table');
  const totalsContainer = root.querySelector('#history-totals');

  dateInput.value = new Date().toISOString().slice(0, 10);

  async function refresh() {
    const visits = sortVisitsByGroup(await getVisitsByStoreAndDate(db, STORE_NAME, dateInput.value));
    renderHistoryTable(tableContainer, visits);
    renderHistoryTotals(totalsContainer, visits);
  }

  dateInput.addEventListener('change', refresh);
  await refresh();
}
