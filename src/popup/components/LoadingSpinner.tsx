export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-12 h-12 border-4 border-card border-t-primary rounded-full spinner" />
      <div className="text-text-secondary text-sm">正在分析代币...</div>
    </div>
  );
}
