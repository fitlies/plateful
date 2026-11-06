// Camera barcode scanning. Uses the browser's own BarcodeDetector when it supports food barcodes,
// otherwise the ZXing WebAssembly decoder bundled with the app (never fetched from a CDN).
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

let detectorPromise: Promise<Detector> | null = null;

async function nativeDetector(): Promise<Detector | null> {
  const Native = (globalThis as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector;
  if (!Native) return null;
  try {
    const supported = await Native.getSupportedFormats();
    const formats = FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new Native({ formats }) : null;
  } catch {
    return null;
  }
}

export function getDetector(): Promise<Detector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const native = await nativeDetector();
      if (native) return native;
      const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
      prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
        fireImmediately: true,
      });
      return new BarcodeDetector({ formats: FORMATS as never }) as unknown as Detector;
    })();
  }
  return detectorPromise;
}

export type CameraError = "denied" | "no-camera" | "insecure" | "other";

export async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) throw Object.assign(new Error("insecure"), { kind: "insecure" as CameraError });
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no-camera"), { kind: "no-camera" as CameraError });
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    const name = (e as DOMException).name;
    const kind: CameraError = name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "no-camera" : "other";
    throw Object.assign(new Error(kind), { kind });
  }
}

/** Polls frames from a playing <video> until a barcode is read or `signal` aborts. */
export async function scanVideo(video: HTMLVideoElement, signal: AbortSignal): Promise<string> {
  const detector = await getDetector();
  return new Promise((resolve, reject) => {
    let busy = false;
    const tick = async () => {
      if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
      if (!busy && video.readyState >= 2) {
        busy = true;
        try {
          const found = await detector.detect(video);
          const code = found.find((b) => /^\d{8,14}$/.test(b.rawValue))?.rawValue;
          if (code) return resolve(code);
        } catch {
          /* a bad frame; keep going */
        }
        busy = false;
      }
      setTimeout(tick, 180);
    };
    tick();
  });
}
