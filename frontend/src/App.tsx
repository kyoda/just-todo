import { DayPicker } from "react-day-picker";
import { useEffect, useMemo, useRef, useState } from "react";

type Todo = {
  id: number;
  due_date: string;
  title: string;
  assignee: string;
  completed: boolean;
  favorite: boolean;
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
  const [showForm, setShowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<
    "due_date" | "title" | "assignee" | null
  >(null);
  const [editDraft, setEditDraft] = useState<FormState>(emptyForm);
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [sort, setSort] = useState(() => {
    if (typeof window === "undefined") return "due_date";
    return localStorage.getItem("sort") ?? "due_date";
  });
  const [order, setOrder] = useState<"asc" | "desc">(() => {
    if (typeof window === "undefined") return "asc";
    const stored = localStorage.getItem("order");
    return stored === "desc" ? "desc" : "asc";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("assigneeFilter") ?? "";
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "b";
    return localStorage.getItem("uiTheme") ?? "b";
  });
  const [showCompleted, setShowCompleted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("showCompleted") === "true";
  });
  const [favoriteTitlesByAssignee, setFavoriteTitlesByAssignee] = useState<
    Record<string, string[]>
  >({});
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const favoriteNoticeTimer = useRef<number | null>(null);

  const sortedLabel = useMemo(() => {
    const sortLabelMap: Record<string, string> = {
      due_date: "期日",
      title: "TODO名",
      assignee: "担当者",
    };
    const orderLabel = order === "asc" ? "昇順" : "降順";
    return `${sortLabelMap[sort] ?? sort}の${orderLabel}`;
  }, [sort, order]);

  const fetchAssignees = async () => {
    try {
      const params = new URLSearchParams({ sort: "assignee", order: "asc" });
      const res = await fetch(`${API_URL}/todos?${params.toString()}`);
      if (!res.ok) return;
      const data: Todo[] = await res.json();
      const set = new Set<string>();
      data.forEach((todo) => {
        if (todo.assignee.trim()) {
          set.add(todo.assignee.trim());
        }
      });
      setAssigneeOptions(Array.from(set).sort((a, b) => a.localeCompare(b)));
    } catch {
      // ignore assignee list failures
    }
  };

  const fetchFavorites = async () => {
    try {
      const params = new URLSearchParams({ sort: "title", order: "asc" });
      const res = await fetch(`${API_URL}/todos?${params.toString()}`);
      if (!res.ok) return;
      const data: Todo[] = await res.json();
      const map: Record<string, Set<string>> = {};
      data.forEach((todo) => {
        const title = todo.title.trim();
        const assignee = todo.assignee.trim();
        if (!todo.favorite || !title || !assignee) return;
        if (!map[assignee]) {
          map[assignee] = new Set<string>();
        }
        map[assignee].add(title);
      });
      const normalized: Record<string, string[]> = {};
      Object.entries(map).forEach(([assignee, titles]) => {
        normalized[assignee] = Array.from(titles).sort((a, b) =>
          a.localeCompare(b)
        );
      });
      setFavoriteTitlesByAssignee(normalized);
    } catch {
      // ignore favorites list failures
    }
  };

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, order });
      if (assigneeFilter.trim()) {
        params.set("assignee", assigneeFilter.trim());
      }
      const [res] = await Promise.all([
        fetch(`${API_URL}/todos?${params.toString()}`),
        fetchAssignees(),
        fetchFavorites(),
      ]);
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

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await fetch("https://holidays-jp.github.io/api/v1/date.json");
        if (!res.ok) return;
        const data: Record<string, string> = await res.json();
        setHolidays(new Set(Object.keys(data)));
      } catch {
        // ignore holiday fetch errors
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("assigneeFilter", assigneeFilter);
  }, [assigneeFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sort", sort);
    localStorage.setItem("order", order);
  }, [sort, order]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("showCompleted", String(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("uiTheme", theme);
  }, [theme]);


  const resetForm = () => {
    setForm(emptyForm);
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

  const formatDateWithWeekday = (value: string) => {
    if (!value) return "";
    const dateObj = new Date(`${value}T00:00:00`);
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][
      dateObj.getDay()
    ];
    return `${formatDateSlash(value)}(${weekday})`;
  };

  const formatDateIso = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const showFavoriteNotice = (message: string) => {
    if (favoriteNoticeTimer.current) {
      window.clearTimeout(favoriteNoticeTimer.current);
    }
    setFavoriteNotice(message);
    favoriteNoticeTimer.current = window.setTimeout(() => {
      setFavoriteNotice(null);
      favoriteNoticeTimer.current = null;
    }, 2000);
  };

  const favoritesForAssignee = (assignee: string) => {
    const key = assignee.trim();
    return key ? favoriteTitlesByAssignee[key] ?? [] : [];
  };

  const holidayDates = useMemo(() => {
    return Array.from(holidays).map((date) => new Date(`${date}T00:00:00`));
  }, [holidays]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    try {
      const payload = { ...form, completed: false, favorite: false };
      const res = await fetch(`${API_URL}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save todo");
      resetForm();
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
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
          favorite: todo.favorite,
        }),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const saveInlineEdit = async (todo: Todo) => {
    if (editingRowId !== todo.id) return;
    const trimmedTitle = editDraft.title.trim();
    const trimmedAssignee = editDraft.assignee.trim();
    if (!trimmedTitle || !trimmedAssignee || !editDraft.due_date) {
      setError("期日・TODO名・担当者は必須です。");
      return;
    }
    const noChanges =
      editDraft.due_date === todo.due_date &&
      trimmedTitle === todo.title &&
      trimmedAssignee === todo.assignee;
    setEditingRowId(null);
    setEditingField(null);
    if (noChanges) return;
    setError(null);
    setSavingRowId(todo.id);
    try {
      const res = await fetch(`${API_URL}/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: editDraft.due_date,
          title: trimmedTitle,
          assignee: trimmedAssignee,
          completed: todo.completed,
          favorite: todo.favorite,
        }),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSavingRowId(null);
    }
  };

  const beginFieldEdit = (
    todo: Todo,
    field: "due_date" | "title" | "assignee"
  ) => {
    setEditingRowId(todo.id);
    setEditingField(field);
    setEditDraft({
      due_date: todo.due_date,
      title: todo.title,
      assignee: todo.assignee,
    });
  };

  const DatePickerInput = ({
    value,
    onChange,
    onCommit,
  }: {
    value: string;
    onChange: (value: string) => void;
    onCommit?: () => void;
  }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const selected = value ? new Date(`${value}T00:00:00`) : undefined;

    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        if (!wrapperRef.current) return;
        if (!wrapperRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          readOnly
          value={value ? formatDateSlash(value) : ""}
          onClick={() => setOpen((prev) => !prev)}
          className="app-input w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="YYYY/MM/DD"
        />
        {open && (
          <div className="absolute z-10 mt-2 rounded border border-slate-200 bg-white p-2 shadow">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                onChange(formatDateIso(date));
                setOpen(false);
                onCommit?.();
              }}
              modifiers={{
                holiday: holidayDates,
                sunday: { dayOfWeek: [0] },
                saturday: { dayOfWeek: [6] },
              }}
              modifiersClassNames={{
                holiday: "rdp-holiday",
                sunday: "rdp-sunday",
                saturday: "rdp-saturday",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const toggleFavorite = async (todo: Todo) => {
    setError(null);
    try {
      const nextFavorite = !todo.favorite;
      const res = await fetch(`${API_URL}/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: todo.due_date,
          title: todo.title,
          assignee: todo.assignee,
          completed: todo.completed,
          favorite: nextFavorite,
        }),
      });
      if (!res.ok) {
        let detail = "Failed to update todo";
        try {
          const data = await res.json();
          if (data?.detail) detail = data.detail;
        } catch {
          // ignore parse errors
        }
        throw new Error(detail);
      }
      showFavoriteNotice(
        nextFavorite ? "お気に入り登録しました" : "お気に入り解除しました"
      );
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
  }, [todos, showCompleted]);

  const filteredTodos = useMemo(
    () => (showCompleted ? todos : todos.filter((todo) => !todo.completed)),
    [showCompleted, todos]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 20, filteredTodos.length));
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredTodos.length]);

  const visibleTodos = useMemo(
    () => filteredTodos.slice(0, visibleCount),
    [filteredTodos, visibleCount]
  );

  const getRowClass = (todo: Todo) => {
    if (todo.completed) {
      return "bg-slate-200 text-slate-600";
    }
    const due = new Date(`${todo.due_date}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return "bg-red-100";
    }
    if (diffDays <= 3) {
      return "bg-yellow-100";
    }
    return "";
  };

  useEffect(() => {
    fetchAssignees();
  }, []);

  return (
    <div className={`app-shell theme-${theme} min-h-screen px-6 py-10`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="app-title text-3xl font-semibold">シンプルタスク管理</h1>
        </header>

        <section className="app-card rounded-xl bg-white p-6 shadow">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 text-xs text-slate-600">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="app-dot app-dot-danger inline-block h-3 w-3 rounded-sm bg-red-100" />
                    <span>期日超過</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="app-dot app-dot-warn inline-block h-3 w-3 rounded-sm bg-yellow-100" />
                    <span>3日前</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  ダブルクリックで編集。入力後にフォーカスが外れると保存されます。
                </p>
              </div>
              <div className="app-sort text-right text-xs text-slate-600">
                並び順: {sortedLabel}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {savingRowId !== null && (
                  <span className="text-xs text-slate-500">保存中...</span>
                )}
                {favoriteNotice && (
                  <span className="text-xs text-emerald-600">
                    {favoriteNotice}
                  </span>
                )}
                <input
                  type="text"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="app-input rounded border border-slate-300 px-3 py-1 text-sm"
                  placeholder="担当者でフィルタ"
                />
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="app-select rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">担当者を選択</option>
                  {assigneeOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <datalist id="assignee-options">
                  {assigneeOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="app-select rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="b">スタイルB</option>
                  <option value="c">スタイルC</option>
                  <option value="d">スタイルD</option>
                  <option value="f">スタイルF</option>
                  <option value="g">スタイルG</option>
                </select>
                <label className="ml-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="app-checkbox h-4 w-4"
                  />
                  完了も読み込む
                </label>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-4 overflow-x-auto px-3">
            <table className="app-table min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="app-thead border-b border-slate-200 text-slate-600">
                  {[
                    { key: "due_date", label: "期日" },
                    { key: "title", label: "TODO名" },
                    { key: "assignee", label: "担当者" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`app-th py-3 pr-4 font-medium ${
                        col.key === "title"
                          ? "w-6/12"
                          : "w-2/12"
                      }`}
                    >
                      <button
                        className="app-sort-btn flex items-center gap-1 hover:text-slate-900"
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
                  <th className="app-th py-3 pr-6 text-right font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td colSpan={4} className="py-3 pr-4">
                    <button
                      className="app-btn rounded border border-slate-300 px-3 py-1 text-sm"
                      onClick={() => {
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
                      <DatePickerInput
                        value={form.due_date}
                        onChange={(value) =>
                          setForm({ ...form, due_date: value })
                        }
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
                        className="app-input w-full rounded border border-slate-300 px-3 py-2"
                        placeholder="例: 仕様書レビュー"
                        list="favorite-title-options-add"
                      />
                      <datalist id="favorite-title-options-add">
                        {favoritesForAssignee(form.assignee).map((title) => (
                          <option key={title} value={title} />
                        ))}
                      </datalist>
                      {favoritesForAssignee(form.assignee).length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setForm({ ...form, title: e.target.value });
                          }}
                          className="app-select mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="">お気に入りから選択</option>
                          {favoritesForAssignee(form.assignee).map((title) => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={form.assignee}
                        onChange={(e) =>
                          setForm({ ...form, assignee: e.target.value })
                        }
                        required
                        className="app-input w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        placeholder="例: Tanaka"
                        list="assignee-options"
                      />
                    </td>
                    <td className="py-3 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="app-btn app-btn-primary rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
                        >
                          追加
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="app-btn rounded border border-slate-300 px-3 py-2"
                        >
                          閉じる
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {visibleTodos.map((todo) => {
                  const rowBgClass = getRowClass(todo);
                  return (
                  <tr
                    key={todo.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td
                      className={`app-td py-3 pr-4 pl-3 text-sm ${rowBgClass} rounded-l`}
                      onDoubleClick={() => beginFieldEdit(todo, "due_date")}
                    >
                      {editingRowId === todo.id &&
                      editingField === "due_date" ? (
                        <DatePickerInput
                          value={editDraft.due_date}
                          onChange={(value) =>
                            setEditDraft({ ...editDraft, due_date: value })
                          }
                          onCommit={() => saveInlineEdit(todo)}
                        />
                      ) : (
                        formatDateWithWeekday(todo.due_date)
                      )}
                    </td>
                    <td
                      className={`app-td py-3 pr-4 ${rowBgClass}`}
                      onDoubleClick={() => beginFieldEdit(todo, "title")}
                    >
                      {editingRowId === todo.id &&
                      editingField === "title" ? (
                        <div
                          className="space-y-2"
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              saveInlineEdit(todo);
                            }
                          }}
                        >
                          <input
                            type="text"
                            value={editDraft.title}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                title: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            autoFocus
                            className="app-input w-full rounded border border-slate-300 px-2 py-1"
                            list={`favorite-title-options-${todo.id}`}
                          />
                          <datalist id={`favorite-title-options-${todo.id}`}>
                            {favoritesForAssignee(editDraft.assignee).map((title) => (
                              <option key={title} value={title} />
                            ))}
                          </datalist>
                          {favoritesForAssignee(editDraft.assignee).length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                setEditDraft({
                                  ...editDraft,
                                  title: e.target.value,
                                });
                              }}
                              className="app-select w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option value="">お気に入りから選択</option>
                              {favoritesForAssignee(editDraft.assignee).map((title) => (
                                <option key={title} value={title}>
                                  {title}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        todo.title
                      )}
                    </td>
                    <td
                      className={`app-td py-3 pr-4 text-sm ${rowBgClass}`}
                      onDoubleClick={() => beginFieldEdit(todo, "assignee")}
                    >
                      {editingRowId === todo.id &&
                      editingField === "assignee" ? (
                        <input
                          type="text"
                          value={editDraft.assignee}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              assignee: e.target.value,
                            })
                          }
                          onBlur={() => saveInlineEdit(todo)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          autoFocus
                          className="app-input w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          list="assignee-options"
                        />
                      ) : (
                        todo.assignee
                      )}
                    </td>
                    <td className={`app-td py-3 pr-6 text-right ${rowBgClass} rounded-r`}>
                      <div className="flex justify-end gap-2">
                        <button
                          className={`app-btn app-btn-star rounded border px-2 py-1 text-slate-700 ${
                            todo.favorite
                              ? "border-yellow-300 text-yellow-600"
                              : "border-slate-300"
                          }`}
                          onClick={() => toggleFavorite(todo)}
                          aria-label="お気に入りに登録"
                          title="お気に入りに登録"
                        >
                          {todo.favorite ? "★" : "☆"}
                        </button>
                        <button
                          className="app-btn rounded border border-emerald-300 px-2 py-1 text-emerald-700"
                          onClick={() => handleComplete(todo)}
                        >
                          {todo.completed ? "完了取消" : "完了"}
                        </button>
                        <button
                          className="app-btn rounded border border-red-300 px-2 py-1 text-red-600"
                          onClick={() => handleDelete(todo.id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
