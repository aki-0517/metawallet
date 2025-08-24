# CCTP統合ガイド: SolanaからEVMへの自動ブリッジ送金

## 概要

このガイドでは、送金時にEVMアドレスの残高が不足している場合に、自動的にSolanaアドレスからCCTPブリッジを使用してEVMアドレスに送金するフローを実装します。これにより、送金の最大額はEVM + Solanaの合計残高になります。

## 実装手順

### 1. 依存関係の追加

```bash
npm install @solana/web3.js @solana/spl-token axios
```

### 2. CCTP設定ファイルの作成

`web/src/lib/cctp.ts` を作成し、CCTP関連の設定と関数を定義します：

```typescript
// CCTP設定
export const CCTP_CONFIG = {
  // Solana Devnet
  SOLANA_DOMAIN: 5,
  SOLANA_MESSAGE_TRANSMITTER: "CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC",
  SOLANA_TOKEN_MESSENGER: "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe",
  
  // Ethereum Sepolia
  ETHEREUM_DOMAIN: 0,
  ETHEREUM_TOKEN_MESSENGER: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  ETHEREUM_MESSAGE_TRANSMITTER: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  
  // API
  ATTESTATION_API: "https://iris-api-sandbox.circle.com/v2/messages",
  
  // 手数料設定
  MAX_FEE: 500n, // 0.0005 USDC
  MIN_FINALITY_THRESHOLD: 1000, // Fast Transfer
};

// CCTPメッセージ形式
export interface CCTPMessage {
  message: string;
  attestation: string;
  status: string;
}

// SolanaからEVMへのCCTPブリッジ送金
export async function bridgeFromSolanaToEvm(params: {
  solanaProvider: any;
  amount: number;
  destinationEvmAddress: string;
  solanaAddress: string;
}): Promise<{
  burnTx: string;
  mintTx: string;
}> {
  const { solanaProvider, amount, destinationEvmAddress, solanaAddress } = params;
  
  // 1. SolanaでUSDCをburn
  const burnTx = await burnUsdcOnSolana({
    solanaProvider,
    amount,
    destinationEvmAddress,
    solanaAddress,
  });
  
  // 2. アテステーションを取得
  const attestation = await retrieveAttestation(burnTx);
  
  // 3. EVMでUSDCをmint
  const mintTx = await mintUsdcOnEvm({
    attestation,
    destinationEvmAddress,
  });
  
  return { burnTx, mintTx };
}

// SolanaでのUSDC burn
async function burnUsdcOnSolana(params: {
  solanaProvider: any;
  amount: number;
  destinationEvmAddress: string;
  solanaAddress: string;
}): Promise<string> {
  // Solana CCTP depositForBurn実装
  // 詳細は後述
}

// アテステーション取得
async function retrieveAttestation(transactionHash: string): Promise<CCTPMessage> {
  const url = `${CCTP_CONFIG.ATTESTATION_API}/${CCTP_CONFIG.SOLANA_DOMAIN}?transactionHash=${transactionHash}`;
  
  while (true) {
    try {
      const response = await axios.get(url);
      if (response.data?.messages?.[0]?.status === "complete") {
        return response.data.messages[0];
      }
      console.log("Waiting for attestation...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error fetching attestation:", error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// EVMでのUSDC mint
async function mintUsdcOnEvm(params: {
  attestation: CCTPMessage;
  destinationEvmAddress: string;
}): Promise<string> {
  // EVM CCTP receiveMessage実装
  // 詳細は後述
}
```

### 3. 残高チェック機能の拡張

`web/src/lib/balances.ts` を更新して、合計残高を計算する機能を追加：

```typescript
import { getEvmBalances } from './evm';
import { getSolanaBalances } from './solana';

export async function getTotalUsdcBalance(params: {
  evmAddress: string;
  solanaAddress: string;
  usdcEvmAddress: string;
  usdcSolanaMint: string;
}): Promise<{
  evmBalance: number;
  solanaBalance: number;
  totalBalance: number;
}> {
  const { evmAddress, solanaAddress, usdcEvmAddress, usdcSolanaMint } = params;
  
  const [evmBalances, solanaBalances] = await Promise.all([
    getEvmBalances({
      walletAddress: evmAddress as any,
      usdcAddress: usdcEvmAddress as any,
    }),
    getSolanaBalances({
      owner: solanaAddress,
      usdcMint: usdcSolanaMint,
    }),
  ]);
  
  const totalBalance = evmBalances.usdc + solanaBalances.usdc;
  
  return {
    evmBalance: evmBalances.usdc,
    solanaBalance: solanaBalances.usdc,
    totalBalance,
  };
}
```

### 4. SendMoneyコンポーネントの更新

`web/src/components/SendMoney.tsx` を更新して、自動ブリッジ機能を追加：

```typescript
// 既存のimportに追加
import { getTotalUsdcBalance } from '../lib/balances';
import { bridgeFromSolanaToEvm } from '../lib/cctp';

// SendMoneyコンポーネント内に追加
const [totalBalance, setTotalBalance] = useState<{
  evmBalance: number;
  solanaBalance: number;
  totalBalance: number;
} | null>(null);

// 残高取得
useEffect(() => {
  const fetchTotalBalance = async () => {
    if (evmAddress && solanaAddress) {
      const usdcEvm = (import.meta as any).env?.VITE_USDC_SEPOLIA_ADDRESS;
      const usdcSolana = (import.meta as any).env?.VITE_USDC_SOLANA_MINT;
      
      if (usdcEvm && usdcSolana) {
        const balance = await getTotalUsdcBalance({
          evmAddress,
          solanaAddress,
          usdcEvmAddress: usdcEvm,
          usdcSolanaMint: usdcSolana,
        });
        setTotalBalance(balance);
      }
    }
  };
  
  fetchTotalBalance();
}, [evmAddress, solanaAddress]);

// confirmSend関数を更新
const confirmSend = async () => {
  setIsLoading(true);
  setError('');

  try {
    const usdcEvm = (import.meta as any).env?.VITE_USDC_SEPOLIA_ADDRESS as string;
    const usd = parseFloat(amount);
    const toAddress = sendMode === 'username' ? resolvedAddress : recipient;

    if (!toAddress) {
      throw new Error('Recipient address not found');
    }

    // 残高チェック
    if (!totalBalance) {
      throw new Error('Unable to fetch balance');
    }

    if (totalBalance.totalBalance < usd) {
      throw new Error(`Insufficient balance. Available: ${totalBalance.totalBalance.toFixed(2)} USDC`);
    }

    let hash: string;
    let usedBridge = false;

    // EVM残高が不足している場合、Solanaからブリッジ
    if (totalBalance.evmBalance < usd && totalBalance.solanaBalance >= usd) {
      console.log('EVM balance insufficient, bridging from Solana...');
      
      if (!providers?.solanaProvider || !solanaAddress) {
        throw new Error('Solana provider not available for bridging');
      }

      const { burnTx, mintTx } = await bridgeFromSolanaToEvm({
        solanaProvider: providers.solanaProvider,
        amount: usd,
        destinationEvmAddress: evmAddress!,
        solanaAddress,
      });

      // ブリッジ完了後、通常の送金を実行
      hash = await sendErc20({
        provider: providers.evmProvider,
        tokenAddress: usdcEvm as any,
        from: evmAddress as any,
        to: toAddress as any,
        amountTokens: usd.toFixed(6),
      });

      usedBridge = true;
    } else {
      // 通常の送金フロー
      if (providers.smartAccountProvider && smartAccountAddress) {
        // Smart Account使用
        const smartAccountProvider = providers.smartAccountProvider;
        const smartAccount = smartAccountProvider.smartAccount;
        const bundlerClient = smartAccountProvider.bundlerClient;

        if (smartAccount && bundlerClient) {
          hash = await sendErc20WithUsdcGas({
            smartAccount,
            bundlerClient,
            tokenAddress: usdcEvm as any,
            to: toAddress as any,
            amountTokens: usd.toFixed(6),
          });
        } else {
          hash = await sendErc20({
            provider: providers.evmProvider,
            tokenAddress: usdcEvm as any,
            from: evmAddress as any,
            to: toAddress as any,
            amountTokens: usd.toFixed(6),
          });
        }
      } else {
        hash = await sendErc20({
          provider: providers.evmProvider,
          tokenAddress: usdcEvm as any,
          from: evmAddress as any,
          to: toAddress as any,
          amountTokens: usd.toFixed(6),
        });
      }
    }

    // トランザクション記録
    addTransaction({
      id: `${hash}`,
      type: 'sent',
      counterparty: sendMode === 'username' ? `@${recipient}` : toAddress,
      amount: usd,
      currency: 'USDC',
      chain: usedBridge ? 'solana-ethereum' : 'ethereum',
      status: 'completed',
      timestamp: Date.now(),
      hash,
    });

    // 成功処理
    setRecipient('');
    setAmount('');
    setResolvedAddress(undefined);
    setShowConfirmation(false);
    setError('');
    setTransactionSuccess({
      hash,
      usedGaslessTransfer: !!smartAccountAddress,
      usedBridge,
    });

  } catch (error) {
    console.error('Error sending transaction:', error);
    setError(error instanceof Error ? error.message : 'Failed to send transaction');
  } finally {
    setIsLoading(false);
  }
};
```

### 5. UI更新

送金画面に残高表示とブリッジ情報を追加：

```typescript
// SendMoneyコンポーネントのJSX部分に追加
{totalBalance && (
  <div className="mb-6 p-4 bg-blue-500 bg-opacity-20 rounded-lg">
    <h3 className="text-lg font-semibold text-white mb-2">Available Balance</h3>
    <div className="space-y-1 text-sm text-gray-300">
      <div>EVM: {totalBalance.evmBalance.toFixed(2)} USDC</div>
      <div>Solana: {totalBalance.solanaBalance.toFixed(2)} USDC</div>
      <div className="text-white font-medium">
        Total: {totalBalance.totalBalance.toFixed(2)} USDC
      </div>
    </div>
  </div>
)}

// 成功画面にブリッジ情報を追加
{transactionSuccess?.usedBridge && (
  <div className="mt-4 p-3 bg-blue-500 bg-opacity-20 rounded-lg">
    <p className="text-blue-300 text-sm">
      ⚡ Automatic bridge from Solana to Ethereum completed
    </p>
  </div>
)}
```

### 6. 環境変数の追加

`.env` ファイルにSolana USDC mintアドレスを追加：

```env
VITE_USDC_SOLANA_MINT=your_solana_usdc_mint_address
```

### 7. エラーハンドリングの改善

```typescript
// cctp.tsにエラーハンドリングを追加
export class CCTPError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CCTPError';
  }
}

// ブリッジ関数にエラーハンドリングを追加
export async function bridgeFromSolanaToEvm(params: {
  solanaProvider: any;
  amount: number;
  destinationEvmAddress: string;
  solanaAddress: string;
}): Promise<{
  burnTx: string;
  mintTx: string;
}> {
  try {
    // 既存の実装
  } catch (error) {
    if (error instanceof CCTPError) {
      throw error;
    }
    throw new CCTPError(
      'Bridge transaction failed',
      'BRIDGE_FAILED'
    );
  }
}
```

## 実装の注意点

1. **手数料計算**: CCTPブリッジには手数料がかかるため、送金額に手数料を加算して残高チェックを行う必要があります。

2. **タイムアウト処理**: アテステーション取得には時間がかかるため、適切なタイムアウト処理を実装してください。

3. **エラー復旧**: ブリッジ処理中にエラーが発生した場合の復旧処理を実装してください。

4. **ユーザー体験**: ブリッジ処理中は適切なローディング表示を行い、ユーザーに処理状況を伝えてください。

5. **テスト**: テストネットで十分にテストしてから本番環境にデプロイしてください。

## 次のステップ

1. Solana CCTPプログラムとの詳細な統合
2. メッセージ形式とアテステーション処理の実装
3. エラーハンドリングとリトライ機能の追加
4. ユーザーインターフェースの改善
5. パフォーマンス最適化
