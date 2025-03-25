import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type Task = {
  id: string;
  title: string;
  status: 'IN_PROGRESS' | 'COMPLETE';
};

const credential = applicationDefault();

// Only initialize app if it does not already exist
if (getApps().length === 0) {
  initializeApp({ credential });
}

const db = getFirestore();
const tasksRef = db.collection('tasks');

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

app.get('/api/tasks', async (req, res) => {
  const snapshot = await tasksRef.orderBy('createdAt', 'desc').limit(100).get();
  const tasks: Task[] = snapshot.docs.map(doc => ({
    id: doc.id,
    title: doc.data()['title'],
    status: doc.data()['status'],
  }));
  res.send(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const newTaskTitle = req.body.title;
  if(!newTaskTitle){
    res.status(400).send("Title is required");
    return;
  }
  await tasksRef.doc().create({
    title: newTaskTitle,
    status: 'IN_PROGRESS',
    createdAt: Date.now(),
  });
  res.sendStatus(200);
});

app.put('/api/tasks', async (req, res) => {
  const task: Task = req.body;
  if (!task || !task.id || !task.title || !task.status) {
    res.status(400).send("Invalid task data");
    return;
  }
  await tasksRef.doc(task.id).set(task);
  res.sendStatus(200);
});

app.delete('/api/tasks', async (req, res) => {
  const task: Task = req.body;
  if(!task || !task.id){
    res.status(400).send("Task ID is required");
    return;
  }
  await tasksRef.doc(task.id).delete();
  res.sendStatus(200);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
