---
name: web-app-feature-pr
description: Implement web application features strictly from user-provided requirements and create a draft pull request with GitHub CLI. Use this skill whenever the user asks to build features from requirements, bullet points, or user stories, or asks for implementation plus commit/PR workflow with scope control.
---

# Web App Feature Implementation & PR Creation

## Goal
ユーザーから入力された要件に基づいて、スコープ逸脱なく実装し、検証後にコミットとドラフトPR作成まで一貫して実施する。

## Mandatory Flow

### 1) Requirements Input
要件を受け取る。形式は問わない（自由記述・箇条書き・ユーザーストーリー）。

### 2) Requirements Confirmation (Must ask before implementation)
実装前に、必ず以下テンプレートで確認する。

```markdown
## 要件確認

### 実装する機能
[要件を箇条書きで整理して記載]

### 実装スコープ（実装すること）
- [具体的な実装内容]

### 対象外スコープ（実装しないこと）
- [要件に含まれない関連機能など]

### 不明点・確認事項
- [あれば記載]

上記の内容で実装を進めてよろしいですか？
```

ユーザーの明示承認があるまで実装しない。

### 3) Preflight Checks
実装開始前に以下を確認する。
- `git status --short` で未コミット変更がある場合、進め方をユーザーに確認する
- 現在ブランチが `main` / `master` / `develop` の場合、新規ブランチ `feature/<short-description>` または `feat/<short-description>` を作成する
- `gh` 未認証なら `gh auth login` を案内して停止する

### 4) Implementation
- 確認済みスコープのみ実装する
- 要件外の改善・リファクタ・追加機能を入れない
- 既存の命名・構成・コーディング規約に従う
- 途中で曖昧さが出たら実装を止めてユーザーに確認する

### 5) Self-Verification Before Commit
コミット前に必ず以下を埋めて確認する。

```markdown
## 実装確認チェックリスト

### 要件との照合
- [ ] [要件1]: [実装内容の説明]
- [ ] [要件2]: [実装内容の説明]

### 品質チェック
- [ ] 既存の動作を壊していないか
- [ ] コードの構文エラーがないか
- [ ] 要件外の変更が含まれていないか

### 確認結果
✅ すべての要件を満たしています / ⚠️ 以下の点が未対応です: [詳細]
```

未対応がある場合は修正してから次へ進む。

### 6) Commit
- 関連ファイルのみ `git add <file>` でステージする（`git add .` は原則避ける）
- コミットメッセージは次の形式に従う

```text
<type>: <summary in English or Japanese>

- <detail 1>
- <detail 2>

Refs: <requirement summary if applicable>
```

`type` は `feat | fix | refactor | style | test | docs | chore`

### 7) Draft PR Creation via GitHub CLI
以下コマンド形式でドラフトPRを作成する。

```bash
gh pr create \
  --title "<type>: <summary>" \
  --body "$(cat <<'EOF'
## 概要
[実装した機能の概要]

## 実装内容
- [変更点1]
- [変更点2]

## 確認方法
[動作確認の手順をステップ形式で記載]

## チェックリスト
- [ ] 要件通りに実装されている
- [ ] 既存機能への影響がない
- [ ] レビュアーが動作確認できる手順が記載されている
EOF
)" \
  --base develop \
  --draft
```

`--draft` はデフォルトで付与。外す場合は事前にユーザー確認する。
PR作成後、URLを必ずユーザーへ共有する。

## Non-Negotiable Constraints
1. No scope creep: 承認済み要件以外は実装しない
2. No commit without verification: チェックリスト実施前にコミットしない
3. No assumptions on ambiguity: 曖昧要件は必ず確認する
4. Minimal blast radius: 関連しないファイルを変更しない

## Response Behavior
- 依頼が実装であれば、確認テンプレート提示から開始する
- 要件が不足していれば不足点だけを簡潔に質問する
- 各フェーズ完了時に短く進捗報告する
- PR作成後はPR URLと確認方法を提示する

## Examples

以下のような依頼でこのSkillが起動する。

- "この要件リストをもとにログイン機能を実装してドラフトPRを作って"
- "ユーザーストーリーから検索フィルタを実装してコミット＆PRまでやって"
- "以下の箇条書き要件でプロフィール編集機能を実装して"
- "タスク一覧の要件: [箇条書き] → 実装してPRまで一気にやって"
