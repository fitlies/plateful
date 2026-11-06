import { useEffect, useRef, useState } from "preact/hooks";
import * as db from "../lib/db";
import { holdFood } from "../lib/handoff";
import { cleanBarcode, lookupBarcode } from "../lib/off";
import { openCamera, scanVideo, type CameraError } from "../lib/scanner";
import type { Meal } from "../lib/types";
import { TopBar } from "../ui/common";
import { IconPencil, IconSearch } from "../ui/icons";
import { go, href } from "../ui/router";

type State =
  | { s: "starting" }
  | { s: "scanning" }
  | { s: "camera-error"; kind: CameraError }
  | { s: "looking"; code: string }
  | { s: "missing"; code: string; name?: string; brand?: string; reason: "not-found" | "incomplete" }
  | { s: "offline"; code: string }
  | { s: "error"; code: string; message: string };

export function Scan({ date, meal }: { date: string; meal: Meal }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>({ s: "starting" });
  const [manual, setManual] = useState("");
  const [attempt, setAttempt] = useState(0);
  const params = { date, meal };

  const handle = async (code: string) => {
    setState({ s: "looking", code });
    const mine = await db.customFoodByBarcode(code);
    if (mine) return go("/food", { ...params, key: `custom:${mine.id}`, d: "3" }, false);
    const r = await lookupBarcode(code);
    if (r.status === "found") {
      holdFood(r.food);
      go("/food", { ...params, key: r.food.key, d: "3" });
    } else if (r.status === "not-found") setState({ s: "missing", code, reason: "not-found" });
    else if (r.status === "incomplete") setState({ s: "missing", code, name: r.name, brand: r.brand, reason: "incomplete" });
    else if (r.status === "offline") setState({ s: "offline", code });
    else setState({ s: "error", code, message: r.message });
  };

  useEffect(() => {
    const ctrl = new AbortController();
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await openCamera();
        if (ctrl.signal.aborted) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setState({ s: "scanning" });
        const code = await scanVideo(v, ctrl.signal);
        navigator.vibrate?.(40);
        stream.getTracks().forEach((t) => t.stop());
        handle(code);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState({ s: "camera-error", kind: ((e as { kind?: CameraError }).kind ?? "other") });
      }
    })();
    return () => {
      ctrl.abort();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  const submitManual = (e: Event) => {
    e.preventDefault();
    const code = cleanBarcode(manual);
    if (code) handle(code);
  };

  const camMsg: Record<CameraError, string> = {
    denied: "Camera access is off for Plateful. Allow it in your browser's site settings, or type the number below.",
    "no-camera": "No camera found. Type the barcode number below.",
    insecure: "The camera only works over a secure (https) connection.",
    other: "The camera couldn't start. Close other apps using it, or type the number below.",
  };

  return (
    <>
      <TopBar title="Scan barcode" />
      <div class="scanner">
        <video ref={video} playsInline muted />
        {(state.s === "starting" || state.s === "scanning") && <div class="frame" aria-hidden="true" />}
        <p class="status" role="status">
          {state.s === "starting" && "Starting camera…"}
          {state.s === "scanning" && "Hold the barcode inside the frame"}
          {state.s === "looking" && `Looking up ${state.code}…`}
          {state.s === "camera-error" && camMsg[state.kind]}
        </p>
      </div>

      <div class="page">
        {state.s === "missing" && (
          <div class="empty" style="padding:8px 0 16px">
            <strong>{state.reason === "incomplete" ? `${state.name} has no nutrition data yet` : "This barcode isn't in Open Food Facts yet"}</strong>
            Copy the numbers from the pack once, and it'll scan instantly from then on.
            <div class="chips">
              <a class="chip solid" href={href("/custom", { ...params, barcode: state.code, name: state.name, brand: state.brand })}><IconPencil size="sm" />Create this food</a>
              <button class="chip" onClick={() => setAttempt((a) => a + 1)}>Scan again</button>
            </div>
          </div>
        )}
        {state.s === "offline" && (
          <div class="warn">You're offline, so {state.code} can't be looked up. Try again when you're connected, or use quick add.</div>
        )}
        {state.s === "error" && <div class="warn">{state.message}</div>}

        <form onSubmit={submitManual}>
          <label class="field">
            <span>Or type the barcode number</span>
            <div class="input-unit">
              <input class="input num" inputMode="numeric" pattern="[0-9 ]*" placeholder="e.g. 8888196173208" value={manual} onInput={(e) => setManual(e.currentTarget.value)} />
              <button class="btn" type="submit" disabled={!cleanBarcode(manual)} aria-label="Look up barcode" style="min-height:48px;padding:0 14px"><IconSearch /></button>
            </div>
          </label>
        </form>
        <p class="attrib">Barcodes are looked up on Open Food Facts, a free, open database. Only the barcode number is sent; nothing else leaves your phone.</p>
      </div>
    </>
  );
}
