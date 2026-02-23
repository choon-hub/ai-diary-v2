<script setup lang="ts">
import type { Database } from '#build/types/supabase-database'

const dummyDiaries = [
  {
    id: '1',
    date: '2026年2月23日',
    title: '今日はとても良い天気だった',
    preview: '朝から気持ちの良い日差しが降り注いで、久しぶりに近所を散歩した。桜の芽が少しずつ膨らんでいて、春の訪れを感じた。',
  },
  {
    id: '2',
    date: '2026年2月22日',
    title: '新しいプロジェクトを始めた',
    preview: 'チームで新しいWebアプリの開発を開始した。技術スタックの選定で少し議論があったが、最終的にNuxt 3を採用することになった。',
  },
  {
    id: '3',
    date: '2026年2月21日',
    title: '読書の時間',
    preview: '久しぶりに図書館に行って、気になっていた小説を借りてきた。帰りに近くのカフェで少し読んだら、すぐに引き込まれてしまった。',
  },
]

// ── 開発用 Supabase 疎通確認 ────────────────────────────────
const isDev = process.dev

type DiaryRow = Database['public']['Tables']['diaries']['Row']

const supabase = useSupabaseClient()
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

      <!-- 日記カード一覧 -->
      <div class="space-y-4">
        <NuxtLink
          v-for="diary in dummyDiaries"
          :key="diary.id"
          :to="`/diary/${diary.id}`"
          class="block bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-xs text-gray-400 mb-1">{{ diary.date }}</p>
              <h2 class="text-lg font-semibold text-gray-800 mb-2">{{ diary.title }}</h2>
              <p class="text-sm text-gray-500 line-clamp-2">{{ diary.preview }}</p>
            </div>
            <span class="ml-4 text-gray-300 text-2xl leading-none">›</span>
          </div>
        </NuxtLink>
      </div>

      <!-- （開発用）Supabase疎通確認カード -->
      <div
        v-if="isDev"
        class="mt-12 bg-yellow-50 border border-yellow-200 rounded-2xl p-6"
      >
        <h2 class="text-sm font-bold text-yellow-700 mb-4">
          🛠 （開発用）Supabase疎通
        </h2>

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
            {{ devLoading ? '取得中…' : 'ダミーを1件追加' }}
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
