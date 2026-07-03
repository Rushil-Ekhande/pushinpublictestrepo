"use client";

import { FormEvent, useMemo, useState } from "react";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const initialTodos: Todo[] = [
  { id: 1, text: "Sketch the next feature", completed: true },
  { id: 2, text: "Ship the landing page", completed: false },
  { id: 3, text: "Review the pull request", completed: false },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">(
    "all",
  );

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
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  }

  function removeTodo(id: number) {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
  }

  const activeCount = todos.filter((todo) => !todo.completed).length;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="grid gap-8 bg-[linear-gradient(135deg,rgba(14,165,233,0.96),rgba(15,23,42,0.96))] px-6 py-8 text-white sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-10">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
                Todo application
              </span>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Keep the work visible and the list moving.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-sky-100/90 sm:text-lg">
                Capture tasks, mark what is done, and focus on what still needs
                attention.
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-white/15 bg-white/10 p-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div>
                <p className="text-sm text-sky-100/80">Total tasks</p>
                <p className="mt-2 text-3xl font-semibold">{todos.length}</p>
              </div>
              <div>
                <p className="text-sm text-sky-100/80">Active</p>
                <p className="mt-2 text-3xl font-semibold">{activeCount}</p>
              </div>
              <div>
                <p className="text-sm text-sky-100/80">Completed</p>
                <p className="mt-2 text-3xl font-semibold">
                  {todos.length - activeCount}
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
                className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 font-medium text-white transition hover:bg-slate-800"
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === option
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredTodos.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                  No tasks in this view.
                </div>
              ) : (
                filteredTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                        todo.completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                      aria-label={todo.completed ? "Mark task incomplete" : "Mark task complete"}
                    >
                      {todo.completed ? "✓" : ""}
                    </button>

                    <span
                      className={`flex-1 text-sm sm:text-base ${
                        todo.completed
                          ? "text-slate-400 line-through"
                          : "text-slate-800"
                      }`}
                    >
                      {todo.text}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeTodo(todo.id)}
                      className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
