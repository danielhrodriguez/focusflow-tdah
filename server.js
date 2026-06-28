const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend directamente
app.use(express.static(__dirname));

// ==========================================
// CONFIGURACIÓN DE MERCADO PAGO (SANDBOX)
// ==========================================
// Reemplazar con tu Access Token de producción o Sandbox en Render a través de variables de entorno
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-3398495045051910-062818-47a3e7efcd316d3f23a9689e47f7dcd1-12345678';
const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });

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
    breathsDone: 0,
    premium: false
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
    cognitiveRestructurings: 0,
    premiumUnlocked: false
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
  
  if (req.body.intakeData) {
    db.intakeData = req.body.intakeData;
  }

  writeDatabase(db);
  res.json({ success: true, profile: db.userProfile });
});

// Activar Premium directamente (retorno exitoso de pasarela)
app.post('/api/profile/premium', (req, res) => {
  const db = readDatabase();
  db.userProfile.premium = true;
  db.userProfile.premiumPlan = req.body.plan || 'coach';
  db.adherenceMetrics.premiumUnlocked = true;
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

  db.dailyLogs.unshift(newLog);
  
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
  const { metric } = req.body;
  
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

  const liveAlerts = [];
  
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

// ==========================================
// ENDPOINTS MERCADO PAGO
// ==========================================

// 1. Crear Preferencia de Pago
app.post('/api/checkout/mercadopago', async (req, res) => {
  try {
    const host = req.body.host || `http://localhost:${PORT}`;
    const plan = req.body.plan || 'coach';
    const isApp = plan === 'app';
    const price = isApp ? 1500.00 : 7500.00;
    const title = isApp ? 'Suscripción FocusFlow Solo App' : 'Suscripción FocusFlow Coach Premium';

    const preference = new Preference(client);
    
    const response = await preference.create({
      body: {
        items: [
          {
            id: isApp ? 'plan-app-only' : 'plan-coach-premium',
            title: title,
            quantity: 1,
            unit_price: price,
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${host}/?payment=success&plan=${plan}`,
          failure: `${host}/?payment=failure`,
          pending: `${host}/?payment=pending`
        },
        auto_return: 'approved',
        notification_url: `${host}/api/webhook/mercadopago`
      }
    });

    res.json({ init_point: response.init_point });
  } catch (error) {
    console.error("Error creando preferencia Mercado Pago:", error);
    res.status(500).json({ error: "Error en el servidor de pagos", details: error.message });
  }
});

// 2. Webhook / Notificación IPN (IPN Listener)
app.post('/api/webhook/mercadopago', (req, res) => {
  const { query } = req;
  const topic = query.topic || query.type;
  
  if (topic === 'payment') {
    const paymentId = query.id || query['data.id'];
    console.log(`[Webhook] Notificación de pago recibida. ID: ${paymentId}`);
    
    // Automatizar la aprobación del premium en el backend local
    const db = readDatabase();
    db.userProfile.premium = true;
    db.adherenceMetrics.premiumUnlocked = true;
    writeDatabase(db);
    console.log(`[Webhook] Suscripción Premium activada con éxito en db.json.`);
  }

  res.sendStatus(200);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` FocusFlow Backend en ejecución en puerto ${PORT}`);
  console.log(` Abre http://localhost:${PORT} en tu navegador`);
  console.log(`=================================================`);
});
