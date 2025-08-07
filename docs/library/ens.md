# ENS (Ethereum Name Service) 実装 詳細ガイド

## 1. はじめに

このドキュメントは、Ethereum Name Service (ENS) をアプリケーションに統合するための詳細な実装ガイドです。viemライブラリを中心とした具体的なコード例とともに、以下の機能の実装方法を解説します。

-   **ユーザーネームの可用性チェック**: ユーザーが希望する `.eth` ドメインが利用可能かどうかをリアルタイムで検証します。
-   **ENS名からアドレスへの解決**: `alice.eth` のようなENS名から、対応するEthereumアドレス (`0x...`) を取得します。
-   **アドレスからENS名への逆引き解決**: Ethereumアドレスから、そのアドレスにプライマリ名として設定されているENS名を取得します。

このガイドは、React環境での開発を想定していますが、viemのコアロジックは他のJavaScript環境でも応用可能です。

## 2. 前提条件と環境構築

### 2.1. 必要なライブラリ

まず、プロジェクトに必要なライブラリをインストールします。`wagmi` はReact Hooksを提供し、`viem` はEthereumとのやり取りを行うための低レベルなインターフェースを提供します。`@tanstack/react-query` は、データの取得やキャッシュを効率的に管理するために `wagmi` によって内部的に使用されます。

```bash
npm install wagmi viem @tanstack/react-query
```

### 2.2. viemクライアントのセットアップ

viemを使用してENSの機能にアクセスするには、まずPublic Clientをセットアップする必要があります。このクライアントは、Ethereumネットワークへの接続を提供します。開発はSepoliaテストネットで行うことを推奨します。

```typescript
// src/client.ts
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: sepolia, // 開発にはSepoliaテストネットを使用
  transport: http(), // RPCプロバイダーへの接続方法
});
```

## 3. ENS機能の実装

### 3.1. ユーザーネームの可用性チェック

ENSドメインの可用性をチェックする最も確実な方法は、そのドメインの所有者（owner）を問い合わせることです。所有者が存在しない場合、そのドメインは利用可能と判断できます。viemの `getEnsOwner` アクションを使用します。

```typescript
// src/ens/checkAvailability.ts
import { publicClient } from '../client';
import { normalize } from 'viem/ens';

/**
 * 指定されたENS名が利用可能かどうかをチェックします。
 * @param name チェックするENS名 (例: 'alice.eth')
 * @returns 利用可能な場合はtrue、そうでない場合はfalseを返します。
 */
export async function checkEnsAvailability(name: string): Promise<boolean> {
  try {
    const owner = await publicClient.getEnsOwner({
      name: normalize(name), // ENS名を正規化
    });

    // ownerがnullまたはゼロアドレスの場合、利用可能と見なす
    return owner === null || owner === '0x0000000000000000000000000000000000000000';
  } catch (error) {
    // getEnsOwnerは名前が存在しない場合にエラーをスローすることがある
    console.error(`Error checking availability for ${name}:`, error);
    // エラーが発生した場合、一般的には利用可能と解釈できることが多い
    return true;
  }
}

// --- 使用例 ---
async function main() {
  const isAvailable = await checkEnsAvailability('unregistered-name-12345.eth');
  console.log(`Is 'unregistered-name-12345.eth' available? ${isAvailable}`);

  const isTaken = await checkEnsAvailability('vitalik.eth');
  console.log(`Is 'vitalik.eth' available? ${!isTaken}`);
}

main();
```

**ポイント:**

-   `normalize(name)`: ENS名はUnicode文字を含むことができるため、問い合わせ前に必ず正規化（Nameprepアルゴリズム）を行う必要があります。viemの `normalize` 関数がこれを行います。
-   **エラーハンドリング**: `getEnsOwner` は、名前が存在しない場合にエラーをスローすることがあります。`try...catch` ブロックでこれを捕捉し、エラーが発生した場合はドメインが利用可能であると判断するのが一般的です。

### 3.2. ENS名からアドレスへの解決 (Forward Resolution)

`getEnsAddress` アクションを使用して、ENS名に対応するEthereumアドレスを取得します。

```typescript
// src/ens/resolveAddress.ts
import { publicClient } from '../client';
import { normalize } from 'viem/ens';

/**
 * ENS名からEthereumアドレスを解決します。
 * @param name 解決するENS名 (例: 'vitalik.eth')
 * @returns 解決されたEthereumアドレス、または存在しない場合はnullを返します。
 */
export async function resolveAddress(name: string): Promise<string | null> {
  try {
    const address = await publicClient.getEnsAddress({
      name: normalize(name),
    });
    return address;
  } catch (error) {
    console.error(`Could not resolve ENS name ${name}:`, error);
    return null;
  }
}

// --- 使用例 ---
async function main() {
  const address = await resolveAddress('vitalik.eth');
  console.log(`Address for 'vitalik.eth': ${address}`);
}

main();
```

### 3.3. アドレスからENS名への解決 (Reverse Resolution)

`getEnsName` アクションを使用して、特定のEthereumアドレスに紐づくプライマリENS名を取得します。これは「逆引き」と呼ばれます。

```typescript
// src/ens/resolveName.ts
import { publicClient } from '../client';
import { getAddress } from 'viem';

/**
 * EthereumアドレスからプライマリENS名を解決します。
 * @param address 解決するEthereumアドレス
 * @returns 解決されたプライマリENS名、または存在しない場合はnullを返します。
 */
export async function resolveName(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await publicClient.getEnsName({
      address: getAddress(address), // アドレスをチェックサム付きに変換
    });
    return name;
  } catch (error) {
    console.error(`Could not resolve address ${address}:`, error);
    return null;
  }
}

// --- 使用例 ---
async function main() {
  const name = await resolveName('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  console.log(`ENS name for 0xd8dA...6045: ${name}`);
}

main();
```

**ポイント:**

-   `getAddress(address)`: viemのアクションにアドレスを渡す際は、チェックサム付きアドレスに変換することが推奨されます。`getAddress` 関数がこの処理を行います。

## 4. コントラクト情報とエンドポイント

通常、viemやwagmiのような高レベルなライブラリを使用する場合、コントラクトアドレスを直接意識する必要はありません。ライブラリが内部で現在のネットワークに適したアドレスを自動的に解決してくれます。

ただし、デバッグや低レベルな操作のために知っておくべき情報は以下の通りです。

-   **ENS Registry and Resolver Addresses**: これらのアドレスはネットワーク（Mainnet, Sepolia, Goerliなど）ごとに異なります。最新のアドレスは [ENS公式ドキュメント](https://docs.ens.domains/learn/deployments) で確認できます。
-   **ENS Subgraph**: ドメインの所有履歴、サブドメイン、リゾルバーの変更履歴など、より複雑なデータを取得したい場合は、The GraphのENS Subgraphを利用します。これはGraphQL APIを提供します。
    -   **Sepolia Subgraph Endpoint**: `https://api.thegraph.com/subgraphs/name/ensdomains/enssepolia`

## 5. Reactコンポーネントでの統合例

`wagmi` を使用すると、これらのENS機能をReactコンポーネント内で簡単に利用できます。

```tsx
// src/components/EnsProfile.tsx
import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';

export function EnsProfile() {
  const { address, isConnected } = useAccount();
  const { data: ensName, isLoading: isEnsNameLoading } = useEnsName({
    address,
    chainId: 11155111, // SepoliaのENS名を解決
  });
  const { data: ensAvatar, isLoading: isEnsAvatarLoading } = useEnsAvatar({
    name: ensName!,
    chainId: 11155111,
    enabled: !!ensName, // ensNameが取得できた場合にのみ実行
  });

  if (!isConnected) {
    return <div>Please connect your wallet.</div>;
  }

  return (
    <div>
      <h2>My Profile</h2>
      <p>Address: {address}</p>
      <p>
        ENS Name: {isEnsNameLoading ? 'Loading...' : (ensName || 'No ENS name found')}
      </p>
      <div>
        Avatar: 
        {isEnsAvatarLoading ? (
          <span>Loading avatar...</span>
        ) : (
          ensAvatar && <img src={ensAvatar} alt="ENS Avatar" style={{ width: 50, height: 50, borderRadius: '50%' }} />
        )}
      </div>
    </div>
  );
}
```

このガイドが、あなたのアプリケーションへのENS統合の一助となれば幸いです。


