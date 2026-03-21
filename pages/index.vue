<script setup lang="ts">
import type { Database } from '#build/types/supabase-database'

type DiaryRow = Database['public']['Tables']['diaries']['Row']

const supabase = useSupabaseClient()
const route = useRoute()
const router = useRouter()

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
  asyncError.value ? '日記の読み込みに失敗しました。' : null,
)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function previewContent(content: string): string {
  return content.length > 120 ? content.substring(0, 120) + '…' : content
}

// ── 削除 ────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const showDeleteModal = ref(false)
const pendingDeleteId = ref<string | null>(null)
const deleteSuccess = ref(false)
let deleteSuccessTimer: ReturnType<typeof setTimeout> | undefined

// diaries.value を直接変更すると useAsyncData の内部状態を汚染し
// Nuxt dev サーバーが /__nuxt_island へ空ボディ POST を発火してしまう。
// そのため「削除済み ID セット」で楽観的非表示を表現する。
const deletedIds = ref<string[]>([])
const visibleDiaries = computed(() =>
  (diaries.value ?? []).filter(d => !deletedIds.value.includes(d.id))
)

function showSuccess() {
  clearTimeout(deleteSuccessTimer)
  deleteSuccess.value = true
  deleteSuccessTimer = setTimeout(() => { deleteSuccess.value = false }, 3000)
}

onMounted(() => {
  // 詳細ページからの削除後リダイレクト
  if (route.query.deleted === '1') {
    router.replace({ query: { ...route.query, deleted: undefined } })
    showSuccess()
  }
})

onBeforeUnmount(() => {
  clearTimeout(deleteSuccessTimer)
})

function requestDelete(id: string) {
  pendingDeleteId.value = id
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  pendingDeleteId.value = null
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  if (!id) return

  showDeleteModal.value = false
  pendingDeleteId.value = null
  deletingId.value = id
  deleteError.value = null

  // 楽観的削除（diaries.value 非破壊）
  deletedIds.value = [...deletedIds.value, id]

  const { error } = await supabase
    .from('diaries')
    .delete()
    .eq('id', id)
    .eq('user_key', 'local')

  if (error) {
    console.error('[delete] 削除エラー:', error)
    deletedIds.value = deletedIds.value.filter(i => i !== id)  // ロールバック
    deleteError.value = '削除に失敗しました。もう一度お試しください。'
  } else {
    showSuccess()
  }

  deletingId.value = null
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
  <div class="min-h-screen bg-white">
    <!-- 削除成功バナー -->
    <div
      v-if="deleteSuccess"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow-xl whitespace-nowrap"
    >
      ✅ 削除が完了しました
    </div>

    <!-- 削除確認モーダル -->
    <Teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center px-5"
      >
        <div class="absolute inset-0 bg-black/40" @click="cancelDelete"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm">
          <p class="text-base font-bold text-gray-900 mb-2">日記を削除しますか？</p>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">この操作は取り消せません。</p>
          <div class="flex gap-3">
            <button
              class="flex-1 py-3 rounded-2xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              @click="cancelDelete"
            >
              キャンセル
            </button>
            <button
              class="flex-1 py-3 rounded-2xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              @click="confirmDelete"
            >
              削除する
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- ヘッダーエリア：上部に薄いグラデ -->
    <div class="bg-gradient-to-b from-indigo-50/70 via-purple-50/20 to-white px-5 pt-14 pb-7">
      <div class="max-w-md mx-auto">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">AI日記</h1>
            <p class="mt-1 text-sm text-gray-400">あなたの毎日をAIが分析・サポート</p>
          </div>
          <NuxtLink
            to="/dashboard"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium bg-white border border-gray-100 shadow-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            📊 分析
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="max-w-md mx-auto px-5 pb-28">
      <!-- ローディング：スケルトン -->
      <div v-if="loading" class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-4 animate-pulse"
        >
          <div class="w-11 h-11 rounded-2xl bg-gray-100 flex-shrink-0"></div>
          <div class="flex-1">
            <div class="h-2.5 bg-gray-100 rounded-full w-24 mb-2"></div>
            <div class="h-3.5 bg-gray-100 rounded w-full mb-1.5"></div>
            <div class="h-3.5 bg-gray-100 rounded w-4/5 mb-2"></div>
            <div class="h-4 bg-gray-100 rounded-full w-16"></div>
          </div>
        </div>
      </div>

      <!-- エラー -->
      <div
        v-else-if="fetchError"
        class="bg-red-50 rounded-3xl p-8 text-center mt-2"
      >
        <p class="text-4xl mb-3">⚠️</p>
        <p class="text-red-600 text-sm font-semibold">読み込みに失敗しました</p>
        <p class="text-red-400 text-xs mt-1.5 leading-relaxed">{{ fetchError }}</p>
      </div>

      <!-- 空状態 -->
      <div
        v-else-if="visibleDiaries.length === 0"
        class="bg-white rounded-3xl border border-gray-100 shadow-sm p-14 text-center mt-2"
      >
        <p class="text-5xl mb-4">📔</p>
        <p class="text-gray-700 font-semibold text-sm">まだ日記がありません</p>
        <p class="text-gray-400 text-xs mt-2 leading-relaxed">
          右下の＋ボタンから<br>最初の日記を書いてみましょう
        </p>
      </div>

      <!-- 日記リスト -->
      <div v-else class="space-y-3">
        <!-- 削除エラー -->
        <div
          v-if="deleteError"
          class="bg-red-50 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium"
        >
          ⚠️ {{ deleteError }}
        </div>
        <div
          v-for="diary in visibleDiaries"
          :key="diary.id"
          role="link"
          tabindex="0"
          class="flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          @click="navigateTo(`/diary/${diary.id}`)"
          @keydown.enter="navigateTo(`/diary/${diary.id}`)"
        >
          <!-- 左アイコン -->
          <div class="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-xl">
            📝
          </div>

          <!-- 中央：日時・本文・バッジ -->
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-400 mb-0.5">{{ formatDate(diary.created_at) }}</p>
            <p class="text-sm text-gray-700 leading-snug line-clamp-2">{{ previewContent(diary.content) }}</p>
            <div class="mt-1.5">
              <span
                v-if="diary.ai_summary"
                class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600"
              >AI分析済み</span>
              <span
                v-else
                class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400"
              >未分析</span>
            </div>
          </div>

          <!-- 右：削除ボタン＋シェブロン -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              :disabled="deletingId === diary.id"
              class="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              @click.stop="requestDelete(diary.id)"
            >
              {{ deletingId === diary.id ? '削除中…' : '削除' }}
            </button>
            <span class="text-gray-300 text-2xl leading-none font-light">›</span>
          </div>
        </div>
      </div>

      <!-- （開発用）Supabase疎通確認：折りたたみ -->
      <details v-if="isDev" class="mt-12">
        <summary class="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-500 transition-colors">
          🛠 開発用：Supabase疎通確認
        </summary>
        <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-3xl p-5">
          <div class="flex gap-3 mb-4">
            <button
              :disabled="devLoading"
              class="px-4 py-2 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="fetchLatest"
            >
              {{ devLoading ? '取得中…' : '最新を取得' }}
            </button>
            <button
              :disabled="devLoading"
              class="px-4 py-2 text-sm font-medium rounded-xl bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="insertDummy"
            >
              {{ devLoading ? '追加中…' : 'ダミーを1件追加' }}
            </button>
          </div>

          <p v-if="devError" class="text-sm text-red-600 mb-3">
            ⚠️ {{ devError }}
          </p>

          <div v-if="devDiaries.length > 0" class="space-y-2">
            <p class="text-xs text-yellow-600 font-medium">取得結果（{{ devDiaries.length }}件）</p>
            <div
              v-for="row in devDiaries"
              :key="row.id"
              class="bg-white border border-yellow-100 rounded-xl p-3 text-xs font-mono text-gray-700 break-all"
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

    <!-- フローティング「＋」ボタン（FAB） -->
    <NuxtLink
      to="/new"
      class="fixed bottom-8 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white text-2xl font-light shadow-xl flex items-center justify-center transition-all duration-200 hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-2xl active:scale-95"
      aria-label="新しい日記を書く"
    >
      ＋
    </NuxtLink>
  </div>
</template>
