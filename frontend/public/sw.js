// Service Worker for notifications
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data.type === 'CHECK_TODOS') {
        const todos = event.data.todos;
        const holidays = new Set(event.data.holidays || []);
        const assignee = event.data.assignee || '';
        const notifications = checkAndCreateNotifications(todos, holidays, assignee);

        // Send notifications
        notifications.forEach(notif => {
            self.registration.showNotification(notif.title, notif.options);
        });
    }
});

// Check todos and create notification data
function checkAndCreateNotifications(todos, holidays, assignee) {
    const now = new Date();
    const currentHour = now.getHours();
    const notificationHours = [9, 12, 17];

    // Only send notifications at specified hours
    if (!notificationHours.includes(currentHour)) {
        return [];
    }

    // Get today's date in YYYY-MM-DD format
    const todayStr = now.toISOString().split('T')[0];

    const notifications = [];

    todos.forEach(todo => {
        if (todo.completed) return;

        const businessDays = countBusinessDaysUntil(todayStr, todo.due_date, holidays);

        // Notify if 3 business days before
        if (businessDays === 3) {
            notifications.push({
                title: `⚠️ TODO: 3営業日前 [${assignee}]`,
                options: {
                    body: `${todo.title} (期限: ${formatDate(todo.due_date)})`,
                    tag: `todo-${todo.id}-3days`,
                    requireInteraction: false,
                    data: { todoId: todo.id, type: '3days' }
                }
            });
        }

        // Notify if overdue
        if (businessDays < 0) {
            notifications.push({
                title: `🚨 TODO: 期限切れ [${assignee}]`,
                options: {
                    body: `${todo.title} (期限: ${formatDate(todo.due_date)})`,
                    tag: `todo-${todo.id}-overdue`,
                    requireInteraction: true,
                    data: { todoId: todo.id, type: 'overdue' }
                }
            });
        }
    });

    return notifications;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function countBusinessDaysUntil(fromDateStr, toDateStr, holidays) {
    const from = new Date(fromDateStr + 'T00:00:00');
    const to = new Date(toDateStr + 'T00:00:00');

    let count = 0;
    let current = new Date(from);

    while (current < to) {
        const day = current.getDay();
        const dateStr = current.toISOString().split('T')[0];
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidays.has(dateStr);

        if (!isWeekend && !isHoliday) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}
