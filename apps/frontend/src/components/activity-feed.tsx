interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone?: "neutral" | "success" | "warning";
}

interface ActivityFeedProps {
  title: string;
  description: string;
  items: ActivityItem[];
  emptyMessage: string;
}

const toneStyles: Record<NonNullable<ActivityItem["tone"]>, string> = {
  neutral: "border-slate-200 bg-slate-50",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50"
};

export function ActivityFeed({ title, description, items, emptyMessage }: ActivityFeedProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${toneStyles[item.tone ?? "neutral"]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-500">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  }).format(new Date(item.timestamp))}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
