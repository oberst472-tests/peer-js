import Vue from 'vue'
import VueRouter from 'vue-router'


Vue.use(VueRouter)

const router = new VueRouter({
    mode: 'history',
    // base: process.env.BASE_URL
    routes: [
        {
            component: require('@/pages/login/index').default,
            path: '/',
            name: 'login'
        },
        {
            component: require('@/pages/home/index').default,
            path: '/dashboard',
            name: 'home'
        }
    ]
})


export default router
