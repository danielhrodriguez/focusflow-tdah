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
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-3398495045051910-062818-47a3e7efcd316d3f23a9689e47f7dcd1-12345678';
const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });

// ==========================================
// CONTROLADOR DE BASE DE DATOS LOCAL (db.json)
// ==========================================
const defaultData = {
  users: {
    "paciente@focusflow.com": {
      password: "123",
      profile: {
        name: "Alex Marín",
        completedIntake: true,
        kryptoniteArea: "Finanzas / Trabajo",
        asrsScore: 18,
        camhAlerts: 1,
        breathsDone: 4,
        premium: false,
        country: "ARG",
        premiumPlan: null,
        role: "patient"
      },
      intakeData: {
        asrsAnswers: [2, 3, 2, 4, 3, 3],
        camhAnswers: {},
        wfirsAreas: ["Finanzas", "Trabajo"]
      },
      dailyLogs: [
        { date: "Lun", frustration: 4, irritability: 3 },
        { date: "Mar", frustration: 5, irritability: 2 },
        { date: "Mié", frustration: 3, irritability: 4 }
      ],
      adherenceMetrics: {
        tasksCreated: 10,
        tasksDivided: 4,
        tasksCompleted: 8,
        breathingExercisesDone: 4,
        cognitiveRestructurings: 1,
        premiumUnlocked: false
      }
    },
    "coach@focusflow.com": {
      password: "123",
      profile: {
        name: "Lic. Martina Silva",
        role: "coach",
        completedIntake: true,
        premium: true,
        country: "ARG",
        premiumPlan: "coach"
      },
      intakeData: {},
      dailyLogs: [],
      adherenceMetrics: {}
    }
  },
  sessions: {}
};

function readDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    
    // Si la base de datos es la vieja (no tiene "users" o "sessions"), migrarla
    if (!parsed.users || !parsed.sessions) {
      console.log("Migrando base de datos de estructura antigua a multi-usuario...");
      const migrated = {
        users: {
          "paciente@focusflow.com": {
            password: "123",
            profile: parsed.userProfile || defaultData.users["paciente@focusflow.com"].profile,
            intakeData: parsed.intakeData || defaultData.users["paciente@focusflow.com"].intakeData,
            dailyLogs: parsed.dailyLogs || defaultData.users["paciente@focusflow.com"].dailyLogs,
            adherenceMetrics: parsed.adherenceMetrics || defaultData.users["paciente@focusflow.com"].adherenceMetrics
          }
        },
        sessions: {}
      };
      writeDatabase(migrated);
      return migrated;
    }
    
    // Asegurarse de que el usuario coach de pruebas siempre exista en db.json
    if (parsed.users && !parsed.users["coach@focusflow.com"]) {
      console.log("Insertando cuenta de coach@focusflow.com en base de datos existente...");
      parsed.users["coach@focusflow.com"] = defaultData.users["coach@focusflow.com"];
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    }
    
    return parsed;
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
// MIDDLEWARE DE AUTENTICACIÓN
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Token de sesión no provisto" });
  }

  const db = readDatabase();
  const username = db.sessions[token];
  if (!username || !db.users[username]) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }

  req.username = username;
  req.user = db.users[username];
  next();
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

// Registrar nuevo usuario
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos" });
  }
  
  const db = readDatabase();
  if (db.users[username]) {
    return res.status(400).json({ error: "El usuario ya existe" });
  }

  // Inicializar el usuario
  db.users[username] = {
    password: password,
    profile: {
      name: "Invitado",
      completedIntake: false,
      kryptoniteArea: "Pendiente",
      asrsScore: 0,
      camhAlerts: 0,
      breathsDone: 0,
      premium: false,
      country: "ARG",
      premiumPlan: null
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

  // Crear sesión
  const token = 'token_' + Math.random().toString(36).substr(2, 9);
  db.sessions[token] = username;
  writeDatabase(db);

  res.json({ success: true, token, profile: db.users[username].profile });
});

// Iniciar sesión
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDatabase();
  const user = db.users[username];

  if (!user || user.password !== password) {
    return res.status(400).json({ error: "Usuario o contraseña incorrectos" });
  }

  const token = 'token_' + Math.random().toString(36).substr(2, 9);
  db.sessions[token] = username;
  writeDatabase(db);

  res.json({ success: true, token, profile: user.profile });
});

// Cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    const db = readDatabase();
    delete db.sessions[token];
    writeDatabase(db);
  }
  res.json({ success: true });
});


// ==========================================
// ENDPOINTS DE LA API REST (PROTEGIDOS)
// ==========================================

// 1. Obtener perfil
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json(req.user.profile);
});

// 2. Guardar perfil (Fin de Onboarding)
app.post('/api/profile', authenticateToken, (req, res) => {
  const db = readDatabase();
  db.users[req.username].profile = {
    ...db.users[req.username].profile,
    ...req.body,
    completedIntake: true
  };
  
  if (req.body.intakeData) {
    db.users[req.username].intakeData = req.body.intakeData;
  }

  writeDatabase(db);
  res.json({ success: true, profile: db.users[req.username].profile });
});

// Activar Premium directamente (retorno exitoso de pasarela o simulador)
app.post('/api/profile/premium', authenticateToken, (req, res) => {
  const db = readDatabase();
  db.users[req.username].profile.premium = true;
  db.users[req.username].profile.premiumPlan = req.body.plan || 'coach';
  db.users[req.username].adherenceMetrics.premiumUnlocked = true;
  writeDatabase(db);
  res.json({ success: true, profile: db.users[req.username].profile });
});

// 3. Obtener registros de humor diarios
app.get('/api/logs', authenticateToken, (req, res) => {
  res.json(req.user.dailyLogs);
});

// 4. Agregar check-in de humor diario
app.post('/api/logs', authenticateToken, (req, res) => {
  const db = readDatabase();
  const newLog = {
    ...req.body,
    timestamp: Date.now()
  };

  db.users[req.username].dailyLogs.unshift(newLog);
  
  if (newLog.frustration >= 8) {
    db.users[req.username].profile.breathsDone = (db.users[req.username].profile.breathsDone || 0) + 1;
    db.users[req.username].adherenceMetrics.breathingExercisesDone = (db.users[req.username].adherenceMetrics.breathingExercisesDone || 0) + 1;
  }

  writeDatabase(db);
  res.json({ success: true, log: newLog, breathsDone: db.users[req.username].profile.breathsDone });
});

// 5. Actualizar métricas de adherencia (Micro-hábitos, TCC)
app.post('/api/adherence', authenticateToken, (req, res) => {
  const db = readDatabase();
  const { metric } = req.body;
  const user = db.users[req.username];
  
  if (user.adherenceMetrics[metric] !== undefined) {
    user.adherenceMetrics[metric]++;
    if (metric === 'breathingExercisesDone') {
      user.profile.breathsDone = (user.profile.breathsDone || 0) + 1;
    }
    writeDatabase(db);
    res.json({ success: true, metrics: user.adherenceMetrics });
  } else {
    res.status(400).json({ error: "Métrica inválida" });
  }
});

// 6. Endpoint consolidado para el Coach Dashboard (Gráficos + Alertas)
app.get('/api/coach/dashboard', authenticateToken, (req, res) => {
  if (req.user.profile.role !== 'coach') {
    return res.status(403).json({ error: "Acceso denegado: Se requiere rol de Coach." });
  }

  const db = readDatabase();
  const patient = db.users["paciente@focusflow.com"];

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
  
  if (patient && patient.dailyLogs.length >= 3) {
    const last3 = patient.dailyLogs.slice(0, 3);
    const frusts = last3.map(l => l.frustration);
    if (frusts.every(f => f >= 7)) {
      liveAlerts.push({
        type: "Frustración Crítica",
        message: "El usuario registró niveles de frustración > 7 durante 3 días consecutivos en sus últimas entradas.",
        severity: "critical",
        date: "Hoy"
      });
    }
  } else if (patient && patient.dailyLogs.length > 0 && patient.dailyLogs[0].frustration >= 8) {
    liveAlerts.push({
      type: "Pico de Impulsividad",
      message: "El usuario registró frustración extrema de " + patient.dailyLogs[0].frustration + " hoy.",
      severity: "critical",
      date: "Hoy"
    });
  }

  res.json({
    userProfile: patient ? patient.profile : {},
    dailyLogs: patient ? patient.dailyLogs : [],
    adherenceMetrics: patient ? patient.adherenceMetrics : {},
    alerts: [...liveAlerts, ...defaultAlerts]
  });
});

// ==========================================
// ENDPOINTS MERCADO PAGO (PROTEGIDO)
// ==========================================

// 1. Crear Preferencia de Pago
app.post('/api/checkout/mercadopago', authenticateToken, async (req, res) => {
  const host = req.body.host || `http://localhost:${PORT}`;
  const plan = req.body.plan || 'coach';
  const isApp = plan === 'app';
  const price = isApp ? 1500.00 : 7500.00;
  const title = isApp ? 'Suscripción FocusFlow Solo App' : 'Suscripción FocusFlow Coach Premium';

  try {
    // Si el token es el ficticio por defecto, forzar el uso del simulador opcional
    if (MP_TOKEN.includes('12345678') || MP_TOKEN === 'TEST-DEFAULT') {
      throw new Error("Token ficticio detectado en el servidor");
    }

    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        external_reference: req.username, // Email/Usuario para relacionarlo en el webhook
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
    console.warn("Mercado Pago falló o no está configurado (redireccionando a simulador):", error.message);
    
    // Retornar error de configuración pero adjuntar la URL de simulación de éxito para confirmación del cliente
    res.json({ 
      error: "Credenciales de Mercado Pago no configuradas o inválidas", 
      details: error.message,
      simulated_url: `${host}/?payment=success&plan=${plan}`
    });
  }
});

// 2. Webhook / Notificación IPN
app.post('/api/webhook/mercadopago', (req, res) => {
  const { query } = req;
  const topic = query.topic || query.type;
  
  if (topic === 'payment') {
    const paymentId = query.id || query['data.id'];
    console.log(`[Webhook] Notificación de pago recibida. ID: ${paymentId}`);
    
    const userEmail = query.external_reference || req.body.external_reference;
    if (userEmail) {
      const db = readDatabase();
      if (db.users[userEmail]) {
        db.users[userEmail].profile.premium = true;
        db.users[userEmail].adherenceMetrics.premiumUnlocked = true;
        writeDatabase(db);
        console.log(`[Webhook] Suscripción Premium activada para ${userEmail}.`);
      }
    }
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
