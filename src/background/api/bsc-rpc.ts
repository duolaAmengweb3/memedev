import { ethers } from 'ethers';
import type { ApiResponse } from '@/types';

const RPC_ENDPOINTS = [
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-dataseed1.binance.org',
  'https://rpc.ankr.com/bsc',
];

let currentProvider: ethers.JsonRpcProvider | null = null;
let currentRpcIndex = 0;

function getProvider(): ethers.JsonRpcProvider {
  if (!currentProvider) {
    currentProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex]);
  }
  return currentProvider;
}

function switchProvider(): void {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  currentProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex]);
}

export async function getBNBBalance(address: string): Promise<ApiResponse<string>> {
  const maxRetries = RPC_ENDPOINTS.length;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const provider = getProvider();
      const balance = await provider.getBalance(address);
      return {
        success: true,
        data: ethers.formatEther(balance),
      };
    } catch (error) {
      switchProvider();
      if (i === maxRetries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get BNB balance',
        };
      }
    }
  }

  return { success: false, error: 'All RPC endpoints failed' };
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<ApiResponse<string>> {
  const maxRetries = RPC_ENDPOINTS.length;

  // ERC20 balanceOf function signature
  const balanceOfAbi = ['function balanceOf(address) view returns (uint256)'];

  console.log('[BSC-RPC] Getting token balance for:', { tokenAddress, walletAddress });

  for (let i = 0; i < maxRetries; i++) {
    try {
      const provider = getProvider();
      console.log('[BSC-RPC] Using RPC:', RPC_ENDPOINTS[currentRpcIndex]);
      const contract = new ethers.Contract(tokenAddress, balanceOfAbi, provider);
      const balance = await contract.balanceOf(walletAddress);
      console.log('[BSC-RPC] Token balance:', balance.toString());
      return {
        success: true,
        data: balance.toString(),
      };
    } catch (error) {
      console.error('[BSC-RPC] Error getting token balance:', error);
      switchProvider();
      if (i === maxRetries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get token balance',
        };
      }
    }
  }

  return { success: false, error: 'All RPC endpoints failed' };
}

export async function getTotalSupply(tokenAddress: string): Promise<ApiResponse<string>> {
  const maxRetries = RPC_ENDPOINTS.length;

  const totalSupplyAbi = ['function totalSupply() view returns (uint256)'];

  for (let i = 0; i < maxRetries; i++) {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(tokenAddress, totalSupplyAbi, provider);
      const supply = await contract.totalSupply();
      return {
        success: true,
        data: supply.toString(),
      };
    } catch (error) {
      switchProvider();
      if (i === maxRetries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get total supply',
        };
      }
    }
  }

  return { success: false, error: 'All RPC endpoints failed' };
}
