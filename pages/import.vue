<script setup lang="ts">
type ParsedEntry = {
  date: string | null   // ISO string or null = use now
  content: string
  error: string | null
}

const FILE_FORMAT_EXAMPLE = `date: 2024-01-15
今日は良い一日でした。

===

date: 2024-01-16 09:30
今日は雨が降りました。

===

日付なしのエントリ（現在日時で登録）`

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const parseError = ref<string | null>(null)
const parsedEntries = ref<ParsedEntry[]>([])
const showConfirm = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

const supabase = useSupabaseClient()

// ── パース ──────────────────────────────────────────────────
const DATE_PATTERN = /^date:\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*$/i

function parseFile(text: string): ParsedEntry[] {
  const rawEntries = text.split(/\n?={3,}\n?/)
  return rawEntries
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => {
      const lines = block.split('\n')
      let date: string | null = null
      let contentStart = 0

      const firstLine = lines[0]?.trim() ?? ''
      const dateMatch = firstLine.match(DATE_PATTERN)
      if (dateMatch) {
        const raw = dateMatch[1].trim()
        const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw.replace(' ', 'T'))
        if (isNaN(parsed.getTime())) {
          return { date: null, content: block, error: `無効な日付: "${raw}"` }
        }
        date = parsed.toISOString()
        contentStart = 1
      }

      const content = lines.slice(contentStart).join('\n').trim()
      if (!content) {
        return { date, content: '', error: '本文が空です' }
      }

      return { date, content, error: null }
    })
}

// ── ファイル読み込み ─────────────────────────────────────────
function readFile(file: File) {
  if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
    parseError.value = '.txt ファイルのみ対応しています'
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text?.trim()) {
      parseError.value = 'ファイルが空です'
      return
    }

    const entries = parseFile(text)
    if (entries.length === 0) {
      parseError.value = '有効なエントリが見つかりませんでした'
      return
    }

    parseError.value = null
    parsedEntries.value = entries
    showConfirm.value = true
  }
  reader.onerror = () => {
    parseError.value = 'ファイルの読み込みに失敗しました'
  }
  reader.readAsText(file, 'UTF-8')
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) readFile(file)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

function cancelImport() {
  showConfirm.value = false
  parsedEntries.value = []
  saveError.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// ── 保存 ─────────────────────────────────────────────────────
async function confirmImport() {
  const validEntries = parsedEntries.value.filter(e => !e.error && e.content)
  if (validEntries.length === 0) return

  saving.value = true
  saveError.value = null

  const rows = validEntries.map(e => ({
    user_key: 'local' as const,
    content: e.content,
    ...(e.date ? { created_at: e.date } : {}),
  }))

  const { error } = await supabase.from('diaries').insert(rows)

  if (error) {
    saving.value = false
    console.error('[import] 保存エラー:', error)
    saveError.value = '保存に失敗しました。しばらくしてから再試行してください。'
    return
  }

  await navigateTo('/?imported=1')
}

// ── フォーマット表示 ─────────────────────────────────────────
const showFormat = ref(false)

function formatPreviewDate(iso: string | null): string {
  if (!iso) return '現在日時'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- ヘッダー -->
    <div class="bg-gradient-to-b from-indigo-50/70 via-purple-50/20 to-white px-5 pt-14 pb-7">
      <div class="max-w-md mx-auto">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors mb-5"
        >
          ← 一覧へ
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">テキストファイルを読み込む</h1>
        <p class="mt-1 text-sm text-gray-400">.txt ファイルから日記を一括インポート</p>
      </div>
    </div>

    <div class="flex-1 max-w-md mx-auto w-full px-5 pb-36">
      <!-- フォーマット説明 -->
      <div class="mb-5">
        <button
          class="text-xs text-indigo-500 font-medium hover:text-indigo-700 transition-colors flex items-center gap-1"
          @click="showFormat = !showFormat"
        >
          {{ showFormat ? '▲' : '▼' }} ファイルフォーマットを確認する
        </button>
        <div v-if="showFormat" class="mt-3 bg-gray-50 rounded-2xl p-4">
          <p class="text-xs text-gray-500 mb-2 font-medium">フォーマット例</p>
          <pre class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-mono">{{ FILE_FORMAT_EXAMPLE }}</pre>
          <ul class="mt-3 space-y-1 text-xs text-gray-500 leading-relaxed">
            <li>・<code class="bg-white px-1 rounded">date:</code> 行で日付を指定（省略可）</li>
            <li>・複数エントリは <code class="bg-white px-1 rounded">===</code> で区切る</li>
            <li>・日付省略時は現在日時で登録されます</li>
          </ul>
        </div>
      </div>

      <!-- ドロップゾーン -->
      <div
        class="relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-200 cursor-pointer"
        :class="isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30'"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".txt,text/plain"
          class="hidden"
          @change="onFileChange"
        />
        <p class="text-4xl mb-3">📄</p>
        <p class="text-sm font-semibold text-gray-700">ファイルをドロップ</p>
        <p class="text-xs text-gray-400 mt-1">またはクリックして選択（.txt）</p>
      </div>

      <!-- パースエラー -->
      <div
        v-if="parseError"
        class="mt-4 bg-red-50 rounded-2xl px-4 py-3"
      >
        <p class="text-sm text-red-600 font-medium">⚠️ {{ parseError }}</p>
      </div>
    </div>

    <!-- 確認モーダル -->
    <Teleport to="body">
      <div
        v-if="showConfirm"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/40" @click="cancelImport"></div>
        <div class="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
          <!-- モーダルヘッダー -->
          <div class="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <p class="text-base font-bold text-gray-900">インポートの確認</p>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ parsedEntries.filter(e => !e.error).length }} 件のエントリを日記に追加します
            </p>
          </div>

          <!-- エントリ一覧 -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <div
              v-for="(entry, i) in parsedEntries"
              :key="i"
              class="rounded-2xl p-3.5 text-sm"
              :class="entry.error ? 'bg-red-50 border border-red-100' : 'bg-gray-50'"
            >
              <div v-if="entry.error" class="text-red-500 text-xs font-medium mb-1">
                ⚠️ エントリ {{ i + 1 }}: {{ entry.error }}
              </div>
              <div v-else>
                <p class="text-xs text-indigo-500 font-medium mb-1">{{ formatPreviewDate(entry.date) }}</p>
                <p class="text-gray-700 text-xs leading-relaxed line-clamp-3">{{ entry.content }}</p>
              </div>
            </div>

            <!-- スキップ注意 -->
            <p
              v-if="parsedEntries.some(e => e.error)"
              class="text-xs text-gray-400 text-center"
            >
              ⚠️ エラーのあるエントリはスキップされます
            </p>
          </div>

          <!-- ボタン -->
          <div class="px-6 pb-6 pt-4 border-t border-gray-100 flex-shrink-0 space-y-2">
            <p v-if="saveError" class="text-xs text-red-500 font-medium text-center mb-2">
              ⚠️ {{ saveError }}
            </p>
            <button
              :disabled="saving || parsedEntries.every(e => !!e.error)"
              class="w-full py-4 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-md transition-all duration-200 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              @click="confirmImport"
            >
              {{ saving ? '保存中…' : `${parsedEntries.filter(e => !e.error).length} 件をインポート` }}
            </button>
            <button
              :disabled="saving"
              class="w-full py-3.5 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold transition-colors hover:bg-gray-200 disabled:opacity-60"
              @click="cancelImport"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
