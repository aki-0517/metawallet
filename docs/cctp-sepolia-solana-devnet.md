# CCTP Sepolia & Solana Devnet 設定ガイド

## 概要

このドキュメントでは、CCTP V2を使用したEthereum SepoliaとSolana Devnet間のUSDCブリッジに必要な設定情報をまとめています。

## テストネット設定

### Ethereum Sepolia (Domain: 0)

#### コントラクトアドレス

| コントラクト | アドレス |
|-------------|----------|
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` |
| TokenMinterV2 | `0xb43db544E2c27092c107639Ad201b3dEfAbcF192` |
| MessageV2 | `0xbaC0179bB358A8936169a63408C8481D582390C4` |

#### USDC アドレス
- **USDC Sepolia**: `0x1c7d4b196cb0c7b01d743fbc6116a902379c7238`

### Solana Devnet (Domain: 5)

#### プログラムアドレス

| プログラム | アドレス |
|-----------|----------|
| MessageTransmitterV2 | `CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC` |
| TokenMessengerMinterV2 | `CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe` |

#### USDC アドレス
- **USDC Solana Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## CCTP V2 インターフェース

### TokenMessengerV2 (EVM)

#### depositForBurn
```solidity
function depositForBurn(
    uint256 amount,
    uint32 destinationDomain,
    bytes32 mintRecipient,
    address burnToken,
    bytes32 destinationCaller,
    uint256 maxFee,
    uint32 minFinalityThreshold
) external returns (uint64 _nonce);
```

**パラメータ:**
- `amount`: 送金するUSDCの量（wei単位）
- `destinationDomain`: 宛先ドメインID（Solana = 5）
- `mintRecipient`: 宛先アドレス（bytes32形式）
- `burnToken`: 送金元のUSDCコントラクトアドレス
- `destinationCaller`: 宛先でメッセージを受信できるアドレス（bytes32形式）
- `maxFee`: 最大手数料（wei単位）
- `minFinalityThreshold`: 最小ファイナリティ閾値（1000 = Fast, 2000 = Standard）

#### depositForBurnWithHook
```solidity
function depositForBurnWithHook(
    uint256 amount,
    uint32 destinationDomain,
    bytes32 mintRecipient,
    address burnToken,
    bytes32 destinationCaller,
    uint256 maxFee,
    uint32 minFinalityThreshold,
    bytes calldata hookData
) external returns (uint64 _nonce);
```

### MessageTransmitterV2 (EVM)

#### receiveMessage
```solidity
function receiveMessage(
    bytes calldata message,
    bytes calldata attestation
) external returns (bool success);
```

**パラメータ:**
- `message`: エンコードされたメッセージ
- `attestation`: Circleのアテステーションサービスからの署名

#### sendMessage
```solidity
function sendMessage(
    uint32 destinationDomain,
    bytes32 recipient,
    bytes32 destinationCaller,
    uint32 minFinalityThreshold,
    bytes calldata messageBody
) external returns (uint64 _nonce);
```

### TokenMessengerMinterV2 (Solana)

#### depositForBurn
```rust
pub fn deposit_for_burn(
    ctx: Context<DepositForBurn>,
    amount: u64,
    destination_domain: u32,
    mint_recipient: Pubkey,
    destination_caller: Pubkey,
    max_fee: u64,
    min_finality_threshold: u32,
) -> Result<()>
```

**パラメータ:**
- `amount`: 送金するUSDCの量（lamports単位）
- `destination_domain`: 宛先ドメインID（Ethereum Sepolia = 0）
- `mint_recipient`: 宛先のEVMアドレス（Pubkey形式）
- `destination_caller`: 宛先でメッセージを受信できるアドレス
- `max_fee`: 最大手数料（lamports単位）
- `min_finality_threshold`: 最小ファイナリティ閾値

#### depositForBurnWithHook
```rust
pub fn deposit_for_burn_with_hook(
    ctx: Context<DepositForBurnWithHook>,
    amount: u64,
    destination_domain: u32,
    mint_recipient: Pubkey,
    destination_caller: Pubkey,
    max_fee: u64,
    min_finality_threshold: u32,
    hook_data: Vec<u8>,
) -> Result<()>
```

### MessageTransmitterV2 (Solana)

#### receiveMessage
```rust
pub fn receive_message(
    ctx: Context<ReceiveMessage>,
    message: Vec<u8>,
    attestation: Vec<u8>,
) -> Result<()>
```

**Remaining Accounts (deposit for burnメッセージ用):**
- `token_messenger`: TokenMessengerプログラムアカウント
- `remote_token_messenger`: リモートトークンメッセンジャーアカウント
- `token_minter`: TokenMinterプログラムアカウント
- `local_token`: ローカルトークンアカウント
- `token_pair`: トークンペアアカウント
- `user_token_account`: ユーザーのトークンアカウント
- `custody_token_account`: カストディトークンアカウント
- `SPL.token_program_id`: SPLトークンプログラムID
- `token_program_event_authority`: イベント権限アカウント
- `program`: TokenMessengerMinterプログラムID

## アドレス変換ユーティリティ

### EVMアドレスをSolana Pubkeyに変換
```typescript
import { getBytes } from "ethers";
import { PublicKey } from "@solana/web3.js";

const evmAddressToBytes32 = (address: string): string =>
  `0x000000000000000000000000${address.replace("0x", "")}`;

const evmAddressToBase58PublicKey = (addressHex: string): PublicKey =>
  new PublicKey(getBytes(evmAddressToBytes32(addressHex)));
```

### SolanaアドレスをHexに変換
```typescript
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { hexlify } from "ethers";

const solanaAddressToHex = (solanaAddress: string): string =>
  hexlify(bs58.decode(solanaAddress));
```

## アテステーションAPI

### エンドポイント
```
https://iris-api-sandbox.circle.com/v2/messages/{domain}?transactionHash={txHash}
```

### レスポンス形式
```json
{
  "messages": [
    {
      "message": "0x...",
      "attestation": "0x...",
      "status": "complete"
    }
  ]
}
```

## 手数料設定

### Fast Transfer (推奨)
- `minFinalityThreshold`: 1000
- `maxFee`: 500 (0.0005 USDC)

### Standard Transfer
- `minFinalityThreshold`: 2000
- `maxFee`: 0 (現在は無料)

## 実装例

### SolanaからEthereum Sepoliaへの送金

1. **SolanaでUSDCをburn**
```typescript
const burnTx = await solanaProvider.sendTransaction({
  to: CCTP_CONFIG.SOLANA_TOKEN_MESSENGER,
  data: encodeFunctionData({
    abi: [/* depositForBurn ABI */],
    functionName: "depositForBurn",
    args: [
      amount,
      CCTP_CONFIG.ETHEREUM_DOMAIN,
      evmAddressToBase58PublicKey(destinationEvmAddress),
      PublicKey.default, // destinationCaller
      maxFee,
      minFinalityThreshold,
    ],
  }),
});
```

2. **アテステーションを取得**
```typescript
const attestation = await retrieveAttestation(burnTx);
```

3. **Ethereum SepoliaでUSDCをmint**
```typescript
const mintTx = await evmProvider.sendTransaction({
  to: CCTP_CONFIG.ETHEREUM_MESSAGE_TRANSMITTER,
  data: encodeFunctionData({
    abi: [/* receiveMessage ABI */],
    functionName: "receiveMessage",
    args: [attestation.message, attestation.attestation],
  }),
});
```

## 注意事項

1. **メッセージストレージ**: SolanaではMessageSentイベントがアカウントに保存され、約0.00381408 SOLのレントが必要です。

2. **リクレーム期間**: CCTP V2では、メッセージ送信後5日間待機してから`reclaim_event_account`を呼び出す必要があります。

3. **アドレス形式**: SolanaとEVM間のアドレス変換は必須です。

4. **エラーハンドリング**: アテステーション取得には時間がかかるため、適切なタイムアウト処理を実装してください。

5. **レート制限**: アテステーションサービスは35リクエスト/秒の制限があります。

## テスト用ファウセット

- **Sepolia ETH**: [Sepolia Faucet](https://sepoliafaucet.com/)
- **Sepolia USDC**: [Circle Faucet](https://faucet.circle.com/)
- **Solana SOL**: [Solana Faucet](https://faucet.solana.com/)
- **Solana USDC**: [Circle Faucet](https://faucet.circle.com/)
