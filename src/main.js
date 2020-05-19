import Vue from 'vue'
import App from './App.vue'
import 'babel-polyfill'
import axios from 'axios'
import iView from 'iview'
import 'iview/dist/styles/iview.css'

Vue.config.productionTip = false

Vue.use(iView)
axios.defaults.baseURL = process.env.VUE_APP_BASE_API;    //全局配置axios跨域请求地址
Vue.prototype.$axios = axios

new Vue({
  render: h => h(App),
}).$mount('#app')
