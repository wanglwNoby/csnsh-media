module.exports = {
    publicPath: './',
    devServer: {
        proxy: {
            '/api': {
                // target: 'http://localhost:8081',
                target: 'http://172.16.21.172:8081',
                ws: true,
                changeOrigin: true,
                pathRewrite: {
                '^/api': ''  //通过pathRewrite重写地址，将前缀/api转为/
                }
            }
        }
    }
}