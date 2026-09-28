import { useEffect, useMemo, useRef, useState, useReducer } from "react";
import "./App.css";
import "./Bridge.css";
import { AppHeader } from "./components/AppHeader";
import { Composer } from "./components/Composer";
import { DataSafety } from "./components/DataSafety";
import { FilterBar } from "./components/FilterBar";
import { PostList } from "./components/PostList";
import { StatsStrip } from "./components/StatsStrip";
import {
  createPost,
  getPostStats,
  getVisiblePosts,
  postsReducer,
} from "./domain/posts";
import { useShipAudio } from "./audio/useShipAudio";
import { loadPosts, savePosts } from "./lib/storage";

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `signal-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const App = () => {
  const [state, dispatch] = useReducer(postsReducer, undefined, () => ({
    posts: loadPosts(),
    lastDeleted: null,
  }));
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("updated-desc");
  const [editingId, setEditingId] = useState(null);
  const [persistenceStatus, setPersistenceStatus] = useState("ok");
  const {
    mode: audioMode,
    volume: audioVolume,
    activateMode: setAudioMode,
    setVolume: setAudioVolume,
    playCue,
  } = useShipAudio();

  const composerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const nextStatus = savePosts(state.posts) ? "ok" : "memory-only";
    if (nextStatus === persistenceStatus) return undefined;

    const timer = window.setTimeout(() => {
      setPersistenceStatus(nextStatus);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [persistenceStatus, state.posts]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const element = event.target;
      const isTyping =
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement ||
        element?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key.toLowerCase() === "n" && !isTyping) {
        event.preventDefault();
        composerRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const editingPost = useMemo(
    () => state.posts.find((post) => post.id === editingId) ?? null,
    [editingId, state.posts],
  );

  const visiblePosts = useMemo(
    () => getVisiblePosts(state.posts, { query, view, sort }),
    [query, sort, state.posts, view],
  );

  const stats = useMemo(() => getPostStats(state.posts), [state.posts]);

  const handleSave = (draft) => {
    const now = new Date().toISOString();

    if (editingPost) {
      dispatch({
        type: "post/updated",
        id: editingPost.id,
        changes: {
          ...draft,
          updatedAt: now,
        },
      });
      setEditingId(null);
      void playCue("confirm");
      return;
    }

    dispatch({
      type: "post/created",
      post: createPost(draft, createId(), now),
    });
    void playCue("confirm");
  };

  const handleDelete = (id) => {
    dispatch({ type: "post/deleted", id });
    if (editingId === id) setEditingId(null);
    void playCue("delete");
  };

  const handleEdit = (id) => {
    setEditingId(id);
    void playCue("navigate");
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleNewPost = () => {
    setEditingId(null);
    void playCue("navigate");
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRestore = (posts) => {
    dispatch({ type: "library/replaced", posts });
    setEditingId(null);
    setQuery("");
    setView("all");
    setSort("updated-desc");
    void playCue("restore");
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    void playCue("navigate");
  };

  const handleSortChange = (nextSort) => {
    setSort(nextSort);
    void playCue("navigate");
  };

  const handleTogglePinned = (id) => {
    dispatch({ type: "post/pinnedToggled", id });
    void playCue("pin");
  };

  const handleToggleFavorite = (id) => {
    dispatch({ type: "post/favoriteToggled", id });
    void playCue("favorite");
  };

  const handleUndo = () => {
    dispatch({ type: "post/restored" });
    void playCue("undo");
  };

  return (
    <div className="app-shell" id="top">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="bridge-hull bridge-hull-left" aria-hidden="true" />
      <div className="bridge-hull bridge-hull-right" aria-hidden="true" />

      <AppHeader
        onNewPost={handleNewPost}
        persistenceStatus={persistenceStatus}
        audioMode={audioMode}
        audioVolume={audioVolume}
        onAudioModeChange={setAudioMode}
        onAudioVolumeChange={setAudioVolume}
      />

      <main className="workspace">
        <section className="hero bridge-viewport" aria-labelledby="hero-title">
          <div className="viewport-space" aria-hidden="true">
            <span className="planet-limb" />
            <span className="flight-path flight-path-one" />
            <span className="flight-path flight-path-two" />
            <span className="viewport-reticle" />
            <span className="distant-object" />
          </div>

          <div className="hero-main">
            <p className="eyebrow">Bridge archive system · SD-01</p>
            <h1 id="hero-title">
              Keep the useful things.
              <span> Lose the noise.</span>
            </h1>
            <p className="hero-copy">
              Log ideas, research notes, and useful sources while the context is fresh.
              Retrieve them later from a local archive that stays under your control.
            </p>
          </div>

          <aside className="bridge-telemetry" aria-label="Bridge status">
            <div className="radar-scope" aria-hidden="true">
              <span className="radar-sweep" />
              <i className="radar-contact contact-one" />
              <i className="radar-contact contact-two" />
              <i className="radar-contact contact-three" />
            </div>

            <dl className="bridge-readouts">
              <div>
                <dt>ARCHIVE</dt>
                <dd>{stats.total.toString().padStart(2, "0")} SIG</dd>
              </div>
              <div>
                <dt>STORAGE</dt>
                <dd className={persistenceStatus === "ok" ? "is-nominal" : "is-warning"}>
                  {persistenceStatus === "ok" ? "NOMINAL" : "MEMORY"}
                </dd>
              </div>
              <div>
                <dt>CHANNEL</dt>
                <dd>LOCAL</dd>
              </div>
            </dl>

            <div className="hero-shortcuts" aria-label="Keyboard shortcuts">
              <span><kbd>N</kbd> new signal</span>
              <span><kbd>/</kbd> archive scan</span>
            </div>
          </aside>
        </section>

        <StatsStrip stats={stats} />

        <DataSafety posts={state.posts} onRestore={handleRestore} onAudioCue={playCue} />

        <div className="workspace-grid">
          <aside className="composer-column">
            <Composer
              ref={composerRef}
              editingPost={editingPost}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          </aside>

          <section className="feed-column" aria-labelledby="feed-title">
            <div className="feed-heading">
              <div>
                <p className="section-kicker">Signal archive</p>
                <h2 id="feed-title">Stored transmissions</h2>
              </div>
              <span className="result-count" aria-live="polite">
                {visiblePosts.length} {visiblePosts.length === 1 ? "item" : "items"}
              </span>
            </div>

            <FilterBar
              query={query}
              view={view}
              sort={sort}
              stats={stats}
              searchInputRef={searchInputRef}
              onQueryChange={setQuery}
              onViewChange={handleViewChange}
              onSortChange={handleSortChange}
            />

            <PostList
              posts={visiblePosts}
              hasPosts={state.posts.length > 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onTogglePinned={handleTogglePinned}
              onResetFilters={() => {
                setQuery("");
                setView("all");
                setSort("updated-desc");
                void playCue("navigate");
              }}
            />
          </section>
        </div>
      </main>

      {state.lastDeleted && (
        <div className="undo-toast" role="status">
          <span>“{state.lastDeleted.post.title}” removed</span>
          <button type="button" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
