<script setup lang="ts">
// ── ダミーデータ（後続タスクで実データに差し替え） ─────────────────────

const kpiData = [
  { label: 'ポジティブ率', value: '72%', icon: '😊', bgClass: 'bg-green-50' },
  { label: '日記数', value: '14件', icon: '📔', bgClass: 'bg-indigo-50' },
  { label: '継続日数', value: '7日', icon: '🔥', bgClass: 'bg-orange-50' },
]

// 感情トレンド：過去7日分のダミースコア（0〜100）
const trendData = [
  { label: '月', score: 60 },
  { label: '火', score: 45 },
  { label: '水', score: 80 },
  { label: '木', score: 55 },
  { label: '金', score: 90 },
  { label: '土', score: 70 },
  { label: '日', score: 75 },
]

// 感情カレンダー：過去28日分のダミー感情レベル（0〜3）
const calendarCells = [
  0, 1, 2, 3, 1, 2, 3, 2,
  1, 0, 2, 3, 1, 2, 0, 3,
  2, 1, 3, 2, 1, 0, 2, 3,
  1, 2, 3, 2,
].map((level, i) => ({ day: i + 1, level: level as 0 | 1 | 2 | 3 }))

const calendarLevelClass: Record<0 | 1 | 2 | 3, string> = {
  0: 'bg-gray-100',
  1: 'bg-indigo-100',
  2: 'bg-indigo-300',
  3: 'bg-indigo-500',
}

// 行動ランキング
const actionRanking = [
  { rank: 1, action: '運動・ウォーキング', count: 8, emoji: '🏃' },
  { rank: 2, action: '読書・学習', count: 6, emoji: '📚' },
  { rank: 3, action: '料理・食事', count: 5, emoji: '🍳' },
  { rank: 4, action: '友人・家族との会話', count: 4, emoji: '💬' },
  { rank: 5, action: '瞑想・ストレッチ', count: 3, emoji: '🧘' },
]

// AIレポート
const aiReport = {
  trend: 'この1ヶ月は全体的にポジティブな感情が多く、特に週末にスコアが高い傾向があります。運動や学習などの習慣が感情の安定に寄与しているようです。',
  advice: '平日の感情スコアが週末より低い傾向があります。仕事後の小さなリフレッシュ習慣（10分の散歩や読書など）を取り入れてみると、感情バランスが改善するかもしれません。',
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- ヘッダー -->
    <div class="bg-gradient-to-b from-indigo-50/70 via-purple-50/20 to-white px-5 pt-14 pb-7">
      <div class="max-w-md mx-auto">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors mb-5"
        >
          ← 一覧へ
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">ダッシュボード</h1>
        <p class="mt-1 text-sm text-gray-400">あなたの日記データをAIが分析・可視化</p>
      </div>
    </div>

    <div class="max-w-md mx-auto px-5 pb-16 space-y-6">

      <!-- ── KPI サマリー ──────────────────────────────────────── -->
      <section>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">サマリー</p>
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="kpi in kpiData"
            :key="kpi.label"
            class="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center"
          >
            <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2', kpi.bgClass]">
              {{ kpi.icon }}
            </div>
            <p class="text-xl font-bold text-gray-900 leading-none mb-1">{{ kpi.value }}</p>
            <p class="text-xs text-gray-400 leading-tight">{{ kpi.label }}</p>
          </div>
        </div>
      </section>

      <!-- ── 感情トレンド ────────────────────────────────────────── -->
      <section>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">感情トレンド</p>
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <p class="text-sm font-semibold text-gray-700 mb-1">過去7日間の感情スコア</p>
          <p class="text-xs text-gray-400 mb-4">※ 実データ接続後に更新されます</p>
          <!-- 簡易棒グラフ（プレースホルダー） -->
          <div class="flex items-end gap-2 h-28">
            <div
              v-for="d in trendData"
              :key="d.label"
              class="flex-1 flex flex-col items-center gap-1.5"
            >
              <div
                class="w-full rounded-t-lg bg-indigo-400 opacity-70"
                :style="{ height: `${(d.score / 100) * 88}px` }"
              />
              <span class="text-xs text-gray-400">{{ d.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── 感情カレンダー ──────────────────────────────────────── -->
      <section>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">感情カレンダー</p>
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <p class="text-sm font-semibold text-gray-700 mb-1">過去28日間の感情マップ</p>
          <p class="text-xs text-gray-400 mb-4">色が濃いほどポジティブな感情</p>
          <!-- 7列×4行グリッド -->
          <div class="grid grid-cols-7 gap-1.5">
            <div
              v-for="cell in calendarCells"
              :key="cell.day"
              :class="['aspect-square rounded-md', calendarLevelClass[cell.level]]"
            />
          </div>
          <!-- 凡例 -->
          <div class="flex items-center gap-1.5 mt-3 justify-end">
            <span class="text-xs text-gray-400">低</span>
            <div class="w-3 h-3 rounded-sm bg-gray-100" />
            <div class="w-3 h-3 rounded-sm bg-indigo-100" />
            <div class="w-3 h-3 rounded-sm bg-indigo-300" />
            <div class="w-3 h-3 rounded-sm bg-indigo-500" />
            <span class="text-xs text-gray-400">高</span>
          </div>
        </div>
      </section>

      <!-- ── 行動ランキング ──────────────────────────────────────── -->
      <section>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">行動ランキング</p>
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <p class="text-sm font-semibold text-gray-700 mb-1">よく行った行動 TOP 5</p>
          <p class="text-xs text-gray-400 mb-4">ai_next_action の頻出ワード（ダミー）</p>
          <ol class="space-y-3">
            <li
              v-for="item in actionRanking"
              :key="item.rank"
              class="flex items-center gap-3"
            >
              <span
                :class="[
                  'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0',
                  item.rank === 1 ? 'bg-yellow-400 text-white' :
                  item.rank === 2 ? 'bg-gray-300 text-white' :
                  item.rank === 3 ? 'bg-orange-300 text-white' :
                  'bg-gray-100 text-gray-500',
                ]"
              >{{ item.rank }}</span>
              <span class="text-base flex-shrink-0">{{ item.emoji }}</span>
              <span class="flex-1 text-sm text-gray-700 truncate">{{ item.action }}</span>
              <span class="text-xs text-gray-400 font-medium flex-shrink-0">{{ item.count }}回</span>
            </li>
          </ol>
        </div>
      </section>

      <!-- ── AIレポート ──────────────────────────────────────────── -->
      <section>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AIレポート</p>
        <div class="space-y-3">
          <!-- 全体傾向 -->
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100/60 p-5">
            <p class="text-xs font-semibold text-indigo-500 mb-2 flex items-center gap-1.5">
              <span>✨</span> 全体傾向
            </p>
            <p class="text-sm text-gray-700 leading-relaxed">{{ aiReport.trend }}</p>
          </div>
          <!-- 改善アドバイス -->
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-100/60 p-5">
            <p class="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1.5">
              <span>💡</span> 改善アドバイス
            </p>
            <p class="text-sm text-gray-700 leading-relaxed">{{ aiReport.advice }}</p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
