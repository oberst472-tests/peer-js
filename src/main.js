import Vue from 'vue'
import router from './router'
import App from './App.vue'

Vue.config.productionTip = false

import './assets/scss/main.scss'
import '@/components/ui'

new Vue({
    router,
    render: h => h(App)
}).$mount('#app')
