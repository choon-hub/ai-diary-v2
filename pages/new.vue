<script setup lang="ts">
const content = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)

const supabase = useSupabaseClient()

async function handleSave() {
  if (!content.value.trim()) {
    saveError.value = '本文を入力してください'
    return
  }

  saving.value = true
  saveError.value = null

  const { data, error } = await supabase
    .from('diaries')
    .insert({ user_key: 'local', content: content.value.trim() })
    .select('id')
    .single()

  if (error) {
    saving.value = false
    console.error('[new] 保存エラー:', error)
    saveError.value = '保存に失敗しました。しばらくしてから再試行してください。'
    return
  }

  await navigateTo(`/diary/${data.id}?created=1`)
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
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">新しい日記を書く</h1>
        <p class="mt-1 text-sm text-gray-400">今日の出来事や感じたことを書いてみましょう</p>
      </div>
    </div>

    <!-- フォーム本体 -->
    <div class="flex-1 max-w-md mx-auto w-full px-5 pb-36">
      <!-- カード内フォーム -->
      <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <textarea
          v-model="content"
          placeholder="今日はどんな一日でしたか？"
          class="w-full min-h-64 resize-none text-gray-700 text-sm leading-relaxed placeholder-gray-300 focus:outline-none"
          :disabled="saving"
        />

        <!-- バリデーションエラー -->
        <div
          v-if="saveError"
          class="mt-3 pt-3 border-t border-red-100"
        >
          <p class="text-xs text-red-500 font-medium">⚠️ {{ saveError }}</p>
        </div>
      </div>
    </div>

    <!-- フッター固定ボタン -->
    <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4">
      <div class="max-w-md mx-auto">
        <button
          :disabled="saving"
          class="w-full py-4 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-md transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          @click="handleSave"
        >
          {{ saving ? '保存中…' : '保存する' }}
        </button>
      </div>
    </div>
  </div>
</template>
