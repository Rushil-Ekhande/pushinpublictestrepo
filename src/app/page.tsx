"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type DeletedTodo = Todo & {
  deletedAt: number; // timestamp when deleted
};

type ModalConfig = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
};

const initialTodos: Todo[] = [
  { id: 1, text: "Sketch the next feature", completed: true },
  { id: 2, text: "Ship the landing page", completed: false },
  { id: 3, text: "Review the pull request", completed: false },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [deletedTodos, setDeletedTodos] = useState<DeletedTodo[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [now, setNow] = useState<number>(0);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const currentNow = Date.now();
    setTimeout(() => {
      setNow(currentNow);
    }, 0);

    const savedTodos = localStorage.getItem("pushinpublic_todos");
    if (savedTodos) {
      try {
        const parsed = JSON.parse(savedTodos);
        setTimeout(() => setTodos(parsed), 0);
      } catch (e) {
        console.error("Error loading todos from localStorage:", e);
      }
    }

    const savedDeleted = localStorage.getItem("pushinpublic_deleted_todos");
    if (savedDeleted) {
      try {
        const parsed = JSON.parse(savedDeleted) as DeletedTodo[];
        // Filter out expired items (older than 24h)
        const valid = parsed.filter(
          (item) => currentNow - item.deletedAt <= 24 * 60 * 60 * 1000
        );
        setTimeout(() => setDeletedTodos(valid), 0);
        if (valid.length !== parsed.length) {
          localStorage.setItem(
            "pushinpublic_deleted_todos",
            JSON.stringify(valid)
          );
        }
      } catch (e) {
        console.error("Error loading deleted todos from localStorage:", e);
      }
    }
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  // Save to localStorage when todos change (only after mount)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("pushinpublic_todos", JSON.stringify(todos));
    }
  }, [todos, isMounted]);

  // Save to localStorage when deletedTodos change (only after mount)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(
        "pushinpublic_deleted_todos",
        JSON.stringify(deletedTodos)
      );
    }
  }, [deletedTodos, isMounted]);

  // Periodic cleanup of expired deleted todos and trigger re-render for relative times
  useEffect(() => {
    const interval = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      setDeletedTodos((current) => {
        const valid = current.filter(
          (item) => currentNow - item.deletedAt <= 24 * 60 * 60 * 1000
        );
        if (valid.length !== current.length) {
          return valid;
        }
        return current;
      });
    }, 20000); // Check/update every 20 seconds
    return () => clearInterval(interval);
  }, []);

  // Helper to format relative time ago
  function getFormattedTimeAgo(deletedAt: number, currentNow: number): string {
    if (currentNow === 0) return "Just now";
    const elapsed = currentNow - deletedAt;
    if (elapsed < 60000) {
      return "Just now";
    }
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  // Helper to format time remaining before permanent deletion (max 24h)
  function getFormattedTimeRemaining(deletedAt: number, currentNow: number): string {
    if (currentNow === 0) return "24h left";
    const elapsed = currentNow - deletedAt;
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    if (remaining <= 0) {
      return "Expired";
    }
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  }

  const filteredTodos = useMemo(() => {
    if (filter === "active") {
      return todos.filter((todo) => !todo.completed);
    }

    if (filter === "completed") {
      return todos.filter((todo) => todo.completed);
    }

    return todos;
  }, [filter, todos]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = newTodo.trim();

    if (!text) {
      return;
    }

    setTodos((currentTodos) => [
      {
        id: Date.now(),
        text,
        completed: false,
      },
      ...currentTodos,
    ]);
    setNewTodo("");
  }

  function toggleTodo(id: number) {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  function confirmRemoveTodo(id: number, text: string) {
    setModalConfig({
      isOpen: true,
      title: "Delete Task?",
      description: `"${text}" will be moved to the Recently Deleted list. You can restore it anytime within the next 24 hours.`,
      confirmText: "Delete",
      onConfirm: () => {
        const todoToDelete = todos.find((todo) => todo.id === id);
        if (todoToDelete) {
          setDeletedTodos((current) => [
            {
              ...todoToDelete,
              deletedAt: Date.now(),
            },
            ...current,
          ]);
        }
        setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
        setModalConfig(null);
      },
    });
  }

  function restoreTodo(id: number) {
    const todoToRestore = deletedTodos.find((todo) => todo.id === id);
    if (todoToRestore) {
      setDeletedTodos((current) => current.filter((todo) => todo.id !== id));
      const restoredTodo: Todo = {
        id: todoToRestore.id,
        text: todoToRestore.text,
        completed: todoToRestore.completed,
      };
      setTodos((currentTodos) => [restoredTodo, ...currentTodos]);
    }
  }

  function confirmPermanentlyDeleteTodo(id: number, text: string) {
    setModalConfig({
      isOpen: true,
      title: "Permanently Delete Task?",
      description: `"${text}" will be deleted forever. This action cannot be undone.`,
      confirmText: "Delete Permanently",
      onConfirm: () => {
        setDeletedTodos((current) => current.filter((todo) => todo.id !== id));
        setModalConfig(null);
      },
    });
  }

  function confirmClearAllDeletedTodos() {
    setModalConfig({
      isOpen: true,
      title: "Clear Recently Deleted?",
      description: "Are you sure you want to permanently delete all recently deleted tasks? This action cannot be undone.",
      confirmText: "Clear All",
      onConfirm: () => {
        setDeletedTodos([]);
        setModalConfig(null);
      },
    });
  }

  function startEditing(todo: Todo) {
    setEditingTodoId(todo.id);
    setEditingText(todo.text);
  }

  function cancelEditing() {
    setEditingTodoId(null);
    setEditingText("");
  }

  function saveEditing(id: number) {
    const text = editingText.trim();

    if (!text) {
      return;
    }

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id ? { ...todo, text } : todo
      )
    );
    setEditingTodoId(null);
    setEditingText("");
  }

  const activeCount = todos.filter((todo) => !todo.completed).length;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row lg:items-start">
        {/* Main Todo Column */}
        <div className="flex-1 min-w-0">
          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="grid gap-8 border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#334155)] px-6 py-8 text-white sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-10">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                  Task manager
                </span>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  A focused workspace for day-to-day execution.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                  Track priorities, keep progress visible, and handle follow-up
                  work from one clean list.
                </p>
              </div>

              <div className="grid gap-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 xl:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-300">Total</p>
                  <p className="mt-2 text-3xl font-semibold">{isMounted ? todos.length : 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Open</p>
                  <p className="mt-2 text-3xl font-semibold">{isMounted ? activeCount : 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Closed</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {isMounted ? todos.length - activeCount : 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Deleted</p>
                  <p className="mt-2 text-3xl font-semibold text-red-300">
                    {isMounted ? deletedTodos.length : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:px-10 lg:px-12 lg:py-8">
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="todo-input">
                  Add a task
                </label>
                <input
                  id="todo-input"
                  value={newTodo}
                  onChange={(event) => setNewTodo(event.target.value)}
                  placeholder="Add a task"
                  className="h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 font-medium text-white transition hover:bg-slate-700"
                >
                  Add task
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {(["all", "active", "completed"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${
                      filter === option
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {!isMounted ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-950"></div>
                  </div>
                ) : filteredTodos.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No tasks in this view.
                  </div>
                ) : (
                  filteredTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      {editingTodoId === todo.id ? (
                        <div className="space-y-4">
                          <label
                            className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
                            htmlFor={`edit-note-${todo.id}`}
                          >
                            Edit note
                          </label>
                          <textarea
                            id={`edit-note-${todo.id}`}
                            value={editingText}
                            onChange={(event) => setEditingText(event.target.value)}
                            className="min-h-28 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                            placeholder="Update the note"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => saveEditing(todo.id)}
                              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 cursor-pointer"
                            >
                              Save note
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => toggleTodo(todo.id)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border transition cursor-pointer ${
                              todo.completed
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                            aria-label={
                              todo.completed ? "Mark task incomplete" : "Mark task complete"
                            }
                          >
                            {todo.completed ? "✓" : ""}
                          </button>

                          <span
                            className={`flex-1 text-sm sm:text-base ${
                              todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                            }`}
                          >
                            {todo.text}
                          </span>

                          <button
                            type="button"
                            onClick={() => startEditing(todo)}
                            className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                          >
                            Edit note
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmRemoveTodo(todo.id, todo.text)}
                            className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Recently Deleted Sidebar */}
        <aside className="w-full lg:w-[380px] shrink-0 animate-fade-in">
          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Recently Deleted</h2>
                  <p className="text-xs text-slate-500">Deleted in last 24 hours</p>
                </div>
              </div>
              {isMounted && deletedTodos.length > 0 && (
                <button
                  onClick={confirmClearAllDeletedTodos}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-6">
              {!isMounted ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-950"></div>
                </div>
              ) : deletedTodos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-slate-50 p-4 text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-8 h-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.75 2.25-2.25m0 0 2.25 2.25m-2.25-2.25v6.75M2.25 5.25h19.5"
                      />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">No deleted tasks</p>
                  <p className="mt-1.5 text-xs text-slate-500 max-w-[220px] leading-normal">
                    Tasks you delete will remain here for 24 hours. You can restore them or delete them permanently.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                  {deletedTodos.map((todo) => (
                    <div key={todo.id} className="py-3.5 first:pt-0 last:pb-0 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-500 line-through truncate group-hover:text-slate-900 transition-colors">
                            {todo.text}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                            <span>{getFormattedTimeAgo(todo.deletedAt, now)}</span>
                            <span>•</span>
                            <span className="text-red-500 bg-red-50/70 border border-red-100/50 rounded-md px-1.5 py-0.5">
                              {getFormattedTimeRemaining(todo.deletedAt, now)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => restoreTodo(todo.id)}
                            title="Restore task"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => confirmPermanentlyDeleteTodo(todo.id, todo.text)}
                            title="Delete permanently"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {modalConfig && modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setModalConfig(null)}
          />

          {/* Modal Content Card */}
          <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 text-left shadow-2xl transition-all duration-300 animate-scale-up border border-slate-100">
            <div className="flex items-start gap-4">
              {/* Alert Indicator */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-slate-900 leading-6">
                  {modalConfig.title}
                </h3>
                <p className="text-sm text-slate-500 leading-normal">
                  {modalConfig.description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalConfig(null)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modalConfig.onConfirm}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 transition cursor-pointer"
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
