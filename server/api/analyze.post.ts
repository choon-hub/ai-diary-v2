import OpenAI from 'openai'

interface AnalyzeBody {
  content: string
}

interface AnalyzeResult {
  summary: string
  emotion: string
  nextAction: string
  tags: string[]
}

const SYSTEM_PROMPT =
  'あなたは日記分析アシスタントです。指示されたJSONフォーマットのみを返してください。説明文・マークダウン・コードブロックは一切不要です。'

function buildUserPrompt(content: string): string {
  return `以下の日記を分析し、下記JSONフォーマットのみで返してください。

日記:
${content}

返却するJSONフォーマット（このキーのみ、余分なテキスト不要）:
{
  "summary": "3行以内の要約",
  "emotion": "喜び/怒り/不安/落ち着き/疲れ などの1語",
  "nextAction": "次にやると良い具体的な1つのアクション",
  "tags": ["タグ1", "タグ2", "タグ3"]
}

ルール:
- すべて日本語
- 断定しすぎない表現を使う
- 医療・法律・投資の断定的な助言はしない
- 短く読みやすく
- tags は必ず3つ`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyzeBody>(event)

  // バリデーション
  if (!body?.content || body.content.trim().length < 10) {
    throw createError({
      statusCode: 400,
      statusMessage: '本文が短すぎます',
    })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI APIキーが設定されていません',
    })
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  const openai = new OpenAI({ apiKey })

  // 本文は先頭2000文字に制限（ログには出さない）
  const trimmedContent = body.content.trim().slice(0, 2000)

  let raw: string
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(trimmedContent) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7,
    })
    raw = completion.choices[0]?.message?.content ?? ''
  }
  catch (err) {
    console.error('[analyze] OpenAI API エラー:', err instanceof Error ? err.message : err)
    throw createError({
      statusCode: 502,
      statusMessage: 'AI分析に失敗しました',
    })
  }

  let result: AnalyzeResult
  try {
    result = JSON.parse(raw) as AnalyzeResult
  }
  catch {
    console.error('[analyze] JSONパース失敗（先頭200文字）:', raw.slice(0, 200))
    throw createError({
      statusCode: 502,
      statusMessage: 'AI応答の解析に失敗しました',
    })
  }

  // tags を必ず3つに補完
  if (!Array.isArray(result.tags)) {
    result.tags = []
  }
  while (result.tags.length < 3) {
    result.tags.push('その他')
  }
  result.tags = result.tags.slice(0, 3)

  return {
    summary: result.summary ?? '',
    emotion: result.emotion ?? '',
    nextAction: result.nextAction ?? '',
    tags: result.tags,
  } satisfies AnalyzeResult
})
