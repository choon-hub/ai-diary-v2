<script setup lang="ts">
import type { Database } from '#build/types/supabase-database'

type DiaryRow = Database['public']['Tables']['diaries']['Row']

const route = useRoute()
const id = route.params.id as string

const supabase = useSupabaseClient()

const { data: diary, pending: loading, error: asyncError } = useAsyncData(
  `diary-${id}`,
  async () => {
    const { data, error } = await supabase
      .from('diaries')
      .select('id, user_key, content, created_at, ai_summary, ai_emotion, ai_next_action, ai_tags')
      .eq('id', id)
      .eq('user_key', 'local')
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null  // not found
      console.error('[diary detail] 取得エラー:', error)
      throw error
    }
    return data as DiaryRow
  },
)

const fetchError = computed(() =>
  asyncError.value ? `取得に失敗しました: ${asyncError.value.message}` : null,
)

const notFound = computed(() => !loading.value && !asyncError.value && diary.value === null)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const handleAnalyze = () => {
  // TODO: AI分析処理は後で実装（OpenAI連携）
}

async function goHome() {
  await refreshNuxtData('diaries-list')
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
        <p v-if="diary" class="text-sm text-gray-400 mt-1">{{ formatDate(diary.created_at) }}</p>
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
        <p class="text-gray-400 text-sm mb-4">日記が見つかりませんでした。</p>
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
            <div v-if="diary.ai_emotion" class="bg-white rounded-2xl shadow border border-gray-100 p-5">
              <p class="text-xs font-semibold text-gray-500 mb-2">感情</p>
              <span class="inline-block px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700">
                {{ diary.ai_emotion }}
              </span>
            </div>

            <!-- 次のアクション -->
            <div v-if="diary.ai_next_action" class="bg-white rounded-2xl shadow border border-gray-100 p-5">
              <p class="text-xs font-semibold text-gray-500 mb-2">次のアクション</p>
              <p class="text-gray-700 text-sm leading-relaxed">{{ diary.ai_next_action }}</p>
            </div>

            <!-- タグ -->
            <div v-if="diary.ai_tags && diary.ai_tags.length > 0" class="bg-white rounded-2xl shadow border border-gray-100 p-5">
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
            <div class="flex justify-center">
              <button
                @click="handleAnalyze"
                class="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
              >
                <span>✨</span>
                AIで分析する
              </button>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
