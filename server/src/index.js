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
import { transcribeAudioHandler } from './controllers/explainController.js';
import { auth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { prisma } from './services/prisma.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDirectory = fileURLToPath(new URL('../uploads/', import.meta.url));

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or tools with no origin
    if (!origin) return callback(null, true);
    // Allow any .vercel.app origin, localhost, or configured CLIENT_URL
    const clientUrl = process.env.CLIENT_URL;
    if (
      !clientUrl ||
      clientUrl === '*' ||
      origin === clientUrl ||
      /\.vercel\.app$/.test(origin) ||
      /localhost/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDirectory));

const apiRouter = express.Router();
apiRouter.use('/uploads', express.static(uploadsDirectory));
apiRouter.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', auth, dashboardRouter);
apiRouter.use('/units', auth, unitsRouter);
apiRouter.use('/topics', auth, topicsRouter);
apiRouter.use('/explanations', auth, explainRouter);
apiRouter.use('/places', auth, placesRouter);
apiRouter.use('/flags', auth, flagsRouter);
apiRouter.use('/recall', auth, recallRouter);
apiRouter.use('/exams', auth, examsRouter);
apiRouter.post('/transcribe', express.json({ limit: '50mb' }), transcribeAudioHandler);

// Mount under /api (for Vercel service rewrites) and root (for direct/local usage)
app.use('/api', apiRouter);
app.use(apiRouter);

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);

if (!process.env.VERCEL) {
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
}

export default app;