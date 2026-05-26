module.exports = {
  apps: [{
    name: 'portal',
    script: 'build/index.js',
    env: {
      PORT: 3000,
      KEYCLOAK_URL: 'http://10.34.1.4:8080',
      KEYCLOAK_REALM: 'opsid-internal',
      KEYCLOAK_CLIENT_ID: 'portal',
      KEYCLOAK_CLIENT_SECRET: 'xPwsfT4JGkwQKGCGjQcwuX5VsJ8WFTvs',
      ORIGIN: 'https://opsid.web.id',
      AUTH_SECRET: 'opsid-secret-key-2026'
    }
  }]
}
