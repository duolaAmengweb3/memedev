import type { TokenInfo } from '@/types';

interface SocialLinksProps {
  token: TokenInfo;
}

export function SocialLinks({ token }: SocialLinksProps) {
  const links = [
    { icon: '🐦', label: 'Twitter', url: token.twitter },
    { icon: '✈️', label: 'Telegram', url: token.telegram },
    { icon: '🌐', label: '官网', url: token.website },
  ].filter((link) => link.url);

  if (links.length === 0 && !token.tradeUrl) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Social Links */}
      {links.length > 0 && (
        <div className="flex gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-card hover:bg-card-hover rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Trade Link */}
      {token.tradeUrl && (
        <a
          href={token.tradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/80 rounded-lg text-white font-medium transition-colors"
        >
          <span>🥞</span>
          在 {token.dexType?.replace('_', ' ') || 'DEX'} 交易
        </a>
      )}
    </div>
  );
}
