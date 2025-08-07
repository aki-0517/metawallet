# Web3Auth 実装 詳細ガイド

## 1. はじめに

このドキュメントは、Web3Auth をアプリケーションに統合するための詳細な実装ガイドです。Web3Authは、Multi-Party Computation (MPC) 技術を活用したノンカストディアルウォレットソリューションであり、ユーザーはメールアドレスやソーシャルアカウントを通じて簡単にWeb3アプリケーションにログインし、EVMおよびSolana互換のウォレットを自動的に生成できます。

このガイドでは、以下の主要な機能の実装方法を具体的に解説します。

-   **メール認証とウォレット生成**: ユーザーがメールアドレスやソーシャルアカウントでサインアップ・ログインし、バックグラウンドでEVMとSolanaのウォレットが生成されるプロセス。
-   **トランザクション署名**: 生成されたウォレットを使用して、EVMおよびSolanaネットワーク上でのトランザクションに署名する方法。
-   **Paymaster統合 (ERC-4337)**: Account Abstraction (ERC-4337) を利用して、ガスレス（Gasless）トランザクションを実現し、ユーザーエクスペリエンスを向上させる方法。

## 2. 前提条件と環境構築

### 2.1. 必要なライブラリ

Web3Authをプロジェクトに統合するには、以下の主要なSDKをインストールする必要があります。

```bash
npm install @web3auth/modal @web3auth/ethereum-provider @web3auth/solana-provider @web3auth/base
```

-   `@web3auth/modal`: Web3Authの認証フローとウォレット接続のためのモーダルUIを提供します。
-   `@web3auth/ethereum-provider`: Ethereum Virtual Machine (EVM) 互換のブロックチェーン（Ethereum Mainnet, Sepolia, Polygonなど）とのインタラクションを可能にします。
-   `@web3auth/solana-provider`: Solanaブロックチェーンとのインタラクションを可能にします。
-   `@web3auth/base`: Web3Auth SDKのコア機能と共通の型定義を提供します。

### 2.2. Web3Auth Dashboardでの設定

Web3Auth SDKを使用する前に、[Web3Auth Dashboard](https://dashboard.web3auth.io/) で新しいプロジェクトを作成し、`Client ID` を取得する必要があります。この `Client ID` はSDKの初期化時に必須となります。

1.  **プロジェクトの作成**: Dashboardにログインし、「Create New Project」をクリックします。
2.  **プロジェクト名の設定**: プロジェクトに分かりやすい名前を付けます。
3.  **ネットワークの選択**: アプリケーションが接続するWeb3Authネットワークを選択します。開発中は `Sapphire Devnet` または `Sapphire Testnet` を推奨します。本番環境では `Sapphire Mainnet` を使用します。
4.  **Client IDの取得**: プロジェクトが作成されると、一意の `Client ID` が発行されます。これをメモしておきます。
5.  **ドメイン許可リスト (Whitelist)**: アプリケーションがデプロイされるドメインを「Whitelist」セクションに追加します。これにより、不正なドメインからのSDKの使用を防ぎ、セキュリティを強化します。開発中は `localhost` や開発用URLを追加します。
6.  **ソーシャルプロバイダーの設定**: ユーザーがログインに使用するソーシャルプロバイダー（Google, Facebook, Twitterなど）を有効にし、必要に応じてAPIキーやシークレットを設定します。

## 3. Web3Auth SDKの初期化とウォレット生成

Web3Auth SDKの初期化は、アプリケーションの起動時に一度だけ行います。これにより、Web3Authの認証フローとウォレット管理機能が利用可能になります。

### 3.1. SDKの初期化

`Web3Auth` クラスのインスタンスを作成し、`initModal()` メソッドを呼び出します。`clientId` と `web3AuthNetwork` は必須です。`chainConfig` は、初期接続するブロックチェーンネットワークの設定です。

```typescript
// src/web3auth.ts
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

const clientId = "YOUR_WEB3AUTH_CLIENT_ID"; // Web3Auth Dashboardで取得したClient IDに置き換える

export const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // 開発中はDevnetまたはTestnetを使用
  chainConfig: {
    chainNamespace: CHAIN_NAMESPACES.EIP155, // EVM互換チェーンの場合
    chainId: "0xaa36a7", // Sepolia TestnetのChain ID
    rpcTarget: "https://rpc.sepolia.org", // Sepolia TestnetのRPCエンドポイント
    displayName: "Sepolia Testnet",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  },
  uiConfig: {
    appName: "My Web3App",
    appLogo: "https://web3auth.io/images/w3a-L-Favicon-1.svg", // アプリケーションのロゴ
    theme: "dark", // "light" または "dark"
    primaryButtonProvider: "google", // ログインモーダルで最初に表示されるプロバイダー
  },
});

export async function initializeWeb3Auth() {
  try {
    await web3auth.initModal();
    console.log("Web3Auth initialized successfully");
  } catch (error) {
    console.error("Error initializing Web3Auth:", error);
  }
}

// アプリケーションのルートで呼び出す例
// initializeWeb3Auth();
```

**`chainConfig` の設定**: `chainConfig` は、Web3Authが初期化時に接続するデフォルトのブロックチェーンネットワークを定義します。ユーザーはログイン後にネットワークを切り替えることも可能です。

-   **EVMチェーンの場合**: `CHAIN_NAMESPACES.EIP155` を使用し、`chainId` (16進数文字列) と `rpcTarget` を指定します。主要なチェーンのChain IDとRPCエンドポイントは、[Chainlist](https://chainlist.org/)などで確認できます。
-   **Solanaチェーンの場合**: `CHAIN_NAMESPACES.SOLANA` を使用し、Solanaの `chainId` と `rpcTarget` を指定します。SolanaのChain IDは、Mainnet-betaが `0x1`、Devnetが `0x2`、Testnetが `0x3` です。

### 3.2. ユーザーログインとウォレット生成

`web3auth.connect()` メソッドを呼び出すことで、Web3Authのログインモーダルが表示され、ユーザーは選択したソーシャルプロバイダーまたはメールアドレスでログインできます。ログインが成功すると、Web3Authはユーザーの秘密鍵をMPC技術で安全に生成・管理し、対応するEVMおよびSolanaウォレットをバックグラウンドで作成します。

```typescript
// src/auth.ts
import { web3auth } from "./web3auth";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

export async function login() {
  try {
    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      console.error("Web3Auth provider not available.");
      return;
    }

    console.log("Logged in successfully!");

    // ログイン後のプロバイダーからEVMプロバイダーを取得
    const evmProvider = new EthereumPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0xaa36a7", // Sepolia Testnet
          rpcTarget: "https://rpc.sepolia.org",
        },
      },
    });
    await evmProvider.setupProvider(web3authProvider);
    console.log("EVM Provider setup complete.");

    // ログイン後のプロバイダーからSolanaプロバイダーを取得
    const solanaProvider = new SolanaPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
          chainId: "0x2", // Solana Devnet
          rpcTarget: "https://api.devnet.solana.com",
        },
      },
    });
    await solanaProvider.setupProvider(web3authProvider);
    console.log("Solana Provider setup complete.");

    // ユーザー情報の取得
    const user = await web3auth.getUserInfo();
    console.log("User Info:", user);

    // ウォレットアドレスの取得
    const evmAccounts = await evmProvider.getAccounts();
    console.log("EVM Account:", evmAccounts[0]);

    const solanaAccounts = await solanaProvider.getAccounts();
    console.log("Solana Account:", solanaAccounts[0]);

    return { evmProvider, solanaProvider, user };

  } catch (error) {
    console.error("Error logging in:", error);
  }
}

export async function logout() {
  try {
    await web3auth.logout();
    console.log("Logged out successfully!");
  } catch (error) {
    console.error("Error logging out:", error);
  }
}
```

**ポイント**: ログイン後、`web3auth.connect()` が返す `web3authProvider` オブジェクトは、EVMおよびSolanaのトランザクション署名に使用できる汎用的なプロバイダーです。このプロバイダーを `EthereumPrivateKeyProvider` や `SolanaPrivateKeyProvider` に渡すことで、それぞれのチェーンに特化した操作を行うためのプロバイダーインスタンスを取得できます。

## 4. トランザクション署名

Web3Authを通じて取得したEVMまたはSolanaプロバイダーを使用することで、ユーザーはトランザクションに署名し、ブロックチェーンに送信できます。Web3Authは、署名プロセス中にユーザーに確認UIを表示し、セキュリティを確保します。

### 4.1. EVMトランザクションの署名

`@web3auth/ethereum-provider` を使用して、EVMトランザクションに署名します。`ethers.js` (v6以降を推奨) などの人気のあるライブラリと統合できます。

```typescript
// src/evm/transaction.ts
import { ethers } from "ethers";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

/**
 * EVMトランザクションに署名し、送信します。
 * @param evmProvider Web3Authから取得したEthereumPrivateKeyProviderインスタンス
 * @param to 送信先アドレス
 * @param value 送信量 (ETH単位)
 * @returns トランザクションレスポンス
 */
export async function sendEvmTransaction(
  evmProvider: EthereumPrivateKeyProvider,
  to: string,
  value: string
) {
  try {
    const ethersProvider = new ethers.BrowserProvider(evmProvider); // Web3Authプロバイダーをethersのプロバイダーにラップ
    const signer = await ethersProvider.getSigner(); // 署名者を取得

    const tx = {
      to: to,
      value: ethers.parseEther(value), // ETH量をweiに変換
    };

    console.log("Sending EVM transaction:", tx);
    const txResponse = await signer.sendTransaction(tx);
    console.log("Transaction sent:", txResponse);
    await txResponse.wait(); // トランザクションがブロックに取り込まれるのを待つ
    console.log("Transaction confirmed!");
    return txResponse;
  } catch (error) {
    console.error("Error sending EVM transaction:", error);
    throw error;
  }
}

// --- 使用例 ---
// import { login } from "../auth";
// async function exampleEvmTransaction() {
//   const { evmProvider } = await login();
//   if (evmProvider) {
//     await sendEvmTransaction(evmProvider, "0xYourRecipientAddress", "0.001");
//   }
// }
// exampleEvmTransaction();
```

### 4.2. Solanaトランザクションの署名

`@web3auth/solana-provider` を使用して、Solanaトランザクションに署名します。`@solana/web3.js` ライブラリと統合できます。

```typescript
// src/solana/transaction.ts
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

/**
 * Solanaトランザクションに署名し、送信します。
 * @param solanaProvider Web3Authから取得したSolanaPrivateKeyProviderインスタンス
 * @param recipientAddress 送信先Solanaアドレス
 * @param amount 送信量 (SOL単位)
 * @returns トランザクション署名
 */
export async function sendSolanaTransaction(
  solanaProvider: SolanaPrivateKeyProvider,
  recipientAddress: string,
  amount: number
) {
  try {
    const connection = new Connection(solanaProvider.rpcTarget); // Solana RPC接続
    const fromPubkey = new PublicKey((await solanaProvider.getAccounts())[0]); // 送信元アドレス
    const toPubkey = new PublicKey(recipientAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL, // SOL量をlamportsに変換
      })
    );

    console.log("Sending Solana transaction:", transaction);
    const signedTransaction = await solanaProvider.signTransaction(transaction); // 署名
    const signature = await connection.sendRawTransaction(signedTransaction.serialize()); // 送信

    console.log("Transaction sent. Signature:", signature);
    await connection.confirmTransaction(signature, "confirmed"); // トランザクションの確認を待つ
    console.log("Transaction confirmed!");
    return signature;
  } catch (error) {
    console.error("Error sending Solana transaction:", error);
    throw error;
  }
}

// --- 使用例 ---
// import { login } from "../auth";
// async function exampleSolanaTransaction() {
//   const { solanaProvider } = await login();
//   if (solanaProvider) {
//     await sendSolanaTransaction(solanaProvider, "YourRecipientSolanaAddress", 0.001);
//   }
// }
// exampleSolanaTransaction();
```

## 5. Paymaster統合 (ERC-4337)

Web3Authは、ERC-4337 (Account Abstraction) とPaymasterサービスを統合することで、ユーザーがガス代を支払うことなくトランザクションを実行できる「ガスレス」な体験を提供します。これは、特に新規ユーザーのオンボーディングにおいて、大きな障壁を取り除くことができます。

### 5.1. ERC-4337の基本概念

-   **Account Abstraction (AA)**: ウォレットのロジックとキー管理を分離し、スマートコントラクトウォレット（Smart Account）を可能にするEthereumの提案です。これにより、ユーザーはカスタムの検証ロジック（例: 多要素認証、ソーシャルリカバリー）や、ガス代の支払い方法（例: ERC-20トークンでの支払い、Paymasterによるスポンサーシップ）を柔軟に設定できます。
-   **UserOperation**: AAにおける「トランザクション」の概念です。ユーザーの意図する操作を記述した構造体で、直接ブロックチェーンに送信されるのではなく、EntryPointコントラクトに送信されます。
-   **EntryPoint**: UserOperationを処理し、Smart Accountと対話する唯一の信頼できるコントラクトです。
-   **Bundler**: UserOperationを収集し、EntryPointに送信する役割を担います。これにより、ユーザーはガス代を支払う必要がなくなります。
-   **Paymaster**: UserOperationのガス代をスポンサーするサービスです。ユーザーはPaymasterに別のトークンで支払うか、全く支払わない（スポンサーされる）ことができます。

### 5.2. Web3AuthとPaymasterの統合

Web3Authは、内部的にAccount Abstractionをサポートしており、Paymasterサービスと連携することでガスレスなトランザクションを実現します。具体的な統合手順は、使用するPaymasterサービスによって異なりますが、一般的な流れは以下の通りです。

1.  **Web3Auth SDKの初期化**: `chainConfig` にて、Account Abstractionをサポートするチェーン（例: Polygon PoS, Arbitrum, Optimismなど）を設定します。
2.  **Smart Accountの取得**: ログイン後、Web3Authはユーザーの秘密鍵からSmart Accountを導出します。このSmart Accountが、トランザクションの実行とガス代の抽象化を処理します。
3.  **Paymasterサービスの選択と設定**: Pimlico, Biconomy, StackupなどのPaymasterサービスを選択し、それぞれのAPIキーやエンドポイントを設定します。これらのサービスは、UserOperationの構築と署名、そしてガス代のスポンサーシップを支援するSDKを提供しています。
4.  **UserOperationの構築と送信**: ユーザーがトランザクションを実行する際、通常のトランザクションの代わりにUserOperationを構築します。このUserOperationには、実行したい操作（例: ERC-20トークンの転送）と、Paymasterに関する情報（例: PaymasterのURL、Paymasterが要求するデータ）を含めます。
5.  **Bundlerによる処理**: 構築されたUserOperationは、Bundlerによって収集され、EntryPointコントラクトに送信されます。Paymasterは、この時点でガス代を支払い、トランザクションが実行されます。

**実装例 (概念)**:

Web3Authのドキュメントでは、`@web3auth/ethereum-provider` を使用して、`ethers.js` と `biconomy-sdk` のようなPaymaster SDKを組み合わせる例が示されています。以下は、その概念的なコードスニペットです。

```typescript
// src/evm/gaslessTransaction.ts (概念的なコード)
import { ethers } from "ethers";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
// import { BiconomySmartAccountV2 } from "@biconomy/account"; // 例: Biconomy SDK
// import { PaymasterMode } from "@biconomy/paymaster"; // 例: Biconomy SDK

/**
 * Paymasterを利用したガスレスEVMトランザクションを送信します。
 * これは概念的な例であり、実際のPaymaster SDKの統合が必要です。
 * @param evmProvider Web3Authから取得したEthereumPrivateKeyProviderインスタンス
 * @param to 送信先アドレス
 * @param value 送信量 (ETH単位)
 */
export async function sendGaslessEvmTransaction(
  evmProvider: EthereumPrivateKeyProvider,
  to: string,
  value: string
) {
  try {
    const ethersProvider = new ethers.BrowserProvider(evmProvider);
    const signer = await ethersProvider.getSigner();

    // ここでSmart Accountを初期化し、Paymasterと連携させる
    // 例: BiconomySmartAccountV2 の初期化
    // const biconomySmartAccount = new BiconomySmartAccountV2({
    //   signer: signer,
    //   chainId: 80001, // Polygon Mumbai TestnetのChain ID
    //   biconomyPaymasterApiKey: "YOUR_BICONOMY_PAYMASTER_API_KEY",
    //   // ... その他の設定
    // });
    // const smartAccount = await biconomySmartAccount.init();

    // UserOperationの構築
    const tx = {
      to: to,
      value: ethers.parseEther(value),
      data: "0x", // 必要に応じてデータを含める
    };

    // 例: Biconomy SDK を使用してUserOperationを構築し、Paymasterに送信
    // const userOp = await smartAccount.buildUserOp([{
    //   to: tx.to,
    //   data: tx.data,
    //   value: tx.value,
    // }]);

    // const paymasterService = biconomySmartAccount.getPaymasterApi();
    // const paymasterAndData = await paymasterService.getPaymasterAndData(userOp, { mode: PaymasterMode.SPONSORED });
    // userOp.paymasterAndData = paymasterAndData;

    // UserOperationの送信 (Bundler経由)
    // const userOpResponse = await smartAccount.sendUserOp(userOp);
    // const txHash = await userOpResponse.waitForTxHash();
    // console.log("Gasless Transaction Hash:", txHash);

    console.log("Gasless transaction logic needs to be implemented with a specific Paymaster SDK.");

  } catch (error) {
    console.error("Error sending gasless EVM transaction:", error);
    throw error;
  }
}
```

**PaymasterサービスとAccount Abstractionウォレットの設定**: 各Paymasterサービスは、独自のSDKと設定手順を持っています。Web3Authと連携する際は、Web3Authのドキュメントと、選択したPaymasterサービスの公式ドキュメントを必ず参照してください。

## 6. 設定項目とセキュリティ

Web3Auth Dashboardでは、アプリケーションのセキュリティとユーザーエクスペリエンスを最適化するための様々な設定が可能です。

### 6.1. Web3Auth Dashboardでの主要な設定項目

-   **Client ID**: 各プロジェクトに割り当てられる一意の識別子。SDKの初期化に必要。
-   **サポートするログインプロバイダー**: Google, Facebook, Twitter, Discord, Email Passwordless, WebAuthnなど、ユーザーがログインに使用できるプロバイダーを有効/無効にします。各プロバイダーには、APIキーやシークレットなどの認証情報が必要な場合があります。
-   **ネットワーク設定**: アプリケーションが接続するWeb3Authネットワーク（Sapphire Mainnet, Sapphire Testnet, Sapphire Devnet）を設定します。これにより、生成されるウォレットのキーシェアがどのネットワークに保存されるかが決まります。
-   **ドメイン許可リスト (Whitelist)**: Web3Auth SDKを使用できるドメインを制限することで、セキュリティを強化します。本番環境では、アプリケーションがデプロイされるすべてのドメインを正確にリストアップすることが重要です。
-   **セキュリティ設定**: 秘密鍵の共有方法（例: MPCの閾値設定）や、多要素認証（MFA）のオプションなど、ウォレットのセキュリティに関する詳細な設定を行います。
-   **カスタムブランディング**: Web3AuthのモーダルUIの見た目（ロゴ、色、テーマなど）を、アプリケーションのブランドに合わせてカスタマイズできます。これにより、ユーザーにシームレスな体験を提供できます。

### 6.2. セキュリティに関する考慮事項

-   **Client IDの保護**: `Client ID` は公開されても問題ありませんが、秘密鍵やAPIシークレットなどの機密情報は絶対にクライアントサイドにハードコードしないでください。これらはサーバーサイドで安全に管理し、必要に応じて環境変数などを使用してください。
-   **ドメイン許可リストの厳格な管理**: 本番環境では、許可リストに登録されていないドメインからのアクセスを厳しく制限することで、フィッシング攻撃や不正利用のリスクを低減できます。
-   **ユーザーへの注意喚起**: ユーザーに対して、トランザクション署名時の確認画面の内容をよく確認するよう促し、不審な要求には応じないよう教育することが重要です。
-   **エラーハンドリングとロギング**: SDKからのエラーメッセージを適切にハンドリングし、問題発生時には詳細なログを記録することで、デバッグとセキュリティ監査に役立てます。

この詳細ガイドが、あなたのアプリケーションへのWeb3Auth統合を成功させるための一助となれば幸いです。


