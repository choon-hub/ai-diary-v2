---
name: code-review
description: Perform a structured code review for a given GitHub PR URL using GitHub CLI. Use this skill whenever the user provides a PR URL and asks for a code review, review of changes, or diff analysis.
---

# Code Review Skill

## Goal
GitHub PR URLを受け取り、GitHub CLIでPR情報を取得し、スコープ・不具合リスク・ロジック・保守性・テストの観点から構造化されたコードレビューを出力する。

## Mandatory Flow

### 1) PR URL の受け取り

以下の形式でPR URLを受け取る。

```
https://github.com/<owner>/<repo>/pull/<number>
```

`<owner>`、`<repo>`、`<number>` を抽出して以降のコマンドで使用する。

### 2) 前提確認

`gh` CLIが認証済みか確認する。

```bash
gh auth status
```

未認証の場合は `gh auth login` を案内して停止する。

### 3) PR 情報の取得

以下のコマンドを実行してレビューに必要な情報を収集する。

```bash
# PR概要（タイトル・説明・ブランチ）
gh pr view <number> --repo <owner>/<repo>

# 全差分
gh pr diff <number> --repo <owner>/<repo>

# 変更ファイル一覧
gh pr view <number> --repo <owner>/<repo> --json files

# PRメタデータ
gh pr view <number> --repo <owner>/<repo> --json title,body,author,labels,assignees,requestedReviewers,additions,deletions,changedFiles
```

### 4) コードレビューの実施

取得した情報をもとに以下の観点でレビューする。

#### 4-1. スコープ準拠
- PR説明に記載のない変更が含まれていないか
- 要件と無関係なファイルへの変更がないか
- 未依頼のリファクタ・スタイル変更・追加機能が含まれていないか

#### 4-2. 不具合リスク
- null / undefined 参照によるランタイムエラーの可能性
- ループや配列アクセスでのオフバイワンエラー
- エラーハンドリングの欠落・未捕捉例外
- 非同期処理の誤用（race condition、async/await の不適切な使用）
- 条件分岐の誤り（`=` vs `===`、論理の反転など）
- 設定値にすべきハードコード値
- セキュリティ上の懸念（未サニタイズ入力、シークレットの漏洩など）

#### 4-3. ロジックの正確性
- PRの意図を正しく実装しているか
- エッジケースの考慮（空配列、ゼロ値、境界条件）
- 型の扱い（型強制、暗黙の変換）

#### 4-4. 保守性
- 部分更新で不整合が生じうる重複コードブロック
- 単一責任原則に反する肥大化した関数・コンポーネント
- 変数・関数名の明確さと既存コードベースとの一貫性

#### 4-5. テストカバレッジ
- リポジトリにテストが存在する場合、変更ロジックに対するテストが追加・更新されているか
- 明らかにテストすべきケースが未カバーでないか

### 5) レビュー結果の出力

以下のテンプレートで必ず出力する。問題がない項目は「該当なし」と記載する。

---

```
## コードレビュー結果

**PR:** <PR title>
**URL:** <PR URL>
**レビュー日時:** <YYYY-MM-DD HH:MM>
**変更規模:** +<additions> / -<deletions> （<changedFiles> files）

---

### 総合判定
✅ 問題なし / ⚠️ 軽微な指摘あり / ❌ 要修正あり

---

### 指摘事項

#### ❌ 要修正（Must Fix）
<!-- 不具合・スコープ逸脱など、マージ前に必ず対応が必要なもの -->

| # | ファイル | 行 | 内容 |
|---|---|---|---|
| 1 | `path/to/file.ts` | L42 | [問題の説明と修正方針] |

該当なし <!-- 問題がない場合 -->

---

#### ⚠️ 推奨改善（Should Fix）
<!-- バグではないが、保守性・可読性の観点から改善を推奨するもの -->

| # | ファイル | 行 | 内容 |
|---|---|---|---|
| 1 | `path/to/file.ts` | L88 | [改善提案の説明] |

該当なし <!-- 問題がない場合 -->

---

#### 💡 提案（Nice to Have）
<!-- 任意対応。将来的に検討する価値があるもの -->

- [提案内容]

該当なし <!-- 提案がない場合 -->

---

### スコープ確認
- [ ] PR説明に記載のない実装が含まれていないか → ✅ 問題なし / ❌ 要確認: [詳細]
- [ ] 無関係なファイルへの変更がないか       → ✅ 問題なし / ❌ 要確認: [詳細]

---

### 総評
[全体を通じた所感を2〜4文で記載。良い点があれば合わせて言及する。]
```

---

## Non-Negotiable Constraints
1. 取得したPR差分と説明のみを根拠にする。記載外の意図を推測しない。
2. PR説明が空または曖昧でスコープ判定できない場合は **❌ 要修正** として「PR説明が不足しており、スコープ判定ができません。」を記載する。
3. PR スコープ外のコードベース改善を提案しない。
4. `gh` CLIが未認証の場合は `gh auth login` を案内して停止する。

## Response Behavior
- PR URLを受け取ったらすぐに情報収集を開始し、ユーザーへの確認なしにレビューを進める
- 出力は必ず上記テンプレートの形式を使用する
- 指摘がない場合も必ず「該当なし」を明記する（省略不可）

## Examples

以下のような依頼でこのSkillが起動する。

- "このPRをレビューして: https://github.com/owner/repo/pull/42"
- "https://github.com/owner/repo/pull/100 の差分を確認して問題点を教えて"
- "このプルリクのコードレビューをお願いします: https://github.com/org/project/pull/55"
- "PR #88 の変更内容を分析して"
