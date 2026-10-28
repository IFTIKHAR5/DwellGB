export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="text-center py-16 px-6 card border-dashed shadow-none bg-surface/60">
      {Icon && (
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-pine-50 text-pine flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {text && <p className="mt-1.5 text-ink-2 max-w-md mx-auto">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
