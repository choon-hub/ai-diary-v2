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
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- ヘッダー -->
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 transition-colors mb-6"
        >
          ← 一覧に戻る
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-800">新しい日記を書く</h1>
        <p class="mt-2 text-gray-500 text-sm">今日の出来事や感じたことを書いてみましょう</p>
      </div>

      <!-- フォーム -->
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <textarea
          v-model="content"
          placeholder="今日はどんな一日でしたか？"
          class="w-full h-64 resize-none text-gray-700 text-sm leading-relaxed placeholder-gray-300 focus:outline-none"
          :disabled="saving"
        />

        <!-- エラー表示 -->
        <p
          v-if="saveError"
          class="mt-3 text-sm text-red-600"
        >
          ⚠️ {{ saveError }}
        </p>

        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button
            :disabled="saving"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
            @click="handleSave"
          >
            {{ saving ? '保存中…' : '保存する' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
