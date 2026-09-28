import { AudioConsole } from "./AudioConsole";

export const AppHeader = ({
  onNewPost,
  persistenceStatus,
  audioMode,
  audioVolume,
  onAudioModeChange,
  onAudioVolumeChange,
}) => {
  const isPersistent = persistenceStatus === "ok";

  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="SignalDesk home">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>
          <strong>SignalDesk</strong>
          <small>Bridge archive console</small>
        </span>
      </a>

      <div className="topbar-actions">
        <span
          className={`privacy-pill ${isPersistent ? "" : "is-warning"}`}
          role={isPersistent ? undefined : "status"}
        >
          <span className="privacy-dot" aria-hidden="true" />
          {isPersistent ? "Archive local · nominal" : "Session only · backup advised"}
        </span>

        <AudioConsole
          mode={audioMode}
          volume={audioVolume}
          onModeChange={onAudioModeChange}
          onVolumeChange={onAudioVolumeChange}
        />

        <button className="button button-primary button-compact" type="button" onClick={onNewPost}>
          <span aria-hidden="true">＋</span>
          New signal
        </button>
      </div>
    </header>
  );
};
