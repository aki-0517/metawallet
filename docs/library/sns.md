# SNS (Solana Name Service) 実装 詳細ガイド

## 1. はじめに

このドキュメントは、Solana Name Service (SNS) をアプリケーションに統合するための詳細な実装ガイドです。`@solana/kit` と `@bonfida/spl-name-service` ライブラリを中心とした具体的なコード例とともに、以下の機能の実装方法を解説します。

-   **ユーザーネームの可用性チェック**: ユーザーが希望する `.sol` ドメインが利用可能かどうかをリアルタイムで検証します。
-   **SNS名からアドレスへの解決**: `alice.sol` のようなSNS名から、対応するSolanaアドレス (`HXt...`) を取得します。
-   **アドレスからSNS名への逆引き解決**: Solanaアドレスから、そのアドレスに紐づくSNS名を取得します。

このガイドは、TypeScript環境での開発を想定しており、Solana Devnetでの動作を前提としています。

## 2. 前提条件と環境構築

### 2.1. 必要なライブラリ

まず、プロジェクトに必要なライブラリをインストールします。`@solana/kit` はSolanaブロックチェーンとの基本的なインタラクションを提供し、`@bonfida/spl-name-service` はSNSに特化した機能を提供します。

```bash
npm install @solana/kit @bonfida/spl-name-service
```

### 2.2. Solana接続のセットアップ

Solanaネットワークに接続するための `Connection` オブジェクトをセットアップします。開発にはDevnetを使用します。

```typescript
// src/solana/connection.ts
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Devnetへの接続
export const connection = new Connection(clusterApiUrl("devnet"));

// または、カスタムRPCエンドポイントを使用する場合
// export const connection = new Connection("https://api.devnet.solana.com");
```

## 3. SNS機能の実装

### 3.1. ユーザーネームの可用性チェック

SNSドメインの可用性をチェックするには、`@bonfida/spl-name-service` の `getDomainKey` 関数と `NameRegistryState.retrieve` 関数を組み合わせます。ドメインが存在しない場合、`getDomainKey` はエラーをスローするか、`NameRegistryState.retrieve` が失敗します。

```typescript
// src/sns/checkAvailability.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { getDomainKey, NameRegistryState } from '@bonfida/spl-name-service';
import { connection } from '../solana/connection';

/**
 * 指定されたSNS名が利用可能かどうかをチェックします。
 * @param domainName チェックするSNS名 (例: 'example.sol')
 * @returns 利用可能な場合はtrue、そうでない場合はfalseを返します。
 */
export async function checkSnsAvailability(domainName: string): Promise<boolean> {
  try {
    // ドメインの公開鍵を取得
    const { pubkey } = await getDomainKey(domainName);

    // ドメインレジストリの状態を取得
    // 存在しない場合はエラーをスローする
    await NameRegistryState.retrieve(connection, pubkey);

    // エラーがスローされなければ、ドメインは既に登録されている
    console.log(`Domain '${domainName}' is already taken.`);
    return false; // 利用不可
  } catch (error) {
    // ドメインが見つからない場合、エラーがスローされる
    // その他のエラーも考慮し、ログを出力
    if (error instanceof Error && error.message.includes("Account does not exist")) {
      console.log(`Domain '${domainName}' is available.`);
      return true; // 利用可能
    } else {
      console.error(`Error checking availability for '${domainName}':`, error);
      // その他のエラーの場合は、安全のため利用不可と判断することも検討
      return false; 
    }
  }
}

// --- 使用例 ---
async function main() {
  const isAvailable = await checkSnsAvailability('unregistered-sol-domain-12345.sol');
  console.log(`Is 'unregistered-sol-domain-12345.sol' available? ${isAvailable}`);

  const isTaken = await checkSnsAvailability('bonfida.sol'); // 既存のドメイン
  console.log(`Is 'bonfida.sol' available? ${isTaken}`);
}

main();
```

**ポイント:**

-   `getDomainKey(domainName)`: 指定されたドメイン名に対応する公開鍵（Public Key）を導出します。この公開鍵は、そのドメインのレジストリアカウントのアドレスとなります。
-   `NameRegistryState.retrieve(connection, pubkey)`: 導出された公開鍵を使用して、Solanaチェーン上のドメインレジストリアカウントの状態を取得します。アカウントが存在しない場合（つまり、ドメインが登録されていない場合）、この関数はエラーをスローします。
-   **エラーハンドリング**: `NameRegistryState.retrieve` が `Account does not exist` のようなエラーをスローした場合、そのドメインは利用可能であると判断できます。その他のエラーは、ネットワークの問題や不正なドメイン名などを示唆する可能性があるため、適切に処理する必要があります。

### 3.2. SNS名からアドレスへの解決 (Forward Resolution)

SNS名から対応するSolanaアドレス（通常はドメインの所有者アドレス）を取得するには、`getDomainKey` と `NameRegistryState.retrieve` を使用してドメインの `owner` を取得します。

```typescript
// src/sns/resolveAddress.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { getDomainKey, NameRegistryState } from '@bonfida/spl-name-service';
import { connection } from '../solana/connection';

/**
 * SNS名からSolanaアドレスを解決します。
 * @param domainName 解決するSNS名 (例: 'bonfida.sol')
 * @returns 解決されたSolanaアドレス、または存在しない場合はnullを返します。
 */
export async function resolveSnsAddress(domainName: string): Promise<string | null> {
  try {
    const { pubkey } = await getDomainKey(domainName);
    const registry = await NameRegistryState.retrieve(connection, pubkey);
    return registry.owner.toBase58(); // ドメインの所有者アドレスを返す
  } catch (error) {
    console.error(`Could not resolve SNS name '${domainName}':`, error);
    return null;
  }
}

// --- 使用例 ---
async function main() {
  const address = await resolveSnsAddress('bonfida.sol');
  console.log(`Address for 'bonfida.sol': ${address}`);
}

main();
```

### 3.3. アドレスからSNS名への解決 (Reverse Resolution)

Solanaアドレスから対応するSNS名を取得する「逆引き」は、`@bonfida/spl-name-service` の `reverseLookup` 関数を使用します。

```typescript
// src/sns/resolveName.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { reverseLookup } from '@bonfida/spl-name-service';
import { connection } from '../solana/connection';

/**
 * SolanaアドレスからプライマリSNS名を解決します。
 * @param address 解決するSolanaアドレス
 * @returns 解決されたプライマリSNS名、または存在しない場合はnullを返します。
 */
export async function resolveSnsName(address: string): Promise<string | null> {
  try {
    const publicKey = new PublicKey(address);
    const domainName = await reverseLookup(connection, publicKey);
    return domainName;
  } catch (error) {
    console.error(`Could not reverse lookup address '${address}':`, error);
    return null;
  }
}

// --- 使用例 ---
async function main() {
  const name = await resolveSnsName('GgX3iR2X92K45b3Y45b3Y45b3Y45b3Y45b3Y45b3Y'); // 例示用アドレス
  console.log(`SNS name for GgX3iR...: ${name}`);
}

main();
```

## 4. コントラクト情報とエンドポイント

SNSはSolanaのプログラムとして実装されており、その識別にはProgram IDが使用されます。また、Solanaネットワークへの接続にはRPCエンドポイントが必要です。

### 4.1. SNS Program ID

`@bonfida/spl-name-service` ライブラリは、内部的に各ネットワークのProgram IDを管理しています。通常、開発者が直接Program IDをハードコードする必要はありませんが、参照のために以下に示します。

-   **Devnet**: `nameservice` (これはエイリアスであり、ライブラリが解決します。)

### 4.2. RPC エンドポイント

Solanaネットワークへの接続には、以下のRPCエンドポイントを使用します。

-   **Solana Devnet RPC**: `https://api.devnet.solana.com`

### 4.3. ドメインレジストリとデータ構造

SNSのドメインは、Solanaチェーン上の特定のアカウント（Name Registry Account）として表現されます。このアカウントは、ドメインの所有者、データ、親ドメインなどの情報を含みます。

-   **`NameRegistryState`**: ドメインレジストリアカウントの構造を定義するクラスです。これを通じて、ドメインの `owner` (所有者アドレス)、`class` (ドメインのタイプ)、`parentName` (サブドメインの場合の親ドメイン)、`data` (追加のレコードデータ) などの情報にアクセスできます。
-   **データフィールド**: `data` フィールドは、テキストレコード（例: `url`, `email`, `avatar`）やIPFSハッシュなど、ドメインに関連する任意のメタデータを格納するために使用されます。これらのデータは、通常、UTF-8エンコードされた文字列として保存されます。
-   **逆引きレコード**: 各Solanaアドレスには、対応する逆引きドメイン（例: `your_address.sol`）が存在する場合があります。これは、アドレスからENS名を解決するために使用されます。

## 5. テストネットでのドメイン取得

DevnetでSNSドメインをテスト目的で取得するには、いくつかの方法があります。

-   **Bonfidaのテストネットツール**: Bonfidaは、DevnetでSNSドメインを登録するためのウェブインターフェースやCLIツールを提供している場合があります。公式ドキュメントを確認してください。
-   **プログラムによる登録**: 開発中のアプリケーションから直接、SNSドメイン登録トランザクションを構築し、送信することも可能です。これには、登録料（SOLまたはサポートされているSPLトークン）が必要になります。

このガイドが、あなたのSolanaアプリケーションへのSNS統合の一助となれば幸いです。