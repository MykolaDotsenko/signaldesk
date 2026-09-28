const MODE_LABELS = {
  off: "Off",
  ambient: "Ambient",
  cinematic: "Cinematic",
};

export const AudioConsole = ({ mode, volume, onModeChange, onVolumeChange }) => (
  <details className="audio-console" data-mode={mode}>
    <summary aria-label={`Audio controls. Current mode: ${MODE_LABELS[mode]}`}>
      <span className="audio-console-indicator" aria-hidden="true" />
      <span className="audio-console-label">AUDIO</span>
      <strong>{MODE_LABELS[mode]}</strong>
    </summary>

    <div className="audio-console-panel">
      <div className="audio-console-heading">
        <span>Bridge audio</span>
        <small>original procedural mix</small>
      </div>

      <div className="audio-mode-grid" aria-label="Audio mode">
        {Object.entries(MODE_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "is-active" : ""}
            aria-pressed={mode === value}
            onClick={() => onModeChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="audio-volume">
        <span>Output</span>
        <input
          type="range"
          min="0"
          max="0.7"
          step="0.01"
          value={volume}
          onChange={(event) => onVolumeChange(event.target.value)}
          aria-label="Audio output volume"
        />
        <output>{Math.round((volume / 0.7) * 100)}%</output>
      </label>

      <p>
        Ambient uses a low ship hum. Cinematic layers an original evolving space-opera pad.
      </p>
    </div>
  </details>
);
