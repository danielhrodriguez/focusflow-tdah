const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend directamente
app.use(express.static(__dirname));

// ==========================================
// CONTROLADOR DE BASE DE DATOS LOCAL (db.json)
// ==========================================
const defaultData = {
  userProfile: {
    name: "Invitado",
    completedIntake: false,
    kryptoniteArea: "Pendiente",
    asrsScore: 0,
    camhAlerts: 0,
    breathsDone: 0
  },
  intakeData: {
    asrsAnswers: [],
    camhAnswers: {},
    wfirsAreas: []
  },
  dailyLogs: [],
  adherenceMetrics: {
    tasksCreated: 0,
    tasksDivided: 0,
    tasksCompleted: 0,
    breathingExercisesDone: 0,
    cognitiveRestructurings: 0
  }
};

function readDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo db.json, usando valores por defecto", e);
    return defaultData;
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("Error escribiendo en db.json", e);
  }
}

// ==========================================
// ENDPOINTS DE LA API REST
// ==========================================

// 1. Obtener perfil
app.get('/api/profile', (req, res) => {
  const db = readDatabase();
  res.json(db.userProfile);
});

// 2. Guardar perfil (Fin de Onboarding)
app.post('/api/profile', (req, res) => {
  const db = readDatabase();
  db.userProfile = {
    ...db.userProfile,
    ...req.body,
    completedIntake: true
  };
  
  // Guardar también las respuestas del cuestionario
  if (req.body.intakeData) {
    db.intakeData = req.body.intakeData;
  }

  writeDatabase(db);
  res.json({ success: true, profile: db.userProfile });
});

// 3. Obtener registros de humor diarios
app.get('/api/logs', (req, res) => {
  const db = readDatabase();
  res.json(db.dailyLogs);
});

// 4. Agregar check-in de humor diario
app.post('/api/logs', (req, res) => {
  const db = readDatabase();
  const newLog = {
    ...req.body,
    timestamp: Date.now()
  };

  db.dailyLogs.unshift(newLog); // Añadir al inicio
  
  // Si la frustración es alta, actualizar contador de respiraciones (simulación del coach)
  if (newLog.frustration >= 8) {
    db.userProfile.breathsDone = (db.userProfile.breathsDone || 0) + 1;
    db.adherenceMetrics.breathingExercisesDone = (db.adherenceMetrics.breathingExercisesDone || 0) + 1;
  }

  writeDatabase(db);
  res.json({ success: true, log: newLog, breathsDone: db.userProfile.breathsDone });
});

// 5. Actualizar métricas de adherencia (Micro-hábitos, TCC)
app.post('/api/adherence', (req, res) => {
  const db = readDatabase();
  const { metric } = req.body; // tasksCreated | tasksCompleted | breathingExercisesDone | cognitiveRestructurings
  
  if (db.adherenceMetrics[metric] !== undefined) {
    db.adherenceMetrics[metric]++;
    if (metric === 'breathingExercisesDone') {
      db.userProfile.breathsDone = (db.userProfile.breathsDone || 0) + 1;
    }
    writeDatabase(db);
    res.json({ success: true, metrics: db.adherenceMetrics });
  } else {
    res.status(400).json({ error: "Métrica inválida" });
  }
});

// 6. Endpoint consolidado para el Coach Dashboard (Gráficos + Alertas)
app.get('/api/coach/dashboard', (req, res) => {
  const db = readDatabase();
  
  // Alertas estáticas iniciales (seedData)
  const defaultAlerts = [
    {
      type: "Riesgo de Conducción (JDQ)",
      message: "Se reportó un evento de inatención al volante con frenado brusco e impulsividad motora leve.",
      severity: "warning",
      date: "Ayer"
    },
    {
      type: "Negligencia Financiera",
      message: "Dos alertas de facturas vencidas sin pagar debido a parálisis por procrastinación.",
      severity: "warning",
      date: "Hoy"
    }
  ];

  // Alertas en tiempo real basadas en la base de datos
  const liveAlerts = [];
  
  // Alerta 1: Frustración persistente en los registros reales
  if (db.dailyLogs.length >= 3) {
    const last3 = db.dailyLogs.slice(0, 3);
    const frusts = last3.map(l => l.frustration);
    if (frusts.every(f => f >= 7)) {
      liveAlerts.push({
        type: "Frustración Crítica",
        message: "El usuario registró niveles de frustración > 7 durante 3 días consecutivos en sus últimas entradas.",
        severity: "critical",
        date: "Hoy"
      });
    }
  } else if (db.dailyLogs.length > 0 && db.dailyLogs[0].frustration >= 8) {
    liveAlerts.push({
      type: "Pico de Impulsividad",
      message: "El usuario registró frustración extrema de " + db.dailyLogs[0].frustration + " hoy.",
      severity: "critical",
      date: "Hoy"
    });
  }

  res.json({
    userProfile: db.userProfile,
    dailyLogs: db.dailyLogs,
    adherenceMetrics: db.adherenceMetrics,
    alerts: [...liveAlerts, ...defaultAlerts]
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` FocusFlow Backend en ejecución en puerto ${PORT}`);
  console.log(` Abre http://localhost:${PORT} en tu navegador`);
  console.log(`=================================================`);
});
