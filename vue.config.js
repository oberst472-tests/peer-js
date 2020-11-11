const path = require('path')
// const devServer = 'calls-dev.enlighted.ru';
const url = 'https://vc-dev.enlighted.ru/api/v1';

module.exports = {
  chainWebpack: config => {
    const types = ['vue-modules', 'vue', 'normal-modules', 'normal']
    types.forEach(type => addStyleResource(config.module.rule('scss').oneOf(type)))
  },
    devServer: {
        proxy: url,
        https: true
    }
};

function addStyleResource(rule) {
  rule.use('style-resource')
      .loader('style-resources-loader')
      .options({
        patterns: [
          path.resolve(__dirname, './src/assets/scss/vars.scss')
        ]
      })
}



