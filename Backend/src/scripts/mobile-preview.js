import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory=fileURLToPath(new URL('../../../Mobile/dist/',import.meta.url));
if(!existsSync(directory))throw new Error('Chạy npm --prefix Mobile run export:web trước khi mở bản xem thử.');
const app=express();app.use(express.static(directory));
app.listen(8081,'127.0.0.1',()=>console.log('CPN Mobile • Bản xem thử trên web: http://localhost:8081'));
