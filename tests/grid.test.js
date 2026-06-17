import { describe, it, expect, vi } from 'vitest';
import { renderGrid } from '../js/grid.js';

function makeVisit(overrides = {}) {
  return {
    id: 1,
    store: 'STORE',
    date: '2026-06-10',
    groupId: 'g1',
    startTime: '20:00',
    plannedEndTime: '',
    endTime: '',
    completed: false,
    completedAt: '',
    table: '',
    nominations: [],
    castColumns: Array(11).fill(null).map(() => ['', '']),
    extensions: Array(10).fill(null),
    payments: [],
    note: '',
    ...overrides,
  };
}

describe('renderGrid', () => {
  it('renders one row per visit with 28 columns and 28 headers', () => {
    const container = document.createElement('div');
    renderGrid(container, [makeVisit(), makeVisit({ id: 2 })]);

    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells).toHaveLength(28);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].children).toHaveLength(28);
  });

  it('wraps the table in a .grid-scroll container', () => {
    const container = document.createElement('div');
    renderGrid(container, [makeVisit()]);

    const wrapper = container.querySelector('.grid-scroll');
    expect(wrapper).not.toBeNull();
    expect(wrapper.querySelector('table.visit-grid')).not.toBeNull();
  });

  it('shows sequential row numbers in the No. column', () => {
    const container = document.createElement('div');
    renderGrid(container, [makeVisit({ id: 1 }), makeVisit({ id: 2 })]);

    const noCells = Array.from(container.querySelectorAll('tbody tr')).map(
      (tr) => tr.children[0].textContent
    );
    expect(noCells).toEqual(['1', '2']);
  });

  it('calls onCellClick with visit, field, the button and an index when a popover cell is clicked', () => {
    const container = document.createElement('div');
    const onCellClick = vi.fn();
    const visit = makeVisit();

    renderGrid(container, [visit], { onCellClick });

    const nominationButton = container.querySelector('[data-field="nomination"]');
    nominationButton.click();

    expect(onCellClick).toHaveBeenCalledWith(visit, 'nomination', nominationButton, 0);
  });

  it('calls onComplete with the visit when the complete button is clicked', () => {
    const container = document.createElement('div');
    const onComplete = vi.fn();
    const visit = makeVisit();

    renderGrid(container, [visit], { onComplete });

    const completeButton = container.querySelector('[data-field="complete"]');
    completeButton.click();

    expect(onComplete).toHaveBeenCalledWith(visit);
  });

  it('calls onTableChange with visit and new value when a table option is selected from the popup', () => {
    const container = document.createElement('div');
    const onTableChange = vi.fn();
    const visit = makeVisit();

    renderGrid(container, [visit], { onTableChange });

    const toggleButton = container.querySelector('[data-field="table"]');
    toggleButton.click();
    const option = container.querySelector('[data-table-value="5"]');
    option.click();

    expect(onTableChange).toHaveBeenCalledWith(visit, '5');
  });

  it('marks completed rows with a "completed" class', () => {
    const container = document.createElement('div');
    const visit = makeVisit({ completed: true });

    renderGrid(container, [visit]);

    const row = container.querySelector('tbody tr');
    expect(row.classList.contains('completed')).toBe(true);
  });

  it('shows sequential group numbers in the 組 column', () => {
    const container = document.createElement('div');
    const visits = [
      makeVisit({ id: 1, groupId: 'g1' }),
      makeVisit({ id: 2, groupId: 'g1' }),
      makeVisit({ id: 3, groupId: 'g2' }),
    ];

    renderGrid(container, visits);

    const groupCells = Array.from(container.querySelectorAll('tbody tr')).map(
      (tr) => tr.children[2].textContent
    );
    expect(groupCells).toEqual(['1', '1', '2']);
  });

  it('shows the start time and planned end time on two rows of the start cell', () => {
    const container = document.createElement('div');
    const visit = makeVisit({ startTime: '20:00', plannedEndTime: '20:40' });

    renderGrid(container, [visit]);

    const startCell = container.querySelector('tbody tr').children[1];
    const rows = startCell.querySelectorAll('.start-cell-row');

    expect(rows[0].textContent).toContain('20:00');
    expect(rows[1].textContent).toBe('20:40');
  });

  it('calls onSetPlannedEndTime when a duration button is clicked', () => {
    const container = document.createElement('div');
    const onSetPlannedEndTime = vi.fn();
    const visit = makeVisit({ startTime: '20:00' });

    renderGrid(container, [visit], { onSetPlannedEndTime });

    const startCell = container.querySelector('tbody tr').children[1];
    const button = startCell.querySelector('[data-duration="40"]');
    button.click();

    expect(onSetPlannedEndTime).toHaveBeenCalledWith(visit, 40);
  });

  it('hides the duration buttons by default and toggles them with the clock icon', () => {
    const container = document.createElement('div');
    const visit = makeVisit({ startTime: '20:00' });

    renderGrid(container, [visit]);

    const startCell = container.querySelector('tbody tr').children[1];
    const durationButtons = startCell.querySelector('.duration-buttons');
    const toggleButton = startCell.querySelector('[data-action="toggle-duration-menu"]');

    expect(durationButtons.classList.contains('open')).toBe(false);

    toggleButton.click();
    expect(durationButtons.classList.contains('open')).toBe(true);

    toggleButton.click();
    expect(durationButtons.classList.contains('open')).toBe(false);
  });

  it('closes the duration menu after a duration button is clicked', () => {
    const container = document.createElement('div');
    const onSetPlannedEndTime = vi.fn();
    const visit = makeVisit({ startTime: '20:00' });

    renderGrid(container, [visit], { onSetPlannedEndTime });

    const startCell = container.querySelector('tbody tr').children[1];
    const durationButtons = startCell.querySelector('.duration-buttons');
    const toggleButton = startCell.querySelector('[data-action="toggle-duration-menu"]');

    toggleButton.click();
    expect(durationButtons.classList.contains('open')).toBe(true);

    startCell.querySelector('[data-duration="40"]').click();

    expect(onSetPlannedEndTime).toHaveBeenCalledWith(visit, 40);
    expect(durationButtons.classList.contains('open')).toBe(false);
  });

  it('renders S and N1-N10 as cast-column cells with 2 slots each, and 10 extension boundary cells between them', () => {
    const container = document.createElement('div');
    const castColumns = Array(11).fill(null).map(() => ['', '']);
    castColumns[0] = ['アカリ', 'ユキ'];
    const visit = makeVisit({ castColumns });

    renderGrid(container, [visit]);

    const row = container.querySelector('tbody tr');
    const castCells = row.querySelectorAll('.cast-column-cell');
    expect(castCells).toHaveLength(11);

    const slots = row.querySelectorAll('.cast-slot');
    expect(slots).toHaveLength(22);
    expect(slots[0].textContent).toBe('アカリ');
    expect(slots[1].textContent).toBe('ユキ');

    expect(row.querySelectorAll('.ext-boundary')).toHaveLength(10);
  });

  it('calls onCellClick with field "castColumn" and the slot index when a cast slot is clicked', () => {
    const container = document.createElement('div');
    const onCellClick = vi.fn();
    const visit = makeVisit();

    renderGrid(container, [visit], { onCellClick });

    const slot = container.querySelector('.cast-slot[data-column="2"][data-slot="1"]');
    slot.click();

    expect(onCellClick).toHaveBeenCalledWith(visit, 'castColumn', slot, 5);
  });

  it('shows ext-bar--half or ext-bar--full classes based on visit.extensions', () => {
    const container = document.createElement('div');
    const extensions = Array(10).fill(null);
    extensions[0] = { minutes: 20 };
    extensions[3] = { minutes: 40 };
    const visit = makeVisit({ extensions });

    renderGrid(container, [visit]);

    const bars = container.querySelectorAll('.ext-bar');
    expect(bars).toHaveLength(10);
    expect(bars[0].classList.contains('ext-bar--half')).toBe(true);
    expect(bars[3].classList.contains('ext-bar--full')).toBe(true);
    expect(bars[1].classList.contains('ext-bar--half')).toBe(false);
    expect(bars[1].classList.contains('ext-bar--full')).toBe(false);
  });

  it('calls onCycleExtension with the visit and boundary index when an ext-bar is clicked', () => {
    const container = document.createElement('div');
    const onCycleExtension = vi.fn();
    const visit = makeVisit();

    renderGrid(container, [visit], { onCycleExtension });

    const bars = container.querySelectorAll('.ext-bar');
    bars[2].click();

    expect(onCycleExtension).toHaveBeenCalledWith(visit, 2);
  });

  it('shows the accounting amount and calls onCellClick with field "accounting" when clicked', () => {
    const container = document.createElement('div');
    const onCellClick = vi.fn();
    const visit = makeVisit({ payments: [{ method: '現金', amount: 5000 }] });

    renderGrid(container, [visit], { onCellClick });

    const button = container.querySelector('[data-field="accounting"]');
    expect(button.textContent).toBe('¥5000');

    button.click();
    expect(onCellClick).toHaveBeenCalledWith(visit, 'accounting', button);
  });

  it('shows a "未指名" button when nominations is empty', () => {
    const container = document.createElement('div');
    const onCellClick = vi.fn();
    const visit = makeVisit({ nominations: [] });

    renderGrid(container, [visit], { onCellClick });

    const button = container.querySelector('[data-field="nomination"]');
    expect(button.textContent).toBe('未指名');
    expect(button.dataset.index).toBe('0');

    button.click();
    expect(onCellClick).toHaveBeenCalledWith(visit, 'nomination', button, 0);
  });

  it('shows nomination rows with name and color toggle buttons, and an add button when under the max', () => {
    const container = document.createElement('div');
    const onCellClick = vi.fn();
    const onToggleNominationColor = vi.fn();
    const visit = makeVisit({ nominations: [{ name: 'マイ', isRed: false }] });

    renderGrid(container, [visit], { onCellClick, onToggleNominationColor });

    const rows = container.querySelectorAll('.nomination-row');
    expect(rows).toHaveLength(1);

    const nameButton = rows[0].querySelector('[data-field="nomination"]');
    expect(nameButton.textContent).toBe('マイ');
    expect(nameButton.classList.contains('nomination-red')).toBe(false);

    const colorButton = rows[0].querySelector('[data-action="toggle-nomination-color"]');
    colorButton.click();
    expect(onToggleNominationColor).toHaveBeenCalledWith(visit, 0);

    const addButton = container.querySelector('[data-action="add-nomination"]');
    expect(addButton).not.toBeNull();
    addButton.click();
    expect(onCellClick).toHaveBeenCalledWith(visit, 'nomination', addButton, 1);
  });

  it('applies the nomination-red class when isRed is true and hides the add button at 2 nominations', () => {
    const container = document.createElement('div');
    const visit = makeVisit({
      nominations: [
        { name: 'マイ', isRed: true },
        { name: 'リン', isRed: false },
      ],
    });

    renderGrid(container, [visit]);

    const rows = container.querySelectorAll('.nomination-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('[data-field="nomination"]').classList.contains('nomination-red')).toBe(true);
    expect(container.querySelector('[data-action="add-nomination"]')).toBeNull();
  });

  it('renders a single empty slot with ＋ placeholder when note is blank', () => {
    const container = document.createElement('div');
    renderGrid(container, [makeVisit({ note: '' })]);

    const slots = container.querySelectorAll('.note-slot');
    expect(slots).toHaveLength(1);
    expect(slots[0].classList.contains('note-slot--empty')).toBe(true);
    expect(slots[0].textContent).toBe('＋');
  });

  it('renders a single slot with text when note has one item', () => {
    const container = document.createElement('div');
    renderGrid(container, [makeVisit({ note: '常連' })]);

    const slots = container.querySelectorAll('.note-slot');
    expect(slots).toHaveLength(1);
    expect(slots[0].textContent).toBe('常連');
  });

  it('renders two slots when note has two ・-separated items', () => {
    const container = document.createElement('div');
    renderGrid(container, [makeVisit({ note: '常連・VIP' })]);

    const slots = container.querySelectorAll('.note-slot');
    expect(slots).toHaveLength(2);
    expect(slots[0].textContent).toBe('常連');
    expect(slots[1].textContent).toBe('VIP');
  });
});
