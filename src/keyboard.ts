import React from "react";
import type { SolmuSelection } from "./types";

/**
 * Describes a keyboard shortcut binding.
 * `mod` means Ctrl on Windows/Linux, Cmd on Mac.
 */
export type KeyBinding = {
  key: string;          // KeyboardEvent.key value (e.g. "a", "Delete", "z", "ArrowUp")
  mod?: boolean;        // Ctrl / Cmd required
  shift?: boolean;      // Shift required
  alt?: boolean;        // Alt / Option required
  action: () => void;
  /** If true, preventDefault is NOT called. Default: false (preventDefault is called). */
  passthrough?: boolean;
};

export type UseSolmuKeyboardParams = {
  /** Custom key bindings. Checked first; if matched, built-in bindings are skipped. */
  bindings?: KeyBinding[];
  /**
   * Built-in actions. Provide callbacks to enable them.
   * Omit a callback to disable that built-in shortcut.
   */
  actions?: {
    deleteSelected?: () => void;       // Delete / Backspace
    selectAll?: () => void;            // Mod+A
    deselect?: () => void;             // Escape
    undo?: () => void;                 // Mod+Z
    redo?: () => void;                 // Mod+Shift+Z
    /** Arrow key nudge. Called with dx, dy in world units. */
    nudge?: (dx: number, dy: number) => void;
    /** Nudge step size in world units. Default: 1 */
    nudgeStep?: number;
  };
  /** Set to false to temporarily disable all keyboard handling. Default: true */
  enabled?: boolean;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function matchesBinding(e: KeyboardEvent, b: KeyBinding): boolean {
  if (e.key.toLowerCase() !== b.key.toLowerCase() && e.key !== b.key) return false;
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (b.mod && !mod) return false;
  if (!b.mod && mod) return false;
  if (b.shift && !e.shiftKey) return false;
  if (!b.shift && e.shiftKey) return false;
  if (b.alt && !e.altKey) return false;
  if (!b.alt && e.altKey) return false;
  return true;
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((document.activeElement as HTMLElement)?.isContentEditable) return true;
  return false;
}

/**
 * Hook that registers keyboard shortcuts for diagram interactions.
 *
 * Built-in shortcuts (enabled by providing the corresponding action callback):
 * - Delete / Backspace → deleteSelected
 * - Mod+A → selectAll
 * - Escape → deselect
 * - Mod+Z → undo
 * - Mod+Shift+Z → redo
 * - Arrow keys → nudge (1 unit; hold Shift for 10×)
 *
 * Custom bindings are checked first and take precedence.
 * All shortcuts are suppressed when an input/textarea/select is focused.
 */
export function useSolmuKeyboard({
  bindings = [],
  actions = {},
  enabled = true,
}: UseSolmuKeyboardParams) {
  React.useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;

      // Check custom bindings first
      for (const binding of bindings) {
        if (matchesBinding(e, binding)) {
          if (!binding.passthrough) e.preventDefault();
          binding.action();
          return;
        }
      }

      // Built-in: Delete / Backspace → deleteSelected
      if (actions.deleteSelected && (e.key === "Delete" || e.key === "Backspace")) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          actions.deleteSelected();
          return;
        }
      }

      // Built-in: Mod+A → selectAll
      if (actions.selectAll && e.key.toLowerCase() === "a" && (isMac ? e.metaKey : e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        actions.selectAll();
        return;
      }

      // Built-in: Escape → deselect
      if (actions.deselect && e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        actions.deselect();
        return;
      }

      // Built-in: Mod+Z → undo, Mod+Shift+Z → redo
      if (e.key.toLowerCase() === "z" && (isMac ? e.metaKey : e.ctrlKey) && !e.altKey) {
        if (e.shiftKey && actions.redo) {
          e.preventDefault();
          actions.redo();
          return;
        }
        if (!e.shiftKey && actions.undo) {
          e.preventDefault();
          actions.undo();
          return;
        }
      }

      // Built-in: Arrow keys → nudge
      if (actions.nudge) {
        const step = (actions.nudgeStep ?? 1) * (e.shiftKey ? 10 : 1);
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            actions.nudge(0, -step);
            return;
          case "ArrowDown":
            e.preventDefault();
            actions.nudge(0, step);
            return;
          case "ArrowLeft":
            e.preventDefault();
            actions.nudge(-step, 0);
            return;
          case "ArrowRight":
            e.preventDefault();
            actions.nudge(step, 0);
            return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, bindings, actions]);
}
