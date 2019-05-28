const proxy = require('http-proxy-middleware')

module.exports = function expressMiddleware (router) {
    router.use('/api', proxy({
        target: 'https://orchestrator.dev.automation.surf.net',
        // target: 'http://localhost:8080',
        changeOrigin: true
    }))
}
