const App = {
  setup() {
    const message = Vue.ref('Hello World! testetstest')
    return { message }
  },
  template: `
    <div>
      <h1>{{ message }}</h1>
    </div>
  `
}

Vue.createApp(App).mount('#app')
