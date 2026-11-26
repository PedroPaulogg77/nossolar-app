"use client";
import { useState } from "react";
export function PinterestReference({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  let id: string | undefined;
  try {
    const parsed = new URL(url);
    if (/^(www\.)?pinterest\.(com|com\.br|co\.uk|pt)$/.test(parsed.hostname))
      id = parsed.pathname.match(/^\/pin\/(\d+)\/?$/)?.[1];
  } catch {
    return null;
  }
  if (!id) return null;
  return (
    <div className="pinterest-reference">
      {!open ? (
        <button
          type="button"
          className="secondary"
          onClick={() => setOpen(true)}
        >
          Visualizar Pin do Pinterest
        </button>
      ) : (
        <iframe
          title="Pin do Pinterest"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          srcDoc={`<!doctype html><html><body><a data-pin-do="embedPin" data-pin-width="medium" href="https://www.pinterest.com/pin/${id}/">Ver Pin</a><script async defer src="https://assets.pinterest.com/js/pinit.js"></script></body></html>`}
        />
      )}
      <p className="hint">
        A visualização usa o widget oficial do Pinterest. Se ele não carregar, o
        link original e suas fotos continuam disponíveis.
      </p>
    </div>
  );
}
