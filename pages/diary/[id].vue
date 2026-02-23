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

onMounted(() => {
  if (route.query.created === '1') {
    savedBanner.value = true
    router.replace({ query: {} })
    setTimeout(() => { savedBanner.value = false }, 3000)
  }
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
    // 重複を避けながら不足分を ['その他','日常','メモ'] の順で補完する
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
    setTimeout(() => { analyzedBanner.value = false }, 3000)
  }
  catch (err) {
    // ofetch の FetchError は data.statusMessage にサーバ側メッセージが入る
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
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <!-- 成功バナー：保存 -->
    <div
      v-if="savedBanner"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white text-sm font-medium px-5 py-2 rounded-full shadow-lg whitespace-nowrap"
    >
      ✅ 保存しました
    </div>

    <!-- 成功バナー：AI分析 -->
    <div
      v-if="analyzedBanner"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-500 text-white text-sm font-medium px-5 py-2 rounded-full shadow-lg whitespace-nowrap"
    >
      ✨ AI分析が完了しました
    </div>

    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- ヘッダー -->
      <div class="mb-8">
        <button
          class="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 transition-colors mb-6"
          @click="goHome"
        >
          ← 一覧に戻る
        </button>
        <h1 class="text-3xl font-bold text-gray-800">日記詳細</h1>
        <p v-if="diary" class="text-sm text-gray-500 mt-1">{{ formatDate(diary.created_at) }}</p>
      </div>

      <!-- ローディング：スケルトン -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white rounded-2xl shadow border border-gray-100 p-6 animate-pulse">
          <div class="h-3 bg-gray-200 rounded w-32 mb-4"></div>
          <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <div class="bg-white rounded-2xl shadow border border-gray-100 p-6 animate-pulse">
          <div class="h-3 bg-gray-200 rounded w-20 mb-4"></div>
          <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>

      <!-- エラー -->
      <div
        v-else-if="fetchError"
        class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm"
      >
        ⚠️ {{ fetchError }}
      </div>

      <!-- 見つからない -->
      <div
        v-else-if="notFound"
        class="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center"
      >
        <p class="text-4xl mb-4">🔍</p>
        <p class="text-gray-400 text-sm mb-6">この日記は見つかりませんでした。</p>
        <button
          class="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 transition-colors"
          @click="goHome"
        >
          ← 一覧に戻る
        </button>
      </div>

      <!-- 本文・AI結果 -->
      <template v-else-if="diary">
        <!-- 本文カード -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <p class="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wide">本文</p>
          <p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{{ diary.content }}</p>
        </div>

        <!-- AI分析済みセクション -->
        <template v-if="diary.ai_summary">
          <div class="space-y-4">
            <!-- AI要約 -->
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6">
              <p class="text-xs font-semibold text-blue-600 mb-3 flex items-center gap-1">
                <span>✨</span> AI要約
              </p>
              <p class="text-gray-700 text-sm leading-relaxed">{{ diary.ai_summary }}</p>
            </div>

            <!-- 感情 -->
            <div v-if="diary.ai_emotion" class="bg-white rounded-2xl shadow border border-gray-100 p-6">
              <p class="text-xs font-semibold text-gray-500 mb-2">感情</p>
              <span class="inline-block px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700">
                {{ diary.ai_emotion }}
              </span>
            </div>

            <!-- 次のアクション -->
            <div v-if="diary.ai_next_action" class="bg-white rounded-2xl shadow border border-gray-100 p-6">
              <p class="text-xs font-semibold text-gray-500 mb-2">次のアクション</p>
              <p class="text-gray-700 text-sm leading-relaxed">{{ diary.ai_next_action }}</p>
            </div>

            <!-- タグ -->
            <div v-if="diary.ai_tags && diary.ai_tags.length > 0" class="bg-white rounded-2xl shadow border border-gray-100 p-6">
              <p class="text-xs font-semibold text-gray-500 mb-3">タグ</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in diary.ai_tags"
                  :key="tag"
                  class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- 未分析セクション -->
        <template v-else>
          <div class="bg-white rounded-2xl shadow border border-gray-100 p-6">
            <div class="text-center py-4">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 mb-4">未分析</span>
              <p class="text-gray-400 text-sm mb-1">まだAI分析が行われていません</p>
              <p class="text-xs text-gray-300 mb-6">分析するとAIが要約・感情・次のアクションを提案します</p>
            </div>

            <!-- AI分析エラー表示 -->
            <div
              v-if="analyzeError"
              class="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"
            >
              ⚠️ {{ analyzeError }}
            </div>

            <div class="flex justify-center">
              <button
                :disabled="analyzing"
                @click="handleAnalyze"
                class="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
              >
                <span>✨</span>
                {{ analyzing ? '分析中…' : 'AIで分析する' }}
              </button>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
