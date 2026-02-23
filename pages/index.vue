<script setup lang="ts">
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
