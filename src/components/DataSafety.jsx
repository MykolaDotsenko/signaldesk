import { useRef, useState } from "react";
import {
  getBackupFilename,
  MAX_BACKUP_BYTES,
  parseBackup,
  serializeBackup,
} from "../lib/backup";
import "./DataSafety.css";

export const DataSafety = ({ posts, onRestore, onAudioCue }) => {
  const fileInputRef = useRef(null);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [message, setMessage] = useState(null);

  const handleExport = () => {
    const blob = new Blob([serializeBackup(posts)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getBackupFilename();
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setMessage({
      kind: "success",
      text: `Backup exported with ${posts.length} ${posts.length === 1 ? "signal" : "signals"}.`,
    });
    void onAudioCue?.("confirm");
  };

  const handleFileSelection = async (event) => {
    const [file] = event.target.files ?? [];
    event.target.value = "";

    if (!file) return;

    if (file.size > MAX_BACKUP_BYTES) {
      setPendingRestore(null);
      setMessage({
        kind: "error",
        text: "That backup is too large to restore safely.",
      });
      void onAudioCue?.("error");
      return;
    }

    try {
      const restoredPosts = parseBackup(await file.text());
      setPendingRestore({
        fileName: file.name,
        posts: restoredPosts,
      });
      setMessage(null);
    } catch (error) {
      setPendingRestore(null);
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not read that backup.",
      });
      void onAudioCue?.("error");
    }
  };

  const handleRestore = () => {
    if (!pendingRestore) return;

    onRestore(pendingRestore.posts);
    setMessage({
      kind: "success",
      text: `Restored ${pendingRestore.posts.length} ${pendingRestore.posts.length === 1 ? "signal" : "signals"}.`,
    });
    setPendingRestore(null);
  };

  return (
    <section className="data-safety" aria-labelledby="data-safety-title">
      <div className="data-safety-copy">
        <p className="section-kicker">Data vault</p>
        <h2 id="data-safety-title">The archive can leave the station</h2>
        <p>
          SignalDesk stores data locally. Export a JSON backup whenever the library matters,
          and restore it on this or another browser.
        </p>
      </div>

      <div className="data-safety-actions">
        <button className="button button-ghost" type="button" onClick={handleExport}>
          <span aria-hidden="true">↓</span>
          Export backup
        </button>
        <button
          className="button button-ghost"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <span aria-hidden="true">↑</span>
          Restore backup
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept=".json,application/json"
          aria-label="Restore SignalDesk backup"
          onChange={handleFileSelection}
        />
      </div>

      {pendingRestore && (
        <div className="restore-preview" role="status">
          <div>
            <strong>Ready to restore {pendingRestore.posts.length} signals</strong>
            <span>
              {pendingRestore.fileName} will replace the current library.
            </span>
          </div>
          <div className="restore-preview-actions">
            <button className="text-button" type="button" onClick={() => setPendingRestore(null)}>
              Cancel
            </button>
            <button className="button button-primary button-compact" type="button" onClick={handleRestore}>
              Restore now
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`data-safety-message is-${message.kind}`}
          role={message.kind === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </section>
  );
};
