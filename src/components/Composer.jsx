import { forwardRef, useEffect, useState } from "react";

const EMPTY_DRAFT = {
  title: "",
  body: "",
  kind: "note",
  tags: "",
};

const toDraft = (post) =>
  post
    ? {
        title: post.title,
        body: post.body,
        kind: post.kind,
        tags: post.tags.join(", "),
      }
    : EMPTY_DRAFT;

export const Composer = forwardRef(function Composer(
  { editingPost, onSave, onCancel },
  titleInputRef,
) {
  const [draft, setDraft] = useState(() => toDraft(editingPost));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(toDraft(editingPost));
    setError("");
  }, [editingPost]);

  const updateField = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    if (error) setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const title = draft.title.trim();
    const body = draft.body.trim();

    if (!title || !body) {
      setError("Add both a title and a note before saving.");
      return;
    }

    onSave({
      title,
      body,
      kind: draft.kind,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    if (!editingPost) {
      setDraft(EMPTY_DRAFT);
    }
    setError("");
  };

  const handleCancel = () => {
    setDraft(EMPTY_DRAFT);
    setError("");
    onCancel();
  };

  return (
    <div className="composer-card">
      <div className="card-glow" aria-hidden="true" />
      <div className="composer-heading">
        <div>
          <p className="section-kicker">{editingPost ? "Signal revision" : "Incoming signal"}</p>
          <h2>{editingPost ? "Refine the useful bit" : "Log it while the context is fresh"}</h2>
        </div>
        <span className="local-badge">local</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="signal-title">Title</label>
          <input
            id="signal-title"
            ref={titleInputRef}
            value={draft.title}
            onChange={updateField("title")}
            placeholder="What is worth remembering?"
            maxLength={120}
            autoComplete="off"
            aria-describedby="signal-title-count"
          />
          <small id="signal-title-count">{draft.title.length}/120</small>
        </div>

        <div className="field">
          <label htmlFor="signal-note">Note</label>
          <textarea
            id="signal-note"
            value={draft.body}
            onChange={updateField("body")}
            placeholder="Add context, a useful detail, or the next action…"
            maxLength={2000}
            rows={7}
            aria-describedby="signal-note-count"
          />
          <small id="signal-note-count">{draft.body.length}/2000</small>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="signal-type">Type</label>
            <select id="signal-type" value={draft.kind} onChange={updateField("kind")}>
              <option value="note">Note</option>
              <option value="idea">Idea</option>
              <option value="link">Link / source</option>
            </select>
          </div>

          <div className="field field-wide">
            <label htmlFor="signal-tags">Tags</label>
            <input
              id="signal-tags"
              value={draft.tags}
              onChange={updateField("tags")}
              placeholder="research, product, idea"
              autoComplete="off"
              aria-describedby="signal-tags-hint"
            />
            <small id="signal-tags-hint">Comma separated · max 6</small>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="composer-actions">
          {editingPost && (
            <button className="button button-ghost" type="button" onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button className="button button-primary" type="submit">
            <span aria-hidden="true">{editingPost ? "✓" : "↗"}</span>
            {editingPost ? "Save changes" : "Add to SignalDesk"}
          </button>
        </div>
      </form>
    </div>
  );
});
