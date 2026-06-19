let currentModal = null;
let currentOverlay = null;
let outsideClickHandler = null;

const FREE_INPUT = '__free__';

function makeNoteSlot(label, presets, initialValue) {
  const wrapper = document.createElement('div');
  wrapper.className = 'note-slot-section';

  const labelEl = document.createElement('div');
  labelEl.className = 'note-slot-label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const select = document.createElement('select');
  select.className = 'note-slot-select';

  const blankOpt = document.createElement('option');
  blankOpt.value = '';
  blankOpt.textContent = '-- 選択 --';
  select.appendChild(blankOpt);

  for (const preset of presets) {
    const opt = document.createElement('option');
    opt.value = preset.text;
    opt.textContent = preset.text;
    select.appendChild(opt);
  }

  const freeOpt = document.createElement('option');
  freeOpt.value = FREE_INPUT;
  freeOpt.textContent = '自由入力...';
  select.appendChild(freeOpt);

  const isPreset = presets.some((p) => p.text === initialValue);
  if (initialValue && isPreset) {
    select.value = initialValue;
  } else if (initialValue) {
    select.value = FREE_INPUT;
  } else {
    select.value = '';
  }

  wrapper.appendChild(select);

  const freeInput = document.createElement('input');
  freeInput.type = 'text';
  freeInput.className = 'note-slot-free-input';
  freeInput.placeholder = '自由入力（最大20文字）';
  freeInput.maxLength = 20;
  freeInput.style.display = select.value === FREE_INPUT ? '' : 'none';
  if (initialValue && !isPreset) freeInput.value = initialValue;
  wrapper.appendChild(freeInput);

  select.addEventListener('change', () => {
    freeInput.style.display = select.value === FREE_INPUT ? '' : 'none';
    if (select.value !== FREE_INPUT) freeInput.value = '';
  });

  wrapper.getValue = () => {
    if (select.value === FREE_INPUT) return freeInput.value.trim();
    return select.value;
  };

  return wrapper;
}

export function openNotePresetsModal(presets, currentNote, onChange) {
  closeNotePresetsModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const modal = document.createElement('div');
  modal.className = 'note-presets-modal';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = '備考';
  modal.appendChild(title);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.dataset.action = 'close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => closeNotePresetsModal());
  modal.appendChild(closeButton);

  const [first = '', second = ''] = (currentNote || '').split('・');

  const slot1 = makeNoteSlot('備考1', presets, first);
  const slot2 = makeNoteSlot('備考2', presets, second);
  modal.appendChild(slot1);
  modal.appendChild(slot2);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'note-presets-confirm';
  confirmButton.textContent = '決定';
  confirmButton.addEventListener('click', () => {
    const v1 = slot1.getValue();
    const v2 = slot2.getValue();
    const result = [v1, v2].filter(Boolean).join('・');
    onChange(result);
    closeNotePresetsModal();
  });
  modal.appendChild(confirmButton);

  document.body.appendChild(modal);
  currentModal = modal;

  outsideClickHandler = (event) => {
    if (!modal.contains(event.target)) closeNotePresetsModal();
  };
  document.addEventListener('click', outsideClickHandler, { capture: true });
}

export function closeNotePresetsModal() {
  if (currentModal) { currentModal.remove(); currentModal = null; }
  if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler, { capture: true });
    outsideClickHandler = null;
  }
}
