let currentModal = null;
let currentOverlay = null;
let outsideClickHandler = null;

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
  title.textContent = '備考を選択';
  modal.appendChild(title);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.dataset.action = 'close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => closeNotePresetsModal());
  modal.appendChild(closeButton);

  const selectedDisplay = document.createElement('div');
  selectedDisplay.className = 'note-presets-selected';
  const [first = '', second = ''] = (currentNote || '').split('・');
  selectedDisplay.innerHTML = `<span>選択中:</span> <span class="note-selected-1">${first}</span><span class="note-selected-sep"> / </span><span class="note-selected-2">${second}</span>`;
  modal.appendChild(selectedDisplay);

  const presetsContainer = document.createElement('div');
  presetsContainer.className = 'note-presets-buttons';

  const selected = new Set();
  if (first) selected.add(first);
  if (second) selected.add(second);

  for (const preset of presets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-preset-btn';
    button.textContent = preset.text;
    if (selected.has(preset.text)) {
      button.classList.add('selected');
    }
    button.addEventListener('click', () => {
      if (selected.has(preset.text)) {
        selected.delete(preset.text);
        button.classList.remove('selected');
      } else if (selected.size < 2) {
        selected.add(preset.text);
        button.classList.add('selected');
      }
      updateDisplay();
    });
    presetsContainer.appendChild(button);
  }

  function updateDisplay() {
    const items = Array.from(selected);
    selectedDisplay.innerHTML = `<span>選択中:</span> <span class="note-selected-1">${items[0] || ''}</span><span class="note-selected-sep"> / </span><span class="note-selected-2">${items[1] || ''}</span>`;
  }

  modal.appendChild(presetsContainer);

  const inputSection = document.createElement('div');
  inputSection.className = 'note-presets-input-section';

  const inputLabel = document.createElement('div');
  inputLabel.className = 'note-presets-input-label';
  inputLabel.textContent = 'または自由入力:';
  inputSection.appendChild(inputLabel);

  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'note-presets-custom-input';
  customInput.placeholder = 'フリー入力（最大20文字）';
  customInput.maxLength = 20;
  inputSection.appendChild(customInput);

  modal.appendChild(inputSection);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'note-presets-confirm';
  confirmButton.textContent = '決定';
  confirmButton.addEventListener('click', () => {
    const items = Array.from(selected);
    const customText = customInput.value.trim();

    let result = '';
    if (customText) {
      result = customText;
    } else if (items.length > 0) {
      result = items.join('・');
    }

    onChange(result);
    closeNotePresetsModal();
  });
  modal.appendChild(confirmButton);

  document.body.appendChild(modal);
  currentModal = modal;

  outsideClickHandler = (event) => {
    if (!modal.contains(event.target)) {
      closeNotePresetsModal();
    }
  };
  document.addEventListener('click', outsideClickHandler, { capture: true });
}

export function closeNotePresetsModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler, { capture: true });
    outsideClickHandler = null;
  }
}
