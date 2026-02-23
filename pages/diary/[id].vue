<script setup lang="ts">
import type { Database } from '~/types/database.types'

type DiaryRow = Database['public']['Tables']['diaries']['Row']

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const supabase = useSupabaseClient()

const { data: diary, pending: loading, error: asyncError } = useAsyncData(
  () => `diary-${id.value}`,
  async () => {
    const { data, error } = await supabase
      .from('diaries')
      .select('id, user_key, content, created_at, ai_summary, ai_emotion, ai_next_action, ai_tags')
      .eq('id', id.value)
      .eq('user_key', 'local')
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null  // not found
      console.error('[diary detail] 取得エラー:', error)
      throw error
    }
    if (!data) return null
    return data as DiaryRow
  },
)

const fetchError = computed(() =>
  asyncError.value ? '日記の読み込みに失敗しました。' : null,
)

const notFound = computed(() => !loading.value && !asyncError.value && diary.value === null)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── 成功バナー ──────────────────────────────────────────────
const savedBanner = ref(false)
const analyzedBanner = ref(false)

let savedTimerId: ReturnType<typeof setTimeout> | undefined
let analyzedTimerId: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (route.query.created === '1') {
    savedBanner.value = true
    const { created: _created, ...rest } = route.query
    router.replace({ query: rest })
    savedTimerId = setTimeout(() => { savedBanner.value = false }, 3000)
  }
})

onBeforeUnmount(() => {
  clearTimeout(savedTimerId)
  clearTimeout(analyzedTimerId)
})

const analyzing = ref(false)
const analyzeError = ref<string | null>(null)

async function handleAnalyze() {
  if (!diary.value) return
  analyzing.value = true
  analyzeError.value = null

  try {
    const result = await $fetch<{
      summary: string
      emotion: string
      nextAction: string
      tags: string[]
    }>('/api/analyze', {
      method: 'POST',
      body: { content: String(diary.value.content) },
    })

    // 最小バリデーション
    if (
      typeof result.summary !== 'string' ||
      typeof result.emotion !== 'string' ||
      typeof result.nextAction !== 'string' ||
      !Array.isArray(result.tags)
    ) {
      throw new Error('AI応答の形式が不正です')
    }

    // tags を3つに補完（サーバ側で揃えているが念のため）
    const FALLBACK_TAGS = ['その他', '日常', 'メモ']
    const tags = [...(result.tags as string[])]
    for (const fb of FALLBACK_TAGS) {
      if (tags.length >= 3) break
      if (!tags.includes(fb)) tags.push(fb)
    }

    // Supabase update
    const { data, error } = await supabase
      .from('diaries')
      .update({
        ai_summary: result.summary,
        ai_emotion: result.emotion,
        ai_next_action: result.nextAction,
        ai_tags: tags.slice(0, 3),
      })
      .eq('id', diary.value.id)
      .eq('user_key', 'local')
      .select('id, user_key, content, created_at, ai_summary, ai_emotion, ai_next_action, ai_tags')
      .single()

    if (error) throw new Error(error.message)
    if (data) diary.value = data as DiaryRow

    // 分析成功バナー
    analyzedBanner.value = true
    analyzedTimerId = setTimeout(() => { analyzedBanner.value = false }, 3000)
  }
  catch (err) {
    const serverMsg = (err as { data?: { statusMessage?: string } }).data?.statusMessage
    const baseMsg = err instanceof Error ? err.message : String(err)
    console.error('[analyze] 詳細:', baseMsg)
    analyzeError.value = serverMsg
      ? `AI分析に失敗しました: ${serverMsg}`
      : 'AI分析に失敗しました。しばらくしてから再試行してください。'
  }
  finally {
    analyzing.value = false
  }
}

async function goHome() {
  await refreshNuxtData('diaries-list')
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 成功バナー：保存 -->
    <div
      v-if="savedBanner"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow-xl whitespace-nowrap"
    >
      ✅ 保存しました
    </div>

    <!-- 成功バナー：AI分析 -->
    <div
      v-if="analyzedBanner"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow-xl whitespace-nowrap"
    >
      ✨ AI分析が完了しました
    </div>

    <!-- ヘッダー -->
    <div class="bg-gradient-to-b from-indigo-50/70 via-purple-50/20 to-white px-5 pt-14 pb-7">
      <div class="max-w-md mx-auto">
        <button
          class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors mb-5"
          @click="goHome"
        >
          ← 一覧へ
        </button>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">日記</h1>
        <p v-if="diary" class="mt-1 text-sm text-gray-400">{{ formatDate(diary.created_at) }}</p>
      </div>
    </div>

    <div class="max-w-md mx-auto px-5 pb-12">
      <!-- ローディング：スケルトン -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 animate-pulse">
          <div class="h-2.5 bg-gray-100 rounded-full w-16 mb-4"></div>
          <div class="h-3.5 bg-gray-100 rounded w-full mb-2"></div>
          <div class="h-3.5 bg-gray-100 rounded w-5/6 mb-2"></div>
          <div class="h-3.5 bg-gray-100 rounded w-4/6"></div>
        </div>
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 animate-pulse">
          <div class="h-2.5 bg-gray-100 rounded-full w-20 mb-4"></div>
          <div class="h-3.5 bg-gray-100 rounded w-full mb-2"></div>
          <div class="h-3.5 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>

      <!-- エラー -->
      <div
        v-else-if="fetchError"
        class="bg-red-50 rounded-3xl p-8 text-center"
      >
        <p class="text-4xl mb-3">⚠️</p>
        <p class="text-red-600 text-sm font-semibold">読み込みに失敗しました</p>
        <p class="text-red-400 text-xs mt-1.5 leading-relaxed">{{ fetchError }}</p>
      </div>

      <!-- 見つからない -->
      <div
        v-else-if="notFound"
        class="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center"
      >
        <p class="text-5xl mb-4">🔍</p>
        <p class="text-gray-700 font-semibold text-sm">日記が見つかりませんでした</p>
        <p class="text-gray-400 text-xs mt-2 mb-6 leading-relaxed">削除されたか、URLが誤っている可能性があります</p>
        <button
          class="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          @click="goHome"
        >
          ← 一覧に戻る
        </button>
      </div>

      <!-- 本文・AI結果 -->
      <template v-else-if="diary">
        <!-- 本文カード -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">本文</p>
          <p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{{ diary.content }}</p>
        </div>

        <!-- AI分析済みセクション -->
        <template v-if="diary.ai_summary">
          <div class="space-y-3">
            <!-- AI要約 -->
            <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100/60 p-5">
              <p class="text-xs font-semibold text-indigo-500 mb-3 flex items-center gap-1.5">
                <span>✨</span> AI要約
              </p>
              <p class="text-gray-700 text-sm leading-relaxed">{{ diary.ai_summary }}</p>
            </div>

            <!-- 感情 -->
            <div v-if="diary.ai_emotion" class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p class="text-xs font-semibold text-gray-400 mb-3">感情</p>
              <span class="inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-pink-100 text-pink-600">
                {{ diary.ai_emotion }}
              </span>
            </div>

            <!-- 次のアクション -->
            <div v-if="diary.ai_next_action" class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p class="text-xs font-semibold text-gray-400 mb-3">次のアクション</p>
              <p class="text-gray-700 text-sm leading-relaxed">{{ diary.ai_next_action }}</p>
            </div>

            <!-- タグ -->
            <div v-if="diary.ai_tags && diary.ai_tags.length > 0" class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p class="text-xs font-semibold text-gray-400 mb-3">タグ</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in diary.ai_tags"
                  :key="tag"
                  class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- 未分析セクション -->
        <template v-else>
          <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div class="text-center py-4 mb-4">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400 mb-4">未分析</span>
              <p class="text-gray-600 text-sm font-medium mb-1">まだAI分析が行われていません</p>
              <p class="text-xs text-gray-400 leading-relaxed">分析するとAIが要約・感情・次のアクションを提案します</p>
            </div>

            <!-- AI分析エラー表示 -->
            <div
              v-if="analyzeError"
              class="mb-4 bg-red-50 rounded-2xl px-4 py-3 text-xs text-red-600 font-medium"
            >
              ⚠️ {{ analyzeError }}
            </div>

            <!-- AI分析ボタン -->
            <button
              :disabled="analyzing"
              class="w-full py-4 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-md transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="handleAnalyze"
            >
              <span>✨</span>
              {{ analyzing ? '分析中…' : 'AIで分析する' }}
            </button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
