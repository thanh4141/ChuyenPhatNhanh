import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { env, validateEnv } from './config/env.js';
import { errorHandler } from './common/errors.js';
import { apiRouter } from './routes/index.js';
import { openMaps } from './modules/maps/maps.service.js';

export function createApp(options = {}) {
  validateEnv();
  const app = express();
  app.locals.maps=options.mapsProvider||openMaps;
  app.locals.uploadDirectory=options.uploadDirectory||fileURLToPath(new URL('../../.local/uploads/',import.meta.url));
  app.disable('x-powered-by');
  app.use('/maps',helmet({crossOriginResourcePolicy:{policy:'cross-origin'},frameguard:false,referrerPolicy:{policy:'strict-origin-when-cross-origin'},contentSecurityPolicy:{directives:{'default-src':["'self'"],'script-src':["'self'"],'style-src':["'self'","'unsafe-inline'"],'img-src':["'self'",'data:','blob:','https:','http:'],'connect-src':["'self'"],'frame-ancestors':["'self'",...env.origins],'upgrade-insecure-requests':env.nodeEnv==='production'?[]:null}},strictTransportSecurity:env.nodeEnv==='production'}));
  app.use('/maps/vendor',express.static(fileURLToPath(new URL('../node_modules/leaflet/dist/',import.meta.url))));
  app.use('/maps',express.static(fileURLToPath(new URL('../../Admin/maps/',import.meta.url))));
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:', 'blob:'], 'upgrade-insecure-requests': env.nodeEnv === 'production' ? [] : null } }, strictTransportSecurity: env.nodeEnv === 'production' }));
  app.use(cors({ origin(origin, callback) { callback(null, !origin || env.origins.includes(origin)); } }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } }), (req, res, next) => { res.set('Cache-Control','no-store'); next(); }, apiRouter);
  app.use(express.static(fileURLToPath(new URL('../../Admin', import.meta.url))));
  app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy đường dẫn.' }));
  app.use(errorHandler);
  return app;
}
