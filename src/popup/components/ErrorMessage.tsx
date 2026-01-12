interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="text-4xl">⚠️</div>
      <div className="text-text-primary font-medium text-center">
        {message}
      </div>
      <div className="text-text-secondary text-sm text-center">
        请打开 Four.meme 代币页面后重试
      </div>
    </div>
  );
}
