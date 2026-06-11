export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-dark-elevated shadow-2xl shadow-black/40">
      <div className="flex border-b border-white/10">
        <div className="hidden w-44 shrink-0 border-r border-white/10 bg-surface-dark p-4 sm:block">
          <div className="mb-6 h-8 w-24 rounded bg-white/10" />
          <div className="space-y-2">
            {["Dashboard", "Units", "Payments", "Documents"].map((item, i) => (
              <div
                key={item}
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  i === 0
                    ? "bg-green-500/20 text-green-400"
                    : "text-white/50"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-5">
          <p className="text-sm font-medium text-white/90">Good afternoon 👋</p>
          <p className="text-xs text-white/40">Plaza collection overview</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Collected", value: "₦4.2M", accent: "text-green-400" },
              { label: "Outstanding", value: "₦890K", accent: "text-amber-300" },
              { label: "Units", value: "42", accent: "text-white" },
              { label: "Rate", value: "78%", accent: "text-green-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  {stat.label}
                </p>
                <p className={`mt-1 text-lg font-semibold ${stat.accent}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-end gap-1.5 h-16">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-green-500/60"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-white/40">Revenue trend</p>
          </div>
        </div>
      </div>
    </div>
  );
}
