type Listener = () => void;

type Toast = { id: number; message: string };

let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function addToast(message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3000);
}

export function useToasts() {
  const [, setState] = useState(0);
  const listener: Listener = () => setState((n) => n + 1);

  useEffect(() => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return toasts;
}

import { useState, useEffect } from 'react';
