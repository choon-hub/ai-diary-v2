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

### 環境変数の役割

| キー名 | 用途 | 公開範囲 |
|--------|------|----------|
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | クライアント・サーバー共用 |
| `NUXT_PUBLIC_SUPABASE_KEY` | Supabase anon キー | クライアント・サーバー共用 |
| `OPENAI_API_KEY` | OpenAI API キー | **サーバーサイドのみ** |
| `OPENAI_MODEL` | 使用モデル（省略可） | サーバーサイドのみ |

### Supabase キーの取得手順

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト選択
2. **Settings → API** を開く
3. **Project URL** を `NUXT_PUBLIC_SUPABASE_URL` に設定する
4. **Project API keys → anon public** の値を `NUXT_PUBLIC_SUPABASE_KEY` に設定する

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

### RLS（Row Level Security）の注意

Supabase は新規プロジェクトで RLS が**有効**になっている場合があります。RLS が有効かつポリシー未設定の場合、anon キーでは読み書きができません。

以下のいずれかを選択してください：

**方法 A: RLS を無効化する（開発用・推奨）**

SQL Editor で実行：
```sql
alter table public.diaries disable row level security;
```

**方法 B: anon キー向けポリシーを追加する**

SQL Editor で実行：
```sql
-- 全件読み取りを許可
create policy "allow anon select" on public.diaries
  for select using (true);

-- 全件書き込みを許可
create policy "allow anon insert" on public.diaries
  for insert with check (true);

-- 全件更新を許可
create policy "allow anon update" on public.diaries
  for update using (true);
```

> **確認方法**: Dashboard → Table Editor → `diaries` テーブルを開いてデータが見えていれば OK。見えない場合は RLS の設定を疑ってください。

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

---

## 4. 動作確認

### 4-1. 日記の保存と詳細表示

1. `http://localhost:3000/new` にアクセスする
2. 任意のテキストを入力して **「保存する」** ボタンをクリックする
3. 詳細ページ（`/diary/<uuid>`）にリダイレクトされ、画面上部に「✅ 保存しました」バナーが表示されることを確認する
4. Supabase Dashboard → Table Editor → `diaries` テーブルにレコードが追加されていることを確認する

### 4-2. AI分析

1. 詳細ページ（`/diary/<uuid>`）で **「AIで分析する」** ボタンをクリックする
2. 「分析中…」スピナーが表示された後、「✨ AI分析が完了しました」バナーが表示されることを確認する
3. 要約・感情・次のアクション・タグ（3つ）が表示されることを確認する
4. Supabase Dashboard でレコードの `ai_summary` 等が更新されていることを確認する

### 4-3. API 単体確認（curl）

開発サーバー起動中に以下を実行して、契約 JSON が返ることを確認する：

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "今日はとても良い一日でした。"}' | jq .
```

期待するレスポンス（例）：

```json
{
  "summary": "今日は充実した一日だったようです。",
  "emotion": "喜び",
  "nextAction": "明日も小さな目標を立ててみる",
  "tags": ["日常", "ポジティブ", "振り返り"]
}
```

> `tags` は必ず 3 要素の配列で返ります。キーが不足している場合はデフォルト値（`その他` 等）で補完されます。

### 4-4. エラー系の確認

空本文を送ると 400 が返ることを確認：

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": ""}' | jq .
```

期待するレスポンス：

```json
{
  "statusCode": 400,
  "statusMessage": "本文が入力されていません"
}
```
