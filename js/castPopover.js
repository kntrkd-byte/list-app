let currentPopover = null;
let currentOverlay = null;
let outsideClickHandler = null;

export function openCastPopover(anchorEl, casts, onSelect) {
  closeCastPopover();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const popover = document.createElement('div');
  popover.className = 'cast-popover';

  for (const cast of casts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = cast.name;
    button.addEventListener('click', () => {
      onSelect(cast.name);
      closeCastPopover();
    });
    popover.appendChild(button);
  }

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'cast-popover-clear';
  clearButton.textContent = '未指名にする';
  clearButton.addEventListener('click', () => {
    onSelect('');
    closeCastPopover();
  });
  popover.appendChild(clearButton);

  document.body.appendChild(popover);
  currentPopover = popover;

  outsideClickHandler = (event) => {
    if (!popover.contains(event.target) && event.target !== anchorEl) {
      closeCastPopover();
    }
  };
  document.addEventListener('click', outsideClickHandler, { capture: true });

  return popover;
}

export function closeCastPopover() {
  if (currentPopover) {
    currentPopover.remove();
    currentPopover = null;
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
