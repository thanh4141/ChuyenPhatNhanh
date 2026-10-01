window.addEventListener('DOMContentLoaded', () => {
  window.ui = SwaggerUIBundle({
    url: '/api-docs/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: false,
    filter: true,
    docExpansion: 'list',
    displayRequestDuration: true,
    defaultModelsExpandDepth: -1,
    persistAuthorization: false,
    validatorUrl: null,
    syntaxHighlight: false,
    supportedSubmitMethods: ['get', 'post', 'patch', 'delete'],
    presets: [SwaggerUIBundle.presets.apis],
    layout: 'BaseLayout',
  });
});
