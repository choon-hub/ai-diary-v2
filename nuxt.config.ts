// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  supabase: {
    redirect: false,
  },
  typescript: {
    strict: true,
  },
  compatibilityDate: '2024-11-01'
})
