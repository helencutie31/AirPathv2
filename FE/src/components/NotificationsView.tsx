import { Bell, CheckCircle2 } from "lucide-react";
import type { NotificationItem } from "@/lib/types";

type Props = {
  notifications: NotificationItem[];
  onMarkRead: (notificationId: string) => Promise<void>;
};

export function NotificationsView({ notifications, onMarkRead }: Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-blue-600" />
        <h2>Thông báo</h2>
      </div>

      {notifications.length ? (
        notifications.map((item) => (
          <div
            key={item.id}
            className={`rounded-3xl p-5 shadow-sm ring-1 ${
              item.is_read ? "bg-white ring-slate-200/70" : "bg-blue-50 ring-blue-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wide text-slate-500">{item.type}</div>
                <div className="mt-1 text-lg text-slate-900">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{item.description}</div>
                <div className="mt-3 text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
              {!item.is_read ? (
                <button
                  onClick={() => onMarkRead(item.id)}
                  className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đánh dấu đã đọc
                </button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                  Đã đọc
                </span>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">
          Chưa có thông báo.
        </div>
      )}
    </div>
  );
}

