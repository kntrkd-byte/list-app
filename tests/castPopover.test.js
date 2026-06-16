import { describe, it, expect, vi, afterEach } from 'vitest';
import { openCastPopover, closeCastPopover } from '../js/castPopover.js';

function makeAnchor() {
  const button = document.createElement('button');
  document.body.appendChild(button);
  return button;
}

describe('castPopover', () => {
  afterEach(() => {
    closeCastPopover();
    document.body.innerHTML = '';
  });

  it('renders a button per cast plus a clear option', () => {
    const anchor = makeAnchor();
    const casts = [{ name: 'マイ' }, { name: 'リン' }];

    const popover = openCastPopover(anchor, casts, () => {});

    const buttons = popover.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].textContent).toBe('マイ');
    expect(buttons[1].textContent).toBe('リン');
    expect(buttons[2].textContent).toBe('未指名にする');
  });

  it('calls onSelect with the cast name and closes the popover', () => {
    const anchor = makeAnchor();
    const onSelect = vi.fn();

    const popover = openCastPopover(anchor, [{ name: 'マイ' }], onSelect);
    popover.querySelector('button').click();

    expect(onSelect).toHaveBeenCalledWith('マイ');
    expect(document.querySelector('.cast-popover')).toBeNull();
  });

  it('calls onSelect with an empty string when clear is clicked', () => {
    const anchor = makeAnchor();
    const onSelect = vi.fn();

    const popover = openCastPopover(anchor, [{ name: 'マイ' }], onSelect);
    popover.querySelector('.cast-popover-clear').click();

    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('closes an existing popover when opened again', () => {
    const anchor = makeAnchor();

    const first = openCastPopover(anchor, [{ name: 'マイ' }], () => {});
    openCastPopover(anchor, [{ name: 'リン' }], () => {});

    expect(document.body.contains(first)).toBe(false);
    expect(document.querySelectorAll('.cast-popover')).toHaveLength(1);
  });
});
