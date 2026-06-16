const GROUP_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6];

let currentModal = null;
let currentOverlay = null;
let currentKeydownHandler = null;

export function openNewVisitModal(onConfirm) {
  closeNewVisitModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => {
    closeNewVisitModal();
  });
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const modal = document.createElement('div');
  modal.className = 'new-visit-modal';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.dataset.action = 'close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    closeNewVisitModal();
  });
  modal.appendChild(closeButton);

  let selectedSize = GROUP_SIZE_OPTIONS[0];

  const optionsRow = document.createElement('div');
  optionsRow.className = 'group-size-options';

  const sizeButtons = [];

  for (const size of GROUP_SIZE_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${size}名`;
    button.dataset.size = String(size);
    button.addEventListener('click', () => {
      selectedSize = size;
      customInput.value = '';
      for (const b of sizeButtons) {
        b.classList.remove('selected');
      }
      button.classList.add('selected');
    });
    sizeButtons.push(button);
    optionsRow.appendChild(button);
  }

  sizeButtons[0].classList.add('selected');

  const customInput = document.createElement('input');
  customInput.type = 'number';
  customInput.min = '1';
  customInput.placeholder = '他';
  customInput.addEventListener('change', () => {
    const value = Number(customInput.value);
    if (value > 0) {
      selectedSize = value;
    }
    for (const b of sizeButtons) {
      b.classList.remove('selected');
    }
  });
  optionsRow.appendChild(customInput);

  modal.appendChild(optionsRow);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'new-visit-confirm';
  confirmButton.textContent = '来店登録';
  confirmButton.addEventListener('click', () => {
    onConfirm(selectedSize);
    closeNewVisitModal();
  });
  modal.appendChild(confirmButton);

  document.body.appendChild(modal);
  currentModal = modal;

  currentKeydownHandler = (event) => {
    if (event.key === 'Escape') {
      closeNewVisitModal();
    }
  };
  document.addEventListener('keydown', currentKeydownHandler);

  return modal;
}

export function closeNewVisitModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  if (currentKeydownHandler) {
    document.removeEventListener('keydown', currentKeydownHandler);
    currentKeydownHandler = null;
  }
}
