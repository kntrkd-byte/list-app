import {
  openDatabase,
  getVisitsByStoreAndDate,
  addVisit,
  updateVisit,
  deleteVisit,
  getCasts,
  seedDefaultCasts,
  getNotePresets,
} from './db.js';
import {
  createVisitGroup,
  createVisitInGroup,
  calcDailyTotals,
  markComplete,
  roundTimeTo5Minutes,
  addMinutesToTime,
  cycleExtension,
  assignGroupNumbers,
  sortVisitsByGroup,
} from './models.js';
import { renderGrid } from './grid.js';
import { openCastPopover, closeCastPopover } from './castPopover.js';
import { openAccountingModal, closeAccountingModal } from './paymentEditor.js';
import { openNewVisitModal } from './newVisitModal.js';
import { openNotePresetsModal } from './notePresetsModal.js';
import { openOperationsModal, closeOperationsModal } from './operationsModal.js';
import { exportDailyExcel } from './export.js';

const STORE_NAME = 'STORE';
const DEFAULT_CASTS = ['マイ', 'リン', 'カリン', 'トモミ', 'サキ'];

export async function initApp(root, { dbName = 'list-app-db' } = {}) {
  const db = await openDatabase(dbName);
  await seedDefaultCasts(db, STORE_NAME, DEFAULT_CASTS);

  const today = new Date().toISOString().slice(0, 10);

  const gridContainer = root.querySelector('#grid');
  const totalsContainer = root.querySelector('#totals');
  const newVisitButton = root.querySelector('#new-visit-button');
  const workingCastsContainer = root.querySelector('#working-casts');

  const dateEl = root.querySelector('#today-date');
  if (dateEl) {
    const [y, m, d] = today.split('-').map(Number);
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()];
    dateEl.textContent = `${y}年${m}月${d}日(${weekday})`;
  }

  let visits = [];
  let businessClosed = false;
  const allCasts = await getCasts(db, STORE_NAME);
  const workingCasts = allCasts.filter((cast) => cast.working);

  workingCastsContainer.innerHTML = '';
  const workingLabel = document.createElement('span');
  workingLabel.className = 'working-casts-label';
  workingLabel.textContent = '本日の出勤';
  workingCastsContainer.appendChild(workingLabel);

  if (workingCasts.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'working-casts-empty';
    empty.textContent = 'なし';
    workingCastsContainer.appendChild(empty);
  } else {
    for (const cast of workingCasts) {
      const chip = document.createElement('span');
      chip.className = 'cast-chip';
      chip.textContent = cast.name;
      workingCastsContainer.appendChild(chip);
    }
  }

  async function refresh() {
    visits = sortVisitsByGroup(await getVisitsByStoreAndDate(db, STORE_NAME, today));
    renderGrid(gridContainer, visits, {
      onCellClick: handleCellClick,
      onComplete: handleComplete,
      onTableChange: handleFieldChange('table'),
      onNoteChange: handleFieldChange('note'),
      onSetPlannedEndTime: handleSetPlannedEndTime,
      onToggleNominationColor: handleToggleNominationColor,
      onCycleExtension: handleCycleExtension,
      onEditPlannedEndTime: handleEditPlannedEndTime,
    });
    renderTotals();
  }

  function renderTotals() {
    const totals = calcDailyTotals(visits);
    totalsContainer.innerHTML = '';

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
      totalsContainer.appendChild(card);
    }

    const btnGroup = document.createElement('div');
    btnGroup.className = 'totals-btn-group';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-business-btn';
    closeBtn.textContent = '営業終了';
    closeBtn.addEventListener('click', () => {
      if (!confirm('営業を終了しますか？')) return;
      businessClosed = true;
      renderTotals();
    });
    btnGroup.appendChild(closeBtn);

    if (businessClosed) {
      const exportBtn = document.createElement('button');
      exportBtn.className = 'export-btn';
      exportBtn.textContent = 'Excelで保存';
      exportBtn.addEventListener('click', () => exportDailyExcel(visits, today));
      btnGroup.appendChild(exportBtn);
    }

    totalsContainer.appendChild(btnGroup);
  }

  function handleFieldChange(field) {
    return async (visit, value) => {
      visit[field] = value;
      await updateVisit(db, visit);
      await refresh();
    };
  }

  function newGroupId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function handleComplete(visit) {
    closeCastPopover();
    closeAccountingModal();
    const groupNumber = assignGroupNumbers(visits).get(visit.groupId);
    const groupSize = visits.filter((v) => v.groupId === visit.groupId).length;
    openOperationsModal(visit, { groupNumber, groupSize }, {
      onComplete: async (endTime) => {
        markComplete(visit, endTime);
        await updateVisit(db, visit);
        await refresh();
      },
      onRevert: async () => {
        visit.completed = false;
        visit.endTime = '';
        visit.completedAt = '';
        await updateVisit(db, visit);
        await refresh();
      },
      onAddToGroup: () => handleAddToGroup(visit),
      onSeparate: async () => {
        visit.groupId = newGroupId();
        await updateVisit(db, visit);
        await refresh();
      },
      onDelete: () => handleDeleteVisit(visit),
    });
  }

  async function handleSetPlannedEndTime(visit, minutes) {
    visit.plannedEndTime = addMinutesToTime(visit.startTime, minutes);
    await updateVisit(db, visit);
    await refresh();
  }

  async function handleEditPlannedEndTime(visit, time) {
    visit.plannedEndTime = time;
    await updateVisit(db, visit);
    await refresh();
  }

  async function handleCycleExtension(visit, index) {
    cycleExtension(visit, index);
    await updateVisit(db, visit);
    await refresh();
  }

  async function handleDeleteVisit(visit) {
    if (!confirm('この行を削除しますか？')) {
      return;
    }
    await deleteVisit(db, visit.id);
    await refresh();
  }

  async function handleAddToGroup(visit) {
    const startTime = roundTimeTo5Minutes(new Date().toTimeString().slice(0, 5));
    const newVisit = createVisitInGroup({
      store: STORE_NAME,
      date: today,
      groupId: visit.groupId,
      startTime,
    });
    await addVisit(db, newVisit);
    await refresh();
  }

  async function handleCellClick(visit, field, anchorEl, index) {
    closeCastPopover();
    closeAccountingModal();
    closeOperationsModal();

    if (field === 'nomination') {
      const nominations = visit.nominations || [];
      openCastPopover(anchorEl, workingCasts, async (castName) => {
        if (castName === '') {
          nominations.splice(index, 1);
        } else if (index < nominations.length) {
          nominations[index].name = castName;
        } else {
          nominations.push({ name: castName, isRed: false });
        }
        visit.nominations = nominations;
        await updateVisit(db, visit);
        await refresh();
      });
      return;
    }

    if (field === 'castColumn') {
      const column = Number(anchorEl.dataset.column);
      const slot = Number(anchorEl.dataset.slot);
      openCastPopover(anchorEl, workingCasts, async (castName) => {
        visit.castColumns[column][slot] = castName;
        await updateVisit(db, visit);
        await refresh();
      });
      return;
    }

    if (field === 'accounting') {
      openAccountingModal(visit, async (updatedVisit) => {
        await updateVisit(db, updatedVisit);
        await refresh();
      });
    }

    if (field === 'note') {
      const presets = await getNotePresets(db, STORE_NAME);
      openNotePresetsModal(presets, visit.note, async (selectedNote) => {
        visit.note = selectedNote;
        await updateVisit(db, visit);
        await refresh();
      });
    }
  }

  async function handleToggleNominationColor(visit, index) {
    visit.nominations[index].isRed = !visit.nominations[index].isRed;
    await updateVisit(db, visit);
    await refresh();
  }

  newVisitButton.addEventListener('click', () => {
    openNewVisitModal(async (groupSize) => {
      try {
        const startTime = roundTimeTo5Minutes(new Date().toTimeString().slice(0, 5));
        const newVisits = createVisitGroup({
          store: STORE_NAME,
          date: today,
          groupSize,
          startTime,
        });

        for (const visit of newVisits) {
          await addVisit(db, visit);
        }

        await refresh();
      } catch (err) {
        console.error('新規来店登録エラー:', err);
        alert(`来店登録に失敗しました: ${err.message}`);
      }
    });
  });

  await refresh();
}
