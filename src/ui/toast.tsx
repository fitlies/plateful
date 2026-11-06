import { useEffect, useState } from "preact/hooks";

interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

let push: ((t: ToastMsg) => void) | null = null;
let seq = 0;

export function toast(text: string, action?: ToastMsg["action"]) {
  push?.({ id: ++seq, text, action });
}

export function ToastHost({ high }: { high?: boolean }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    push = setMsg;
    return () => {
      push = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg((m) => (m?.id === msg.id ? null : m)), msg.action ? 5000 : 2800);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div class={`toast${high ? " high" : ""}`} role="status" aria-live="polite">
      <span>{msg.text}</span>
      {msg.action && (
        <button
          onClick={() => {
            msg.action!.run();
            setMsg(null);
          }}
        >
          {msg.action.label}
        </button>
      )}
    </div>
  );
}
