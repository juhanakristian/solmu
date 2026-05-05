import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSolmuKeyboard } from '../keyboard';

describe('useSolmuKeyboard', () => {
  let handler: ((e: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    handler = null;
    vi.spyOn(document, 'addEventListener').mockImplementation((event, h) => {
      if (event === 'keydown') handler = h as any;
    });
    vi.spyOn(document, 'removeEventListener').mockImplementation((event, h) => {
      if (event === 'keydown' && handler === h) handler = null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fireKey(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    });
    handler?.(event);
    return event;
  }

  it('registers and unregisters keydown listener', () => {
    const { unmount } = renderHook(() => useSolmuKeyboard({ actions: {} }));
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    unmount();
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('does not register when enabled is false', () => {
    renderHook(() => useSolmuKeyboard({ actions: {}, enabled: false }));
    expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  describe('custom bindings', () => {
    it('triggers custom binding', () => {
      const action = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [{ key: 'x', action }],
          actions: {},
        })
      );
      fireKey('x');
      expect(action).toHaveBeenCalledOnce();
    });

    it('checks mod flag for Ctrl', () => {
      const action = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [{ key: 'x', mod: true, action }],
          actions: {},
        })
      );
      fireKey('x');
      expect(action).not.toHaveBeenCalled();
      fireKey('x', { ctrlKey: true });
      expect(action).toHaveBeenCalledOnce();
    });

    it('checks shift flag', () => {
      const action = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [{ key: 'x', shift: true, action }],
          actions: {},
        })
      );
      fireKey('x');
      expect(action).not.toHaveBeenCalled();
      fireKey('x', { shiftKey: true });
      expect(action).toHaveBeenCalledOnce();
    });

    it('checks alt flag', () => {
      const action = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [{ key: 'x', alt: true, action }],
          actions: {},
        })
      );
      fireKey('x');
      expect(action).not.toHaveBeenCalled();
      fireKey('x', { altKey: true });
      expect(action).toHaveBeenCalledOnce();
    });

    it('respects passthrough flag', () => {
      const action = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [
            { key: 'x', action, passthrough: true },
          ],
          actions: {},
        })
      );
      const event = fireKey('x');
      expect(event.defaultPrevented).toBe(false);
    });

    it('prevents default by default', () => {
      const action = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [{ key: 'x', action }],
          actions: {},
        })
      );
      const event = fireKey('x');
      expect(event.defaultPrevented).toBe(true);
    });

    it('custom bindings checked before built-in', () => {
      const customAction = vi.fn();
      const builtinAction = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          bindings: [{ key: 'Delete', action: customAction }],
          actions: { deleteSelected: builtinAction },
        })
      );
      fireKey('Delete');
      expect(customAction).toHaveBeenCalledOnce();
      expect(builtinAction).not.toHaveBeenCalled();
    });
  });

  describe('built-in: delete', () => {
    it('fires deleteSelected on Delete key', () => {
      const deleteSelected = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { deleteSelected } }));
      fireKey('Delete');
      expect(deleteSelected).toHaveBeenCalledOnce();
    });

    it('fires deleteSelected on Backspace key', () => {
      const deleteSelected = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { deleteSelected } }));
      fireKey('Backspace');
      expect(deleteSelected).toHaveBeenCalledOnce();
    });

    it('does not fire when ctrl is pressed', () => {
      const deleteSelected = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { deleteSelected } }));
      fireKey('Delete', { ctrlKey: true });
      expect(deleteSelected).not.toHaveBeenCalled();
    });
  });

  describe('built-in: selectAll', () => {
    it('fires selectAll on Ctrl+A', () => {
      const selectAll = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { selectAll } }));
      fireKey('a', { ctrlKey: true });
      expect(selectAll).toHaveBeenCalledOnce();
    });

    it('does not fire on shift+ctrl+a', () => {
      const selectAll = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { selectAll } }));
      fireKey('a', { ctrlKey: true, shiftKey: true });
      expect(selectAll).not.toHaveBeenCalled();
    });
  });

  describe('built-in: deselect', () => {
    it('fires deselect on Escape', () => {
      const deselect = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { deselect } }));
      fireKey('Escape');
      expect(deselect).toHaveBeenCalledOnce();
    });

    it('does not fire with modifiers', () => {
      const deselect = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { deselect } }));
      fireKey('Escape', { shiftKey: true });
      expect(deselect).not.toHaveBeenCalled();
    });
  });

  describe('built-in: undo/redo', () => {
    it('fires undo on Ctrl+Z', () => {
      const undo = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { undo } }));
      fireKey('z', { ctrlKey: true });
      expect(undo).toHaveBeenCalledOnce();
    });

    it('fires redo on Ctrl+Shift+Z', () => {
      const redo = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { redo } }));
      fireKey('z', { ctrlKey: true, shiftKey: true });
      expect(redo).toHaveBeenCalledOnce();
    });

    it('does not fire undo when redo matches', () => {
      const undo = vi.fn();
      const redo = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { undo, redo } }));
      fireKey('z', { ctrlKey: true, shiftKey: true });
      expect(redo).toHaveBeenCalledOnce();
      expect(undo).not.toHaveBeenCalled();
    });
  });

  describe('built-in: nudge', () => {
    it('fires nudge on arrow keys', () => {
      const nudge = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { nudge } }));
      fireKey('ArrowUp');
      expect(nudge).toHaveBeenCalledWith(0, -1);
      fireKey('ArrowDown');
      expect(nudge).toHaveBeenCalledWith(0, 1);
      fireKey('ArrowLeft');
      expect(nudge).toHaveBeenCalledWith(-1, 0);
      fireKey('ArrowRight');
      expect(nudge).toHaveBeenCalledWith(1, 0);
    });

    it('multiplies by 10 with shift', () => {
      const nudge = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { nudge } }));
      fireKey('ArrowUp', { shiftKey: true });
      expect(nudge).toHaveBeenCalledWith(0, -10);
    });

    it('uses custom nudgeStep', () => {
      const nudge = vi.fn();
      renderHook(() =>
        useSolmuKeyboard({
          actions: { nudge, nudgeStep: 5 },
        })
      );
      fireKey('ArrowRight');
      expect(nudge).toHaveBeenCalledWith(5, 0);
    });

    it('does not fire when nudge is not provided', () => {
      renderHook(() => useSolmuKeyboard({ actions: {} }));
      const event = fireKey('ArrowUp');
      expect(event.defaultPrevented).toBe(false);
    });

    it('prevents default on arrow keys', () => {
      const nudge = vi.fn();
      renderHook(() => useSolmuKeyboard({ actions: { nudge } }));
      const event = fireKey('ArrowUp');
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('input focus detection', () => {
    it('blocks shortcuts when input is focused', () => {
      const deleteSelected = vi.fn();
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      renderHook(() => useSolmuKeyboard({ actions: { deleteSelected } }));
      fireKey('Delete');
      expect(deleteSelected).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('blocks shortcuts when textarea is focused', () => {
      const selectAll = vi.fn();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      renderHook(() => useSolmuKeyboard({ actions: { selectAll } }));
      fireKey('a', { ctrlKey: true });
      expect(selectAll).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('blocks shortcuts when contentEditable is focused', () => {
      const deselect = vi.fn();
      const mockEl = document.createElement('div');
      Object.defineProperty(mockEl, 'isContentEditable', { value: true });
      const original = document.activeElement;
      Object.defineProperty(document, 'activeElement', {
        value: mockEl,
        configurable: true,
      });

      renderHook(() => useSolmuKeyboard({ actions: { deselect } }));
      fireKey('Escape');
      expect(deselect).not.toHaveBeenCalled();

      Object.defineProperty(document, 'activeElement', {
        value: original,
        configurable: true,
      });
    });
  });

  describe('no built-in actions', () => {
    it('does not prevent default when no action matches', () => {
      renderHook(() => useSolmuKeyboard({ actions: {} }));
      const event = fireKey('x');
      expect(event.defaultPrevented).toBe(false);
    });

    it('does not fire unprovided actions', () => {
      renderHook(() => useSolmuKeyboard({ actions: {} }));
      const event = fireKey('Delete');
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
