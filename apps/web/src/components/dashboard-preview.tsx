export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-gray-200/60">
      <div className="flex border-b border-border">
        <div className="hidden w-44 shrink-0 border-r border-border bg-surface-subtle p-4 sm:block">
          <div className="mb-6 h-8 w-24 rounded-md bg-gray-200" />
          <div className="space-y-2">
            {["Dashboard", "Properties", "Payments", "Tenants"].map((item, i) => (
              <div
                key={item}
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  i === 0
                    ? "bg-green-100 text-green-800"
                    : "text-muted"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Good afternoon 👋</p>
          <p className="text-xs text-muted">Plaza collection overview</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              {
                label: "Collected",
                value: "₦4.2M",
                hint: "₦5.38M expected in 2026",
                accent: "text-green-700",
              },
              {
                label: "Outstanding",
                value: "₦570K",
                hint: "Prior-year balances",
                accent: "text-amber-600",
              },
              {
                label: "Units",
                value: "42",
                hint: "6 vacant",
                accent: "text-foreground",
              },
              {
                label: "Pending verify",
                value: "2",
                hint: "Needs action",
                accent: "text-foreground",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-surface-subtle p-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {stat.label}
                </p>
                <p className={`mt-1 text-lg font-semibold ${stat.accent}`}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">{stat.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-surface-subtle p-3">
            <div className="flex h-16 items-end gap-1.5">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-green-500"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] font-medium text-muted">Revenue trend</p>
          </div>
        </div>
      </div>
    </div>
  );
}
