export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'TOROX — Seguridad inteligente para hogar y empresa',
      htmlAttrs: { lang: 'es' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0b1631' },
        {
          name: 'description',
          content:
            'TOROX: cámaras de seguridad, alarmas, videoporteros, cerraduras inteligentes y soluciones de seguridad para hogares y empresas.',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: '/favicon.png',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=JetBrains+Mono:wght@500&display=swap',
        },
      ],
      script: [
        {
          // Apply the persisted theme before first paint to avoid a flash.
          // Default is DARK; /admin always stays light.
          innerHTML: `(function(){try{var t=localStorage.getItem('torox_theme');var dark=t==='light'?false:true;if(location.pathname.indexOf('/admin')===0){dark=false}var h=document.documentElement;if(dark){h.classList.add('dark')}else{h.classList.remove('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/api',
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  nitro: {
    prerender: {
      crawlLinks: false,
    },
  },
})