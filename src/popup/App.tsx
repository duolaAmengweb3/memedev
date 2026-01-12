import { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import type { AnalysisResult } from '@/types';
import { TokenCard } from './components/TokenCard';
import { CreatorCard } from './components/CreatorCard';
import { CreatorTokens } from './components/CreatorTokens';
import { RiskScore } from './components/RiskScore';
import { MarketData } from './components/MarketData';
import { HolderAnalysis } from './components/HolderAnalysis';
import { SocialLinks } from './components/SocialLinks';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-danger">
          <h2 className="font-bold mb-2">渲染错误</h2>
          <p className="text-sm">{this.state.error?.message}</p>
          <pre className="text-xs mt-2 bg-card p-2 rounded overflow-auto max-h-40">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  console.log('[Popup] App render - loading:', loading, 'error:', error, 'analysis:', !!analysis);

  // Get token address from current tab
  useEffect(() => {
    console.log('[Popup] Getting current tab URL...');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      console.log('[Popup] Current tab:', tab?.url);
      if (tab?.url) {
        const match = tab.url.match(/four\.meme\/[\w-]*\/?token\/(0x[a-fA-F0-9]{40})/i);
        if (match) {
          console.log('[Popup] Found token address:', match[1]);
          setTokenAddress(match[1]);
        } else {
          console.log('[Popup] Not a token page');
          setLoading(false);
          setError('请打开 Four.meme 代币页面');
        }
      } else {
        console.log('[Popup] No tab URL');
        setLoading(false);
        setError('无法获取页面信息');
      }
    });
  }, []);

  // Analyze token when address is available
  useEffect(() => {
    if (!tokenAddress) return;

    setLoading(true);
    setError(null);

    console.log('[Popup] Sending ANALYZE_TOKEN for:', tokenAddress);

    chrome.runtime.sendMessage(
      { type: 'ANALYZE_TOKEN', address: tokenAddress },
      (response) => {
        console.log('[Popup] Received response:', response);
        setLoading(false);
        if (response?.type === 'ANALYSIS_RESULT') {
          console.log('[Popup] Analysis result:', response.result);
          console.log('[Popup] Holders:', response.result.holders);
          console.log('[Popup] Creator holding:', response.result.creator.holding);
          console.log('[Popup] Holder concentration:', response.result.holderConcentration);
          setAnalysis(response.result);
        } else if (response?.type === 'ANALYSIS_ERROR') {
          setError(response.error);
        } else {
          setError('分析代币失败');
        }
      }
    );
  }, [tokenAddress]);

  // Listen for creator tokens updates from background
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'CREATOR_TOKENS_UPDATE' && message.tokenAddress === tokenAddress) {
        console.log('[Popup] Received creator tokens update:', message.tokens.length, 'loading:', message.loading);
        setAnalysis((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            creator: {
              ...prev.creator,
              createdTokens: message.tokens,
            },
          };
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [tokenAddress]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon32.png"
            alt="Logo"
            className="w-8 h-8 rounded-full"
          />
          <h1 className="text-lg font-bold text-primary">
            FourMeme 分析器
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <button
              onClick={() => {
                setLoading(true);
                console.log('[Popup] Force refresh for:', tokenAddress);
                chrome.runtime.sendMessage(
                  { type: 'ANALYZE_TOKEN', address: tokenAddress, forceRefresh: true },
                  (response) => {
                    console.log('[Popup] Refresh response:', response);
                    setLoading(false);
                    if (response?.type === 'ANALYSIS_RESULT') {
                      setAnalysis(response.result);
                    }
                  }
                );
              }}
              className="text-sm text-text-secondary hover:text-primary"
            >
              ↻ 刷新
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner />}

      {error && !loading && <ErrorMessage message={error} />}

      {analysis && !loading && (
        <>
          <TokenCard token={analysis.token} />
          <CreatorCard creator={analysis.creator} />
          {analysis.creator.createdTokens && analysis.creator.createdTokens.length > 0 && (
            <CreatorTokens
              tokens={analysis.creator.createdTokens}
              currentTokenAddress={analysis.token.address}
            />
          )}
          <RiskScore risk={analysis.risk} />
          <MarketData market={analysis.market} />
          <HolderAnalysis
            concentration={analysis.holderConcentration}
            holders={analysis.holders}
            creatorAddress={analysis.creator.address}
          />
          <SocialLinks token={analysis.token} />
        </>
      )}

      {/* Footer with social links */}
      <div className="pt-3 border-t border-card space-y-2">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://t.me/dsa885"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition-colors"
            title="Telegram"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className="text-xs">Telegram</span>
          </a>
          <a
            href="https://x.com/hunterweb303"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition-colors"
            title="X (Twitter)"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-xs">X</span>
          </a>
        </div>
        <div className="text-center text-xs text-text-secondary">
          数据仅供参考，投资需谨慎 (DYOR)
        </div>
      </div>
    </div>
  );
}

// Wrap App with ErrorBoundary
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
