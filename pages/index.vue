<script setup lang="ts">
import type { Database } from '#build/types/supabase-database'

type DiaryRow = Database['public']['Tables']['diaries']['Row']

const supabase = useSupabaseClient()

// ── メイン：日記一覧取得（最新10件）────────────────────────────
const { data: diaries, pending: loading, error: asyncError } = useAsyncData(
  'diaries-list',
  async () => {
    const { data, error } = await supabase
      .from('diaries')
      .select('id, content, created_at, ai_summary, ai_emotion, ai_next_action, ai_tags')
      .eq('user_key', 'local')
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) {
      console.error('[diaries] 取得エラー:', error)
      throw error
    }
    return (data as DiaryRow[]) ?? []
  },
)

const fetchError = computed(() =>
  asyncError.value ? `取得に失敗しました: ${asyncError.value.message}` : null,
)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function previewContent(content: string): string {
  return content.length > 120 ? content.substring(0, 120) + '…' : content
}

// ── 開発用 Supabase 疎通確認 ────────────────────────────────
const isDev = process.dev

const devDiaries = ref<DiaryRow[]>([])
const devLoading = ref(false)
const devError = ref<string | null>(null)

async function fetchLatest() {
  devLoading.value = true
  devError.value = null
  const { data, error } = await supabase
    .from('diaries')
    .select('id, user_key, content, created_at')
    .eq('user_key', 'local')
    .order('created_at', { ascending: false })
    .limit(3)
  devLoading.value = false
  if (error) {
    devError.value = `取得に失敗しました: ${error.message}`
    console.error('[Supabase疎通] 取得エラー:', error)
    return
  }
  devDiaries.value = (data as DiaryRow[]) ?? []
}

async function insertDummy() {
  devLoading.value = true
  devError.value = null
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const { error } = await supabase.from('diaries').insert({
    user_key: 'local',
    content: `疎通テスト: ${now}`,
  })
  if (error) {
    devLoading.value = false
    devError.value = `追加に失敗しました: ${error.message}`
    console.error('[Supabase疎通] 追加エラー:', error)
    return
  }
  await fetchLatest()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- ヘッダー -->
      <div class="mb-10 text-center">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI日記
        </h1>
        <p class="mt-2 text-gray-500 text-sm">あなたの毎日をAIが分析・サポート</p>
      </div>

      <!-- ローディング：スケルトン -->
      <div v-if="loading" class="space-y-4">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-white rounded-2xl shadow border border-gray-100 p-6 animate-pulse"
        >
          <div class="h-3 bg-gray-200 rounded w-32 mb-3"></div>
          <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
          <div class="h-5 bg-gray-100 rounded-full w-20"></div>
        </div>
      </div>

      <!-- エラー -->
      <div
        v-else-if="fetchError"
        class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm"
      >
        ⚠️ {{ fetchError }}
      </div>

      <!-- 空状態 -->
      <div
        v-else-if="!diaries || diaries.length === 0"
        class="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center"
      >
        <p class="text-gray-400 text-sm leading-relaxed">
          まだ日記がありません。<br>右下の＋から作成してください。
        </p>
      </div>

      <!-- 日記カード一覧 -->
      <div v-else class="space-y-4">
        <NuxtLink
          v-for="diary in diaries"
          :key="diary.id"
          :to="`/diary/${diary.id}`"
          class="block bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-xs text-gray-400 mb-2">{{ formatDate(diary.created_at) }}</p>
              <p class="text-sm text-gray-700 leading-relaxed mb-3">{{ previewContent(diary.content) }}</p>
              <span
                v-if="diary.ai_summary"
                class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
              >AI分析済み</span>
              <span
                v-else
                class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400"
              >未分析</span>
            </div>
            <span class="ml-4 text-gray-300 text-2xl leading-none flex-shrink-0">›</span>
          </div>
        </NuxtLink>
      </div>

      <!-- （開発用）Supabase疎通確認：折りたたみ -->
      <details v-if="isDev" class="mt-12">
        <summary class="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-500 transition-colors">
          🛠 開発用：Supabase疎通確認
        </summary>
        <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <!-- ボタン群 -->
          <div class="flex gap-3 mb-4">
            <button
              :disabled="devLoading"
              class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="fetchLatest"
            >
              {{ devLoading ? '取得中…' : '最新を取得' }}
            </button>
            <button
              :disabled="devLoading"
              class="px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="insertDummy"
            >
              {{ devLoading ? '追加中…' : 'ダミーを1件追加' }}
            </button>
          </div>

          <!-- エラー表示 -->
          <p v-if="devError" class="text-sm text-red-600 mb-3">
            ⚠️ {{ devError }}
          </p>

          <!-- 取得結果 -->
          <div v-if="devDiaries.length > 0" class="space-y-2">
            <p class="text-xs text-yellow-600 font-medium">取得結果（{{ devDiaries.length }}件）</p>
            <div
              v-for="row in devDiaries"
              :key="row.id"
              class="bg-white border border-yellow-100 rounded-lg p-3 text-xs font-mono text-gray-700 break-all"
            >
              <span class="text-gray-400">{{ row.created_at.substring(0, 19).replace('T', ' ') }}</span>
              &nbsp;{{ row.content }}
            </div>
          </div>
          <p v-else-if="!devLoading && devError === null" class="text-xs text-gray-400">
            まだ取得していません。ボタンを押して疎通を確認してください。
          </p>
        </div>
      </details>
    </div>

    <!-- フローティング「＋」ボタン -->
    <NuxtLink
      to="/new"
      class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-light shadow-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      aria-label="新しい日記を書く"
    >
      ＋
    </NuxtLink>
  </div>
</template>
