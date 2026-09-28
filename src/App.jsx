import { useEffect, useMemo, useRef, useState, useReducer } from "react";
import "./App.css";
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
      return;
    }

    dispatch({
      type: "post/created",
      post: createPost(draft, createId(), now),
    });
  };

  const handleDelete = (id) => {
    dispatch({ type: "post/deleted", id });
    if (editingId === id) setEditingId(null);
  };

  const handleEdit = (id) => {
    setEditingId(id);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleNewPost = () => {
    setEditingId(null);
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRestore = (posts) => {
    dispatch({ type: "library/replaced", posts });
    setEditingId(null);
    setQuery("");
    setView("all");
    setSort("updated-desc");
  };

  return (
    <div className="app-shell" id="top">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <AppHeader onNewPost={handleNewPost} persistenceStatus={persistenceStatus} />

      <main className="workspace">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Local-first research console</p>
            <h1 id="hero-title">
              Keep the useful things.
              <span> Lose the noise.</span>
            </h1>
            <p className="hero-copy">
              Capture ideas, research notes, and links in seconds. Search them later
              without an account, cloud sync, or another inbox to maintain.
            </p>
          </div>
          <div className="hero-shortcuts" aria-label="Keyboard shortcuts">
            <span><kbd>N</kbd> new post</span>
            <span><kbd>/</kbd> search</span>
          </div>
        </section>

        <StatsStrip stats={stats} />

        <DataSafety posts={state.posts} onRestore={handleRestore} />

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
              onViewChange={setView}
              onSortChange={setSort}
            />

            <PostList
              posts={visiblePosts}
              hasPosts={state.posts.length > 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={(id) => dispatch({ type: "post/favoriteToggled", id })}
              onTogglePinned={(id) => dispatch({ type: "post/pinnedToggled", id })}
              onResetFilters={() => {
                setQuery("");
                setView("all");
                setSort("updated-desc");
              }}
            />
          </section>
        </div>
      </main>

      {state.lastDeleted && (
        <div className="undo-toast" role="status">
          <span>“{state.lastDeleted.post.title}” removed</span>
          <button type="button" onClick={() => dispatch({ type: "post/restored" })}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
