import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import placesRouter from './routes/places.js';
import flagsRouter from './routes/flags.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import unitsRouter from './routes/units.js';
import topicsRouter from './routes/topics.js';
import explainRouter from './routes/explain.js';
import recallRouter from './routes/recall.js';
import examsRouter from './routes/exams.js';
import { auth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { prisma } from './services/prisma.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDirectory = fileURLToPath(new URL('../uploads/', import.meta.url));

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDirectory));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/dashboard', auth, dashboardRouter);
app.use('/units', auth, unitsRouter);
app.use('/topics', auth, topicsRouter);
app.use('/explanations', auth, explainRouter);
app.use('/places', auth, placesRouter);
app.use('/flags', auth, flagsRouter);
app.use('/recall', auth, recallRouter);
app.use('/exams', auth, examsRouter);
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Pinpoint server listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}