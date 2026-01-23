import { useEffect, useMemo, useRef, useState } from "react";

type Todo = {
  id: number;
  due_date: string;
  title: string;
  assignee: string;
  completed: boolean;
};

type FormState = {
  due_date: string;
  title: string;
  assignee: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const emptyForm: FormState = {
  due_date: "",
  title: "",
  assignee: "",
};

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCompleted, setEditingCompleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState("due_date");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isEditing = editingId !== null;

  const sortedLabel = useMemo(() => {
    const sortLabelMap: Record<string, string> = {
      due_date: "期日",
      title: "TODO名",
      assignee: "担当者",
    };
    const orderLabel = order === "asc" ? "昇順" : "降順";
    return `${sortLabelMap[sort] ?? sort}の${orderLabel}`;
  }, [sort, order]);

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, order });
      if (assigneeFilter.trim()) {
        params.set("assignee", assigneeFilter.trim());
      }
      const res = await fetch(`${API_URL}/todos?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load todos");
      const data: Todo[] = await res.json();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [sort, order, assigneeFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setEditingCompleted(false);
    setShowForm(false);
  };

  const formatDateSlash = (value: string) => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return value;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    try {
      const payload = {
        ...form,
        completed: isEditing ? editingCompleted : false,
      };
      const res = await fetch(
        isEditing ? `${API_URL}/todos/${editingId}` : `${API_URL}/todos`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed to save todo");
      resetForm();
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingCompleted(todo.completed);
    setForm({
      due_date: todo.due_date,
      title: todo.title,
      assignee: todo.assignee,
    });
    setShowForm(true);
  };

  const handleDelete = async (todoId: number) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/todos/${todoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete todo");
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const handleComplete = async (todo: Todo) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: todo.due_date,
          title: todo.title,
          assignee: todo.assignee,
          completed: !todo.completed,
        }),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const toggleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  };

  useEffect(() => {
    setVisibleCount(20);
  }, [todos]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 20, todos.length));
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [todos.length]);

  const visibleTodos = useMemo(
    () => todos.slice(0, visibleCount),
    [todos, visibleCount]
  );

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">シンプルタスク管理</h1>
        </header>

        <section className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">並び順: {sortedLabel}</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                placeholder="担当者でフィルタ"
              />
              <button
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                onClick={fetchTodos}
                disabled={loading}
              >
                再読み込み
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  {[
                    { key: "due_date", label: "期日" },
                    { key: "title", label: "TODO名" },
                    { key: "assignee", label: "担当者" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 pr-4 font-medium ${
                        col.key === "title"
                          ? "w-6/12"
                          : "w-2/12"
                      }`}
                    >
                      <button
                        className="flex items-center gap-1 hover:text-slate-900"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                        {sort === col.key && (
                          <span className="text-xs">
                            {order === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td colSpan={4} className="py-3 pr-4">
                    <button
                      className="rounded border border-slate-300 px-3 py-1 text-sm"
                      onClick={() => {
                        setEditingId(null);
                        setForm(emptyForm);
                        setShowForm(true);
                      }}
                    >
                      追加
                    </button>
                  </td>
                </tr>
                {showForm && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <input
                        type="date"
                        value={form.due_date}
                        onChange={(e) =>
                          setForm({ ...form, due_date: e.target.value })
                        }
                        required
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        required
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        placeholder="例: 仕様書レビュー"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={form.assignee}
                        onChange={(e) =>
                          setForm({ ...form, assignee: e.target.value })
                        }
                        required
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        placeholder="例: Tanaka"
                      />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
                        >
                          {isEditing ? "更新" : "追加"}
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="rounded border border-slate-300 px-3 py-2"
                        >
                          閉じる
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {visibleTodos.map((todo) => (
                  <tr
                    key={todo.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      todo.completed ? "bg-slate-200 text-slate-600" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 text-sm">
                      {formatDateSlash(todo.due_date)}
                    </td>
                    <td className="py-3 pr-4">{todo.title}</td>
                    <td className="py-3 pr-4 text-sm">{todo.assignee}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded border border-emerald-300 px-2 py-1 text-emerald-700"
                          onClick={() => handleComplete(todo)}
                        >
                          {todo.completed ? "完了取消" : "完了"}
                        </button>
                        <button
                          className="rounded border border-slate-300 px-2 py-1"
                          onClick={() => handleEdit(todo)}
                        >
                          編集
                        </button>
                        <button
                          className="rounded border border-red-300 px-2 py-1 text-red-600"
                          onClick={() => handleDelete(todo.id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={sentinelRef} className="h-6" />
            {!loading && todos.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                Todoがありません。
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
