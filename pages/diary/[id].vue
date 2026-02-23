<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id as string)

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
        <p class="text-xs text-gray-400 mb-1">日記 #{{ id }}</p>
        <h1 class="text-3xl font-bold text-gray-800">日記詳細</h1>
      </div>

      <!-- 本文カード -->
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <p class="text-xs text-gray-400 mb-4">2026年2月23日</p>
        <p class="text-gray-700 text-sm leading-relaxed">
          これはダミーの日記本文です。実際の内容はSupabaseから取得する予定です。<br><br>
          今日はとても充実した一日でした。新しいことを学び、様々な出来事があり、
          振り返るとたくさんの気づきがありました。
        </p>
      </div>

      <!-- AIで分析ボタン -->
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
  </div>
</template>
