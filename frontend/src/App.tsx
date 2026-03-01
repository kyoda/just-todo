import { DayPicker } from "react-day-picker";
import { useEffect, useMemo, useRef, useState } from "react";

type Todo = {
  id: number;
  due_date: string;
  title: string;
  assignee: string;
  memo: string;
  completed: boolean;
  favorite: boolean;
};

type FormState = {
  due_date: string;
  title: string;
  assignee: string;
  memo: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const emptyForm: FormState = {
  due_date: "",
  title: "",
  assignee: "",
  memo: "",
};

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<
    "due_date" | "title" | "memo" | "assignee" | null
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
  const addTitleRef = useRef<HTMLTextAreaElement | null>(null);
  const addMemoRef = useRef<HTMLTextAreaElement | null>(null);
  const dateEditRef = useRef<HTMLDivElement | null>(null);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const favoriteNoticeTimer = useRef<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationAssignee, setNotificationAssignee] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("notificationAssignee") ?? "";
  });
  const notificationCheckTimer = useRef<number | null>(null);

  const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  };

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
      if (!res.ok) throw new Error("Todoの取得に失敗しました。");
      const data: Todo[] = await res.json();
      setTodos(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("notificationAssignee", notificationAssignee);
  }, [notificationAssignee]);

  // Register Service Worker and setup notifications
  useEffect(() => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザは通知をサポートしていません');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        return true;
      }
    }

    setNotificationsEnabled(false);
    return false;
  };

  // Check todos and send notifications
  const checkTodosForNotifications = async () => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return;
    if (!navigator.serviceWorker.controller) return;
    if (!notificationAssignee) return; // Only notify when notification assignee is set

    const incompleteTodos = todos.filter(t => !t.completed && t.assignee === notificationAssignee);

    navigator.serviceWorker.controller.postMessage({
      type: 'CHECK_TODOS',
      todos: incompleteTodos,
      holidays: Array.from(holidays),
      assignee: notificationAssignee
    });
  };

  // Periodic notification check (every 30 minutes)
  useEffect(() => {
    if (!notificationsEnabled) return;

    checkTodosForNotifications();

    notificationCheckTimer.current = window.setInterval(() => {
      checkTodosForNotifications();
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      if (notificationCheckTimer.current) {
        window.clearInterval(notificationCheckTimer.current);
      }
    };
  }, [notificationsEnabled, todos, holidays, notificationAssignee]);

  // Check notification permission on load
  useEffect(() => {
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

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
      if (!res.ok) throw new Error("Todoの保存に失敗しました。");
      resetForm();
      await fetchTodos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
    }
  };

  const handleDelete = async (todoId: number) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/todos/${todoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Todoの削除に失敗しました。");
      await fetchTodos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
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
      if (!res.ok) throw new Error("Todoの更新に失敗しました。");
      await fetchTodos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
    }
  };

  const saveInlineEdit = async (todo: Todo, draftOverride?: FormState) => {
    if (editingRowId !== todo.id) return;
    const draft = draftOverride ?? editDraft;
    const trimmedTitle = draft.title.trim();
    const trimmedAssignee = draft.assignee.trim();
    if (!trimmedTitle || !trimmedAssignee || !editDraft.due_date) {
      setError("期日・TODO名・担当者は必須です。");
      return;
    }
    const noChanges =
      draft.due_date === todo.due_date &&
      trimmedTitle === todo.title &&
      trimmedAssignee === todo.assignee &&
      draft.memo === todo.memo;
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
          due_date: draft.due_date,
          title: trimmedTitle,
          assignee: trimmedAssignee,
          memo: draft.memo,
          completed: todo.completed,
          favorite: todo.favorite,
        }),
      });
      if (!res.ok) throw new Error("Todoの更新に失敗しました。");
      await fetchTodos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
    } finally {
      setSavingRowId(null);
    }
  };

  const beginFieldEdit = (
    todo: Todo,
    field: "due_date" | "title" | "memo" | "assignee"
  ) => {
    setEditingRowId(todo.id);
    setEditingField(field);
    setEditDraft({
      due_date: todo.due_date,
      title: todo.title,
      assignee: todo.assignee,
      memo: todo.memo,
    });
  };

  useEffect(() => {
    if (editingField === "due_date" && dateEditRef.current) {
      dateEditRef.current.focus();
    }
  }, [editingField, editingRowId]);

  const DatePickerInput = ({
    value,
    onChange,
    onCommit,
  }: {
    value: string;
    onChange: (value: string) => void;
    onCommit?: (value: string) => void;
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
          className="app-input w-full rounded border border-slate-300 px-2 py-2 text-sm leading-6 box-border"
          placeholder="YYYY/MM/DD"
        />
        {open && (
          <div className="absolute z-10 mt-2 rounded border border-slate-200 bg-white p-2 shadow">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                const nextValue = formatDateIso(date);
                onChange(nextValue);
                setOpen(false);
                onCommit?.(nextValue);
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
        let detail = "Todoの更新に失敗しました。";
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
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
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

  const countBusinessDaysUntil = (dueDate: string): number => {
    const due = new Date(`${dueDate}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = due.getTime() - today.getTime();
    if (diffMs < 0) {
      return -1; // 期日が過去
    }

    let businessDays = 0;
    let current = new Date(today);

    while (current.getTime() < due.getTime()) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];

      // 平日（月～金）で、祝日でない場合
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
        businessDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return businessDays;
  };

  const getRowClass = (todo: Todo) => {
    if (todo.completed) {
      return "bg-slate-200 text-slate-600";
    }
    const businessDaysRemaining = countBusinessDaysUntil(todo.due_date);
    if (businessDaysRemaining < 0) {
      return "bg-red-100";
    }
    if (businessDaysRemaining <= 2) {
      return "bg-yellow-100";
    }
    return "";
  };

  useEffect(() => {
    fetchAssignees();
  }, []);

  useEffect(() => {
    if (!showForm) return;
    autoResizeTextarea(addTitleRef.current);
    autoResizeTextarea(addMemoRef.current);
  }, [showForm, form.title, form.memo]);

  return (
    <div className={`app-shell theme-${theme} min-h-screen px-6 py-10`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="app-title text-3xl font-semibold">
            シンプルタスク管理 <span className="text-slate-500">| just todo</span>
          </h1>
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
                    <span>３営業日前</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="app-dot app-dot-done inline-block h-3 w-3 rounded-sm bg-slate-200" />
                    <span>完了</span>
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
                <label className="ml-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="app-checkbox h-4 w-4"
                  />
                  完了も読み込む
                </label>
                {!notificationsEnabled && (
                  <button
                    onClick={requestNotificationPermission}
                    className="ml-2 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    🔔 通知を有効にする
                  </button>
                )}
                {notificationsEnabled && (
                  <div className="ml-2 flex items-center gap-2">
                    <label className="text-xs text-slate-600">通知対象:</label>
                    <select
                      value={notificationAssignee}
                      onChange={(e) => setNotificationAssignee(e.target.value)}
                      className="app-select rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="">選択してください</option>
                      {assigneeOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {notificationAssignee && (
                      <span className="text-xs text-green-600">
                        🔔 有効
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">スタイル:</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="app-select rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="b">ウォーム・クラフト</option>
                  <option value="c">ミッドナイト・ネオン</option>
                  <option value="d">ピーチ・ソフト</option>
                  <option value="f">スカイ・グラス</option>
                  <option value="g">ブルータル・モノ</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-[24px] text-sm">
            {favoriteNotice && (
              <span className="text-emerald-600">{favoriteNotice}</span>
            )}
            {error && (
              <span className="text-red-600">{error}</span>
            )}
          </div>

          <div className="mt-4 overflow-x-auto px-3">
            <table className="app-table table-fixed w-full border-collapse text-left text-sm">
              <thead>
                <tr className="app-thead border-b border-slate-200 text-slate-600">
                  {[
                    { key: "due_date", label: "期日" },
                    { key: "title", label: "TODO名" },
                    { key: "memo", label: "備考" },
                    { key: "assignee", label: "担当者" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`app-th py-3 px-2 font-medium ${col.key === "title"
                        ? "w-[31%]"
                        : col.key === "memo"
                          ? "w-[20%]"
                          : col.key === "assignee"
                            ? "w-[11%]"
                            : "w-[16%]"
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
                  <th className="app-th w-[22%] py-3 pr-6 text-right font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td colSpan={5} className="py-3 px-2">
                    <button
                      className="app-btn rounded border border-slate-300 px-3 py-1 text-sm"
                      onClick={() => {
                        setForm({
                          due_date: "",
                          title: "",
                          assignee: assigneeFilter,
                          memo: "",
                        });
                        setShowForm(true);
                      }}
                    >
                      追加
                    </button>
                  </td>
                </tr>
                {showForm && (
                  <tr className="border-b border-slate-100">
                    <td className="w-[16%] py-3 px-2 break-words">
                      <DatePickerInput
                        value={form.due_date}
                        onChange={(value) =>
                          setForm({ ...form, due_date: value })
                        }
                      />
                    </td>
                    <td className="w-[31%] py-3 px-2 break-words">
                      <div className="w-full">
                        <textarea
                          ref={(el) => {
                            if (el) autoResizeTextarea(el);
                          }}
                          value={form.title}
                          onChange={(e) => {
                            setForm({ ...form, title: e.target.value });
                            autoResizeTextarea(e.currentTarget);
                          }}
                          required
                          className="w-full overflow-hidden px-2 py-2 border border-slate-400 bg-white font-sans text-sm resize-none leading-6 box-border"
                          rows={1}
                          placeholder="例: 仕様書レビュー"
                        />
                      </div>
                    </td>
                    <td className="w-[20%] py-3 px-2 break-words">
                      <div className="w-full">
                        <textarea
                          ref={(el) => {
                            if (el) autoResizeTextarea(el);
                          }}
                          value={form.memo}
                          onChange={(e) => {
                            setForm({ ...form, memo: e.target.value });
                            autoResizeTextarea(e.currentTarget);
                          }}
                          className="w-full overflow-hidden px-2 py-2 border border-slate-400 bg-white font-sans text-sm resize-none leading-6 box-border"
                          rows={1}
                          placeholder="例: 要件確認済み"
                        />
                      </div>
                    </td>
                    <td className="w-[11%] py-3 px-2 break-words overflow-hidden min-w-0">
                      <input
                        type="text"
                        value={form.assignee}
                        onChange={(e) =>
                          setForm({ ...form, assignee: e.target.value })
                        }
                        required
                        className="app-input w-full max-w-full box-border rounded border border-slate-300 px-3 py-2 text-sm"
                        placeholder="例: Tanaka"
                        list="assignee-options"
                      />
                    </td>
                    <td className="w-[22%] py-3 pr-6 text-right overflow-hidden">
                      <div className="flex flex-nowrap justify-end gap-2">
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
                        className={`app-td w-[16%] py-3 px-2 text-sm break-words ${rowBgClass} rounded-l cursor-pointer hover:bg-slate-100 hover:ring-1 hover:ring-inset hover:ring-slate-300 transition-colors`}
                        onDoubleClick={() => beginFieldEdit(todo, "due_date")}
                      >
                        {editingRowId === todo.id &&
                          editingField === "due_date" ? (
                          <div
                            ref={dateEditRef}
                            tabIndex={0}
                            onBlur={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                saveInlineEdit(todo);
                              }
                            }}
                          >
                            <DatePickerInput
                              value={editDraft.due_date}
                              onChange={(value) =>
                                setEditDraft({ ...editDraft, due_date: value })
                              }
                              onCommit={(value) =>
                                saveInlineEdit(todo, { ...editDraft, due_date: value })
                              }
                            />
                          </div>
                        ) : (
                          <div className="px-2 py-2 leading-6 border border-transparent box-border">{formatDateWithWeekday(todo.due_date)}</div>
                        )}
                      </td>
                      <td
                        className={`app-td w-[31%] py-3 px-2 break-words ${rowBgClass} cursor-pointer hover:bg-slate-100 hover:ring-1 hover:ring-inset hover:ring-slate-300 transition-colors group`}
                        onDoubleClick={() => beginFieldEdit(todo, "title")}
                      >
                        {editingRowId === todo.id &&
                          editingField === "title" ? (
                          <div
                            className="w-full"
                            onBlur={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                saveInlineEdit(todo);
                              }
                            }}
                          >
                            <textarea
                              ref={(el) => {
                                if (el) autoResizeTextarea(el);
                              }}
                              value={editDraft.title}
                              onChange={(e) => {
                                setEditDraft({
                                  ...editDraft,
                                  title: e.target.value,
                                });
                                autoResizeTextarea(e.currentTarget);
                              }}
                              onFocus={(e) => autoResizeTextarea(e.currentTarget)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.ctrlKey) {
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              className="w-full overflow-hidden px-2 py-2 border border-slate-400 group-hover:border-slate-600 bg-white font-sans text-sm resize-none transition-colors leading-6 box-border"
                              rows={1}
                            />
                          </div>
                        ) : (
                          <div className="px-2 py-2 leading-6 border border-transparent box-border">{todo.title}</div>
                        )}
                      </td>
                      <td
                        className={`app-td w-[20%] py-3 px-2 text-sm break-words ${rowBgClass} cursor-pointer hover:bg-slate-100 hover:ring-1 hover:ring-inset hover:ring-slate-300 transition-colors group`}
                        onDoubleClick={() => beginFieldEdit(todo, "memo")}
                      >
                        {editingRowId === todo.id &&
                          editingField === "memo" ? (
                          <div className="w-full">
                            <textarea
                              ref={(el) => {
                                if (el) autoResizeTextarea(el);
                              }}
                              value={editDraft.memo}
                              onChange={(e) => {
                                setEditDraft({
                                  ...editDraft,
                                  memo: e.target.value,
                                });
                                autoResizeTextarea(e.currentTarget);
                              }}
                              onFocus={(e) => autoResizeTextarea(e.currentTarget)}
                              onBlur={() => saveInlineEdit(todo)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.ctrlKey) {
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              className="w-full overflow-hidden px-2 py-2 border border-slate-400 group-hover:border-slate-600 bg-white font-sans text-sm resize-none transition-colors leading-6 box-border"
                              rows={1}
                            />
                          </div>
                        ) : (
                          <div className="px-2 py-2 leading-6 border border-transparent box-border">{todo.memo}</div>
                        )}
                      </td>
                      <td
                        className={`app-td w-[11%] py-3 px-2 text-sm break-words ${rowBgClass} cursor-pointer hover:bg-slate-100 hover:ring-1 hover:ring-inset hover:ring-slate-300 transition-colors overflow-hidden min-w-0`}
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
                            className="w-full max-w-full box-border px-2 py-2 border border-slate-400 bg-white font-sans text-sm leading-6"
                            list="assignee-options"
                          />
                        ) : (
                          <div className="px-2 py-2 leading-6 border border-transparent box-border">{todo.assignee}</div>
                        )}
                      </td>
                      <td className={`app-td w-[22%] py-3 pr-6 text-right ${rowBgClass} rounded-r overflow-hidden`}>
                        <div className="flex flex-nowrap justify-end gap-2">
                          <button
                            className={`app-btn app-btn-star rounded border px-2 py-1 text-slate-700 ${todo.favorite
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
