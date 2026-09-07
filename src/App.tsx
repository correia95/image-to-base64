import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OUTPUTS, OutputKind, fmtBytes, parseDataUri, renderOutput } from './b64img';

type Mode = 'encode' | 'decode';
const LS = 'image-to-base64:v1';

interface Loaded {
  name: string;
  type: string;
  size: number;
  dataUri: string;
  width: number;
  height: number;
}

export default function App() {
  const [mode, setMode] = useState<Mode>('encode');
  const [out, setOut] = useState<OutputKind>(() => {
    try {
      const k = localStorage.getItem(LS);
      return (OUTPUTS as readonly string[]).includes(k || '') ? (k as OutputKind) : 'Data URI';
    } catch {
      return 'Data URI';
    }
  });
  const [img, setImg] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyT = useRef<number>();

  const [decodeIn, setDecodeIn] = useState('');
  const decoded = useMemo(() => parseDataUri(decodeIn), [decodeIn]);

  useEffect(() => {
    try { localStorage.setItem(LS, out); } catch { /* ignore */ }
  }, [out]);

  const handleFile = useCallback((file: File) => {
    setErr(null);
    if (!file.type.startsWith('image/')) {
      setErr('That doesn’t look like an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErr('Image is over 12 MB — that’s too big to be a practical data URI.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result);
      const probe = new Image();
      probe.onload = () => {
        setImg({ name: file.name, type: file.type, size: file.size, dataUri, width: probe.width, height: probe.height });
      };
      probe.onerror = () => {
        setImg({ name: file.name, type: file.type, size: file.size, dataUri, width: 0, height: 0 });
      };
      probe.src = dataUri;
    };
    reader.onerror = () => setErr('Could not read that file.');
    reader.readAsDataURL(file);
  }, []);

  const output = img ? renderOutput(out, img.dataUri, img.name.replace(/\.[^.]+$/, '')) : '';
  const encodedLen = img ? img.dataUri.length : 0;
  const bloat = img && img.size ? Math.round(((encodedLen - img.size) / img.size) * 100) : 0;

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      window.clearTimeout(copyT.current);
      copyT.current = window.setTimeout(() => setCopied(false), 1300);
    }).catch(() => {});
  };

  return (
    <div className="wrap">
      <header>
        <h1>Image to Base64</h1>
        <p className="sub">
          Turn an image into a Base64 data URI you can paste straight into HTML, CSS or Markdown —
          or decode a data URI back to an image. The file never leaves your browser.
        </p>
      </header>

      <div className="seg">
        <button className={mode === 'encode' ? 'on' : ''} onClick={() => setMode('encode')}>Image → Base64</button>
        <button className={mode === 'decode' ? 'on' : ''} onClick={() => setMode('decode')}>Base64 → Image</button>
      </div>

      {mode === 'encode' ? (
        <>
          <label
            className={'drop' + (dragOver ? ' over' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <span>{img ? <><strong>{img.name}</strong><br />Drop another image or click to replace</> : 'Drop an image here, or click to choose one'}</span>
          </label>

          {err && <p className="err">{err}</p>}

          {img && (
            <>
              <div className="preview">
                <img src={img.dataUri} alt={img.name} />
                <dl>
                  <div><dt>Type</dt><dd>{img.type}</dd></div>
                  {img.width > 0 && <div><dt>Dimensions</dt><dd>{img.width} × {img.height}</dd></div>}
                  <div><dt>File size</dt><dd>{fmtBytes(img.size)}</dd></div>
                  <div><dt>Encoded size</dt><dd>{fmtBytes(encodedLen)} <span className="bloat">+{bloat}%</span></dd></div>
                </dl>
              </div>

              <div className="outrow">
                <div className="seg small">
                  {OUTPUTS.map((k) => (
                    <button key={k} className={out === k ? 'on' : ''} onClick={() => setOut(k)}>{k}</button>
                  ))}
                </div>
                <button className="copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
              </div>
              <textarea className="code" readOnly value={output} spellCheck={false} onFocus={(e) => e.currentTarget.select()} />
            </>
          )}
        </>
      ) : (
        <>
          <textarea
            className="code in"
            value={decodeIn}
            spellCheck={false}
            onChange={(e) => setDecodeIn(e.target.value)}
            placeholder="Paste a data URI:  data:image/png;base64,iVBORw0KGgo…"
          />
          {decodeIn.trim() && !decoded && <p className="err">That isn’t a valid data URI.</p>}
          {decoded && (
            <div className="preview">
              <img src={decodeIn.trim()} alt="Decoded" />
              <dl>
                <div><dt>MIME type</dt><dd>{decoded.mime}</dd></div>
                <div><dt>Decoded size</dt><dd>{fmtBytes(decoded.bytes)}</dd></div>
                <div><dt>Data URI length</dt><dd>{fmtBytes(decodeIn.trim().length)}</dd></div>
              </dl>
              <a
                className="dl"
                href={decodeIn.trim()}
                download={`image.${(decoded.mime.split('/')[1] || 'bin').replace('+xml', '').replace('jpeg', 'jpg')}`}
              >
                Download image
              </a>
            </div>
          )}
        </>
      )}

      <section className="explain">
        <h2>When to use a data URI</h2>
        <p>
          A data URI embeds the image directly in your HTML or CSS, so the browser doesn't make a
          separate request for it. That's handy for tiny icons, email templates, single-file demos
          and inline SVGs. Base64 makes the data about <strong>33% larger</strong>, and a big inline
          image can't be cached on its own, so keep it for small assets — under a few kilobytes is
          the usual rule of thumb.
        </p>
        <h3>Which output should I copy?</h3>
        <p>
          <strong>Data URI</strong> is the raw string for a <code>src</code> or CSS
          <code> url()</code>. The other options wrap it: a ready <code>&lt;img&gt;</code> tag, a CSS
          <code> background-image</code> declaration or rule, or Markdown image syntax.
        </p>
        <h3>Is my image uploaded anywhere?</h3>
        <p>
          No. It's read with the browser's <code>FileReader</code> and encoded locally. Nothing is
          sent to a server and the page works offline once loaded.
        </p>
        <h3>Can I go the other way?</h3>
        <p>
          Yes — the “Base64 → Image” tab takes a data URI, previews it and offers a download.
        </p>
        <footer>Image to Base64 · client-side · no sign-up · works offline</footer>
      </section>
    </div>
  );
}
