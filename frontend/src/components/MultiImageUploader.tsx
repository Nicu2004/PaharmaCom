import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import "./MultiImageUploader.css";

interface Item {
  id: string;
  name: string;
  sizeKb: number;
  dataUri: string; // "data:image/jpeg;base64,...." — the string that goes to the backend
}

interface Props {
  /** Called with the full list of base64 strings every time it changes. */
  onChange: (images: string[]) => void;
  maxFiles?: number;
  maxFileMB?: number;
}

const MAX_SIDE = 1280; // larger photos are scaled down: smaller upload, faster AI analysis

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** File -> base64 data URI. Photos are scaled to MAX_SIDE and saved as JPEG. */
async function fileToBase64(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#ffffff"; // JPEG has no transparency
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    // a format the browser can't decode: send the original file as it is
    return readAsDataURL(file);
  }
}

async function toItem(file: File): Promise<Item> {
  const dataUri = await fileToBase64(file);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    sizeKb: Math.round((dataUri.length * 3) / 4 / 1024),
    dataUri,
  };
}

export default function MultiImageUploader({ onChange, maxFiles = 5, maxFileMB = 10 }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: Item[]) => {
    setItems(next);
    onChange(next.map((i) => i.dataUri));
  };

  const addFiles = async (fileList: FileList | File[]) => {
    if (busy) return;
    setError("");

    const room = maxFiles - items.length;
    if (room <= 0) {
      setError(`Poți adăuga cel mult ${maxFiles} fotografii.`);
      return;
    }

    const accepted: File[] = [];
    const problems: string[] = [];
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith("image/")) problems.push(`${f.name} nu este o imagine.`);
      else if (f.size > maxFileMB * 1024 * 1024) problems.push(`${f.name} depășește ${maxFileMB} MB.`);
      else accepted.push(f);
    }
    if (accepted.length > room) {
      problems.push(`Am păstrat doar primele ${room} fotografii (maximum ${maxFiles}).`);
      accepted.length = room;
    }

    if (accepted.length > 0) {
      setBusy(true);
      try {
        const added = await Promise.all(accepted.map(toItem));
        commit([...items, ...added]);
      } catch {
        problems.push("Nu am putut citi una dintre fotografii.");
      } finally {
        setBusy(false);
      }
    }
    if (problems.length > 0) setError(problems.join(" "));
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void addFiles(e.target.files);
    e.target.value = ""; // lets the same file be picked again after removing it
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  const remove = (id: string) => {
    setError("");
    commit(items.filter((i) => i.id !== id));
  };

  return (
    <div className="hero__upload-control">
      <div
        className="hero__upload-dropzone"
        data-dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div data-featured-icon>
          <svg data-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <div>
            <label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onInputChange}
                disabled={busy || items.length >= maxFiles}
              />
              <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || items.length >= maxFiles}>
                {busy ? "Se procesează…" : "Alege fotografii"}
              </button>
            </label>
            <span data-upload-desktop>sau trage-le aici</span>
            <span data-upload-mobile>din galerie sau cameră</span>
          </div>
          <p>
            Fotografii JPG, PNG sau WebP, până la {maxFileMB} MB fiecare ({items.length}/{maxFiles}).
          </p>
        </div>
      </div>

      {error && (
        <p className="mi-error" role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <ul className="hero__upload-list">
          {items.map((item) => (
            <li key={item.id} className="hero__upload-file">
              <img src={item.dataUri} alt="" />
              <span className="hero__upload-file-name">{item.name}</span>
              <span className="hero__upload-file-size">{item.sizeKb} KB</span>
              <button type="button" className="hero__upload-remove" onClick={() => remove(item.id)}>
                Șterge
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}