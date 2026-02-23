# セットアップ手順

## 1. 環境変数の設定

プロジェクトルートに `.env` を作成し、以下のキーを設定します。

```
NUXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=<your-anon-key>

# OpenAI（サーバーサイドのみ。クライアントには公開しない）
OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini   # 省略時は gpt-4o-mini を使用
```

> **注意**: `.env` は `.gitignore` に含まれており、リポジトリにはコミットされません。

### OpenAI APIキーの取得手順

1. [OpenAI Platform](https://platform.openai.com/api-keys) にログインする
2. **「+ Create new secret key」** をクリックしてキーを発行する
3. 発行されたキー（`sk-...`）を `.env` の `OPENAI_API_KEY` に貼り付ける
4. モデルを変更したい場合は `OPENAI_MODEL` に任意のモデル名を指定する（例: `gpt-4o`）

> **セキュリティ**: `OPENAI_API_KEY` は `NUXT_PUBLIC_` プレフィックスを持たないため、サーバーサイド（`server/api/`）のみで参照されます。ブラウザには一切公開されません。

---

## 2. DBスキーマの投入

### 手順

1. [Supabase Dashboard](https://supabase.com/dashboard) にログインする
2. 対象プロジェクトを選択し、左メニューの **SQL Editor** を開く
3. 下記 SQL を貼り付けて **Run** ボタンをクリックする

### SQL

```sql
-- diaries table (non-auth / fixed user_key)
create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  content text not null,
  ai_summary text,
  ai_emotion text,
  ai_next_action text,
  ai_tags text[],
  created_at timestamptz not null default now()
);

create index if not exists diaries_user_key_created_at_idx
  on public.diaries(user_key, created_at desc);
```

### テーブル仕様

| カラム名          | 型           | 備考                              |
|----------------|-------------|----------------------------------|
| id             | uuid        | Primary Key（自動生成）             |
| user_key       | text        | ユーザー識別子（ローカルは `'local'`）|
| content        | text        | 日記本文                           |
| ai_summary     | text        | AI生成サマリ（nullable）            |
| ai_emotion     | text        | AI感情分析結果（nullable）          |
| ai_next_action | text        | AI推奨アクション（nullable）         |
| ai_tags        | text[]      | AIタグ一覧（nullable）              |
| created_at     | timestamptz | 作成日時（自動設定）                 |

### インデックス

| インデックス名                      | カラム                      | 用途                         |
|-----------------------------------|---------------------------|------------------------------|
| diaries_user_key_created_at_idx   | (user_key, created_at DESC) | ユーザー別・新しい順の取得を高速化 |

---

## 3. 開発サーバーの起動

```bash
npm install
npm run dev
```

開発時は `http://localhost:3000` にアクセスすると、ページ下部に **「（開発用）Supabase疎通」** カードが表示されます。
「最新を取得」ボタンで DB 接続を確認できます。
