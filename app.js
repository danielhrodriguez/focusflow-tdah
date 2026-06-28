// Lógica de Control FocusFlow (Acompañante de TDAH en Adultos) - Versión Fullstack
document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================
  let appState = {
    role: "client", // client | coach
    userProfile: {
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
    tasks: [],
    timerInterval: null,
    timerSeconds: 600, // 10 minutos por defecto
    timerRunning: false,
    activeStepIndex: null,
    clickTimestamps: []
  };

  // Cargar datos del almacenamiento local como respaldo inicial (Offline Fallback)
  if (localStorage.getItem("focusflow_state")) {
    try {
      const saved = JSON.parse(localStorage.getItem("focusflow_state"));
      appState = { ...appState, ...saved };
    } catch (e) {
      console.error("Error cargando el estado local", e);
    }
  }

  // ==========================================
  // CONSULTAS AL DOM CENTRALIZADAS (Evita Temporal Dead Zone)
  // ==========================================
  const views = {
    intake: document.getElementById("view-intake"),
    dashboard: document.getElementById("view-dashboard"),
    checkin: document.getElementById("view-checkin"),
    restructuring: document.getElementById("view-restructuring"),
    coach: document.getElementById("view-coach")
  };

  const bcRoot = document.getElementById("bc-root");
  const bcCurrent = document.getElementById("bc-current");

  // Capa global Parar y Pensar
  const stOverlay = document.getElementById("stop-think-overlay");
  const stStepBreathing = document.getElementById("st-step-breathing");
  const stStepReflection = document.getElementById("st-step-reflection");
  const stStepCompletion = document.getElementById("st-step-completion");
  const breathProgress = document.getElementById("breath-progress");
  const breathCircle = document.querySelector(".breath-circle");
  const breathText = document.querySelector(".breath-text");
  const btnSubmitReflection = document.getElementById("btn-submit-reflection");
  const btnCloseOverlay = document.getElementById("btn-close-overlay");

  // Onboarding / Intake
  const asrsContainer = document.getElementById("asrs-question-container");
  const btnAsrsNext = document.getElementById("btn-asrs-next");
  const asrsCurrentDisplay = document.getElementById("asrs-current");
  const binaryButtons = document.querySelectorAll(".btn-binary");
  const btnCamhNext = document.getElementById("btn-camh-next");
  const btnCamhPrev = document.getElementById("btn-camh-prev");
  const wfirsChips = document.querySelectorAll(".wfirs-chip-card");
  const btnWfirsFinish = document.getElementById("btn-wfirs-finish");
  const btnWfirsPrev = document.getElementById("btn-wfirs-prev");

  // Check-in diario
  const sliderFrustration = document.getElementById("slider-frustration");
  const sliderIrritability = document.getElementById("slider-irritability");
  const sliderSensitivity = document.getElementById("slider-sensitivity");
  const valFrustration = document.getElementById("val-frustration");
  const valIrritability = document.getElementById("val-irritability");
  const valSensitivity = document.getElementById("val-sensitivity");
  const btnGoCheckin = document.getElementById("btn-go-checkin");
  const btnCheckinToDashboard = document.getElementById("btn-checkin-to-dashboard");
  const btnCheckinToStep2 = document.getElementById("btn-checkin-to-step2");
  const btnCheckinBackStep1 = document.getElementById("btn-checkin-back-step1");
  const btnCheckinFinish = document.getElementById("btn-checkin-finish");
  const checkinStep1 = document.getElementById("checkin-step-1");
  const checkinStep2 = document.getElementById("checkin-step-2");
  const chipDetonants = document.querySelectorAll(".chip-detonant");

  // Gestor Anti-Procrastinación
  const btnAnalyzeTask = document.getElementById("btn-analyze-task");
  const taskInput = document.getElementById("kryptonite-task-input");
  const taskWarning = document.getElementById("task-length-warning");
  const chunkingStepsContainer = document.getElementById("chunking-steps-container");
  const microStepsList = document.getElementById("micro-steps-list");
  const activeTimerSection = document.getElementById("active-timer-section");
  const timerText = document.getElementById("timer-text");
  const timerIndicator = document.getElementById("timer-indicator");
  const btnTimerToggle = document.getElementById("btn-timer-toggle");
  const btnTimerSkip = document.getElementById("btn-timer-skip");
  const activeTaskTitle = document.getElementById("timer-active-task");

  // Reestructuración Cognitiva
  const thoughtsContainer = document.getElementById("thoughts-list-container");
  const reframeProcessCard = document.getElementById("reframe-process-card");
  const originalThoughtText = document.getElementById("original-thought-text");
  const biasExplanation = document.getElementById("bias-explanation");
  const alternativeThoughtText = document.getElementById("alternative-thought-text");
  const btnApplyReframe = document.getElementById("btn-apply-reframe");

  // Coach Dashboard y Selector de Roles
  const alertsList = document.getElementById("coach-alerts-list");
  const roleClientBtn = document.getElementById("role-client");
  const roleCoachBtn = document.getElementById("role-coach");

  // Elementos de Suscripción Mercado Pago
  const btnSubscribeApp = document.getElementById("btn-subscribe-app");
  const btnSubscribeCoach = document.getElementById("btn-subscribe-coach");
  const paymentSuccessModal = document.getElementById("payment-success-modal");
  const btnClosePaymentModal = document.getElementById("btn-close-payment-modal");
  const premiumStatusArea = document.getElementById("premium-status-area");

  // ==========================================
  // HELPERS DE CONEXIÓN CON EXPRESS (BACKEND)
  // ==========================================
  async function apiGet(url) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Error GET a ${url}, fallback local`, e);
    }
    return null;
  }

  async function apiPost(url, data) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Error POST a ${url}, fallback local`, e);
    }
    return null;
  }

  // ==========================================
  // ENRUTADOR DE VISTAS (SPA Routing)
  // ==========================================
  function showView(viewName) {
    if (viewName !== "dashboard") {
      pauseTimer();
    }

    Object.keys(views).forEach(key => {
      if (views[key]) views[key].classList.add("hidden");
    });

    if (views[viewName]) {
      views[viewName].classList.remove("hidden");
    }

    if (viewName === "intake") {
      bcRoot.innerText = "FocusFlow";
      bcCurrent.innerText = "Onboarding";
    } else if (viewName === "dashboard") {
      bcRoot.innerText = "Espacio Personal";
      bcCurrent.innerText = "Workspace";
    } else if (viewName === "checkin") {
      bcRoot.innerText = "Espacio Personal";
      bcCurrent.innerText = "Check-in Emocional";
    } else if (viewName === "restructuring") {
      bcRoot.innerText = "Espacio Personal";
      bcCurrent.innerText = "TCC: Pensamiento Trampa";
    } else if (viewName === "coach") {
      bcRoot.innerText = "Área Clínica";
      bcCurrent.innerText = "Dashboard Coach";
      loadCoachDashboard();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // DETECTOR DE CLICKS IMPULSIVOS (TCC Trigger)
  // ==========================================
  document.body.addEventListener("click", () => {
    if (!stOverlay.classList.contains("hidden") || !appState.userProfile.completedIntake) {
      return;
    }

    const now = Date.now();
    appState.clickTimestamps.push(now);
    appState.clickTimestamps = appState.clickTimestamps.filter(t => now - t < 5000);

    if (appState.clickTimestamps.length > 3) {
      appState.clickTimestamps = [];
      triggerStopAndThink("¡Pausa un segundo! Has hecho múltiples clics rápidos. Tu cerebro quiere ir más rápido que la app.");
    }
  });

  // ==========================================
  // DETONANTE DE "PARAR Y PENSAR" (Stop & Think)
  // ==========================================
  let reflectionResponses = {};

  function triggerStopAndThink(messageText) {
    pauseTimer();
    stOverlay.classList.remove("hidden");
    stStepBreathing.classList.remove("hidden");
    stStepReflection.classList.add("hidden");
    stStepCompletion.classList.add("hidden");

    let progress = 0;
    breathProgress.style.width = "0%";
    
    let breathCycle = 0;
    const breathInterval = setInterval(() => {
      breathCycle += 1;
      if (breathCycle % 8 === 0 || breathCycle % 8 === 1 || breathCycle % 8 === 2 || breathCycle % 8 === 3) {
        breathText.innerText = "Inhala...";
      } else {
        breathText.innerText = "Exhala...";
      }
    }, 1000);

    const progressInterval = setInterval(() => {
      progress += 100 / 15;
      breathProgress.style.width = `${Math.min(progress, 100)}%`;

      if (progress >= 100) {
        clearInterval(progressInterval);
        clearInterval(breathInterval);
        stStepBreathing.classList.add("hidden");
        stStepReflection.classList.remove("hidden");
        
        // Registrar respiración en backend
        apiPost('/api/adherence', { metric: 'breathingExercisesDone' });
        appState.userProfile.breathsDone = (appState.userProfile.breathsDone || 0) + 1;
        document.getElementById("stat-breaths").innerText = appState.userProfile.breathsDone;
        saveState();
      }
    }, 1000);
  }

  const reflectButtons = document.querySelectorAll(".btn-reflect");
  reflectButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const parent = e.target.parentElement;
      const siblingButtons = parent.querySelectorAll(".btn-reflect");
      siblingButtons.forEach(b => b.classList.remove("selected"));
      e.target.classList.add("selected");
      
      const questionCard = parent.parentElement;
      const questionLabel = questionCard.querySelector(".q-label").innerText;
      reflectionResponses[questionLabel] = e.target.getAttribute("data-value");

      if (Object.keys(reflectionResponses).length >= 2) {
        btnSubmitReflection.removeAttribute("disabled");
      }
    });
  });

  btnSubmitReflection.addEventListener("click", () => {
    stStepReflection.classList.add("hidden");
    stStepCompletion.classList.remove("hidden");
  });

  btnCloseOverlay.addEventListener("click", () => {
    stOverlay.classList.add("hidden");
    reflectionResponses = {};
    btnSubmitReflection.setAttribute("disabled", "true");
    reflectButtons.forEach(b => b.classList.remove("selected"));
    
    if (appState.userProfile.completedIntake) {
      showView("dashboard");
    }
  });

  // ==========================================
  // FLUJO DE ONBOARDING (ASRS, CAMH, WFIRS)
  // ==========================================
  const asrsQuestions = [
    "1. ¿Con qué frecuencia tienes dificultad para terminar los detalles finales de un proyecto, una vez que las partes difíciles ya se han hecho?",
    "2. ¿Con qué frecuencia tienes dificultad para organizar las cosas cuando tienes que hacer una tarea que requiere organización?",
    "3. ¿Con qué frecuencia tienes problemas para recordar citas u obligaciones?",
    "4. ¿Con qué frecuencia evitas o retrasas comenzar una tarea que requiere mucho pensamiento y concentración?",
    "5. ¿Con qué frecuencia mueves o retuerces las manos o los pies cuando tienes que estar sentado durante mucho tiempo?",
    "6. ¿Con qué frecuencia te sientes demasiado activo y obligado a hacer cosas, como si fueras impulsado por un motor?"
  ];

  let currentAsrsIndex = 0;
  let tempAsrsAnswers = [];

  function renderAsrsQuestion() {
    if (currentAsrsIndex >= asrsQuestions.length) {
      document.getElementById("wizard-asrs").classList.add("hidden");
      document.getElementById("wizard-camh").classList.remove("hidden");
      updateWizardSteps(2);
      return;
    }

    asrsCurrentDisplay.innerText = currentAsrsIndex + 1;
    asrsContainer.innerHTML = `
      <div class="asrs-card-container">
        <h4 class="asrs-question-text">${asrsQuestions[currentAsrsIndex]}</h4>
        <div class="asrs-options-grid">
          ${["Nunca", "Rara vez", "A veces", "A menudo", "Con mucha frecuencia"].map(opt => `
            <button class="btn-option" data-option="${opt}">${opt}</button>
          `).join('')}
        </div>
      </div>
    `;

    const options = asrsContainer.querySelectorAll(".btn-option");
    options.forEach(optBtn => {
      optBtn.addEventListener("click", (e) => {
        options.forEach(o => o.classList.remove("selected"));
        e.target.classList.add("selected");
        btnAsrsNext.removeAttribute("disabled");
      });
    });
    
    btnAsrsNext.setAttribute("disabled", "true");
  }

  btnAsrsNext.addEventListener("click", () => {
    const selected = asrsContainer.querySelector(".btn-option.selected");
    if (selected) {
      const val = selected.getAttribute("data-option");
      tempAsrsAnswers.push(val);
      
      let isCritical = false;
      if (currentAsrsIndex < 3 && (val === "A veces" || val === "A menudo" || val === "Con mucha frecuencia")) {
        isCritical = true;
      } else if (currentAsrsIndex >= 3 && (val === "A menudo" || val === "Con mucha frecuencia")) {
        isCritical = true;
      }
      
      if (isCritical) {
        appState.userProfile.asrsScore++;
      }

      currentAsrsIndex++;
      renderAsrsQuestion();
    }
  });

  const camhAnswers = {};
  binaryButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const parent = e.target.parentElement;
      const key = e.target.getAttribute("data-key");
      const val = e.target.getAttribute("data-value");
      
      parent.querySelectorAll(".btn-binary").forEach(b => b.classList.remove("selected"));
      e.target.classList.add("selected");
      
      camhAnswers[key] = val;

      if (Object.keys(camhAnswers).length >= 4) {
        btnCamhNext.removeAttribute("disabled");
      }
    });
  });

  btnCamhNext.addEventListener("click", () => {
    document.getElementById("wizard-camh").classList.add("hidden");
    document.getElementById("wizard-wfirs").classList.remove("hidden");
    updateWizardSteps(3);
    appState.userProfile.camhAlerts = Object.values(camhAnswers).filter(v => v === "yes").length;
  });

  btnCamhPrev.addEventListener("click", () => {
    document.getElementById("wizard-camh").classList.add("hidden");
    document.getElementById("wizard-asrs").classList.remove("hidden");
    updateWizardSteps(1);
    currentAsrsIndex = 0;
    tempAsrsAnswers = [];
    appState.userProfile.asrsScore = 0;
    renderAsrsQuestion();
  });

  let selectedWfirsAreas = [];
  wfirsChips.forEach(chip => {
    chip.addEventListener("click", (e) => {
      const area = chip.getAttribute("data-area");
      if (chip.classList.contains("selected")) {
        chip.classList.remove("selected");
        selectedWfirsAreas = selectedWfirsAreas.filter(a => a !== area);
      } else {
        chip.classList.add("selected");
        selectedWfirsAreas.push(area);
      }
    });
  });

  btnWfirsFinish.addEventListener("click", async () => {
    appState.intakeData.asrsAnswers = tempAsrsAnswers;
    appState.intakeData.camhAnswers = camhAnswers;
    appState.intakeData.wfirsAreas = selectedWfirsAreas;
    
    const inputName = document.getElementById("intake-name-input").value.trim();
    const selectCountry = document.getElementById("intake-country-select").value;

    appState.userProfile.name = inputName || "Alex Marín";
    appState.userProfile.country = selectCountry;
    appState.userProfile.kryptoniteArea = selectedWfirsAreas.length > 0 ? selectedWfirsAreas.join(", ") : "Autonomía";
    appState.userProfile.completedIntake = true;

    // Enviar datos al Servidor Express
    await apiPost('/api/profile', {
      name: appState.userProfile.name,
      country: appState.userProfile.country,
      kryptoniteArea: appState.userProfile.kryptoniteArea,
      asrsScore: appState.userProfile.asrsScore,
      camhAlerts: appState.userProfile.camhAlerts,
      intakeData: appState.intakeData
    });

    document.getElementById("client-name-display").innerText = appState.userProfile.name;
    document.getElementById("stat-kryptonite-area").innerText = selectedWfirsAreas[0] || "Autonomía";

    saveState();
    showView("dashboard");
  });

  btnWfirsPrev.addEventListener("click", () => {
    document.getElementById("wizard-wfirs").classList.add("hidden");
    document.getElementById("wizard-camh").classList.remove("hidden");
    updateWizardSteps(2);
  });

  function updateWizardSteps(activeStep) {
    document.querySelectorAll(".w-step").forEach(step => {
      const sNum = parseInt(step.getAttribute("data-step"));
      if (sNum === activeStep) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }

  // ==========================================
  // INICIALIZACIÓN ASÍNCRONA
  // ==========================================
  async function initializeFocusFlow() {
    // Chequear retorno de pagos antes de inicializar vistas
    await checkPaymentReturn();

    // 1. Si el cliente ya completó el intake localmente, confiar e ir directo al Dashboard
    if (appState.userProfile.completedIntake) {
      document.getElementById("client-name-display").innerText = appState.userProfile.name;
      const area = appState.userProfile.kryptoniteArea ? appState.userProfile.kryptoniteArea.split(", ")[0] : "Autonomía";
      document.getElementById("stat-kryptonite-area").innerText = area;
      document.getElementById("stat-breaths").innerText = appState.userProfile.breathsDone || 0;
      showView("dashboard");

      // Sincronizar en segundo plano con el servidor
      apiGet('/api/profile').then(profile => {
        if (!profile || !profile.completedIntake) {
          apiPost('/api/profile', {
            name: appState.userProfile.name,
            country: appState.userProfile.country || 'ARG',
            kryptoniteArea: appState.userProfile.kryptoniteArea,
            asrsScore: appState.userProfile.asrsScore,
            camhAlerts: appState.userProfile.camhAlerts,
            intakeData: appState.intakeData
          });
        }
      });
    } else {
      // 2. Si no está local, intentar recuperar del servidor
      const profile = await apiGet('/api/profile');
      if (profile && profile.completedIntake) {
        appState.userProfile = profile;
        document.getElementById("client-name-display").innerText = appState.userProfile.name;
        const area = appState.userProfile.kryptoniteArea ? appState.userProfile.kryptoniteArea.split(", ")[0] : "Autonomía";
        document.getElementById("stat-kryptonite-area").innerText = area;
        document.getElementById("stat-breaths").innerText = appState.userProfile.breathsDone || 0;
        saveState();
        showView("dashboard");
      } else {
        // Ninguno tiene registro, mostrar onboarding
        showView("intake");
        renderAsrsQuestion();
      }
    }
  }
  initializeFocusFlow();

  // ==========================================
  // REGISTRO EMOCIONAL DIARIO (Check-in)
  // ==========================================
  sliderFrustration.addEventListener("input", (e) => valFrustration.innerText = e.target.value);
  sliderIrritability.addEventListener("input", (e) => valIrritability.innerText = e.target.value);
  sliderSensitivity.addEventListener("input", (e) => valSensitivity.innerText = e.target.value);

  btnGoCheckin.addEventListener("click", () => {
    showView("checkin");
    checkinStep1.classList.remove("hidden");
    checkinStep2.classList.add("hidden");
  });

  btnCheckinToDashboard.addEventListener("click", () => showView("dashboard"));

  btnCheckinToStep2.addEventListener("click", () => {
    checkinStep1.classList.add("hidden");
    checkinStep2.classList.remove("hidden");
  });

  btnCheckinBackStep1.addEventListener("click", () => {
    checkinStep2.classList.add("hidden");
    checkinStep1.classList.remove("hidden");
  });

  let selectedDetonants = [];
  chipDetonants.forEach(chip => {
    chip.addEventListener("click", (e) => {
      const text = chip.getAttribute("data-detonant");
      if (chip.classList.contains("selected")) {
        chip.classList.remove("selected");
        selectedDetonants = selectedDetonants.filter(d => d !== text);
      } else {
        chip.classList.add("selected");
        selectedDetonants.push(text);
      }
    });
  });

  btnCheckinFinish.addEventListener("click", async () => {
    const frustrationVal = parseInt(sliderFrustration.value);
    const irritabilityVal = parseInt(sliderIrritability.value);
    const sensitivityVal = parseInt(sliderSensitivity.value);
    const contextVal = document.getElementById("checkin-context").value;

    const newLog = {
      date: new Date().toLocaleDateString("es-ES", { weekday: 'long' }),
      frustration: frustrationVal,
      irritability: irritabilityVal,
      sensitivity: sensitivityVal,
      detonants: selectedDetonants.length > 0 ? selectedDetonants : ["Ninguno"],
      context: contextVal
    };

    // Guardar en el servidor
    const res = await apiPost('/api/logs', newLog);
    if (res && res.success) {
      if (res.breathsDone !== undefined) {
        appState.userProfile.breathsDone = res.breathsDone;
        document.getElementById("stat-breaths").innerText = res.breathsDone;
      }
    }

    appState.dailyLogs.unshift(newLog);
    saveState();

    chipDetonants.forEach(c => c.classList.remove("selected"));
    selectedDetonants = [];
    document.getElementById("checkin-context").value = "";

    if (frustrationVal >= 8) {
      triggerStopAndThink("Registraste una frustración alta. Vamos a realizar un micro-ejercicio de respiración TCC para calmar tu sistema nervioso.");
    } else {
      showView("dashboard");
    }
  });

  // ==========================================
  // GESTOR DE TAREAS ANTI-PROCRASTINACIÓN (Chunking)
  // ==========================================
  taskInput.addEventListener("input", (e) => {
    const words = e.target.value.trim().split(/\s+/).filter(Boolean);
    if (words.length > 5) {
      taskWarning.classList.remove("hidden");
    } else {
      taskWarning.classList.add("hidden");
    }
  });

  btnAnalyzeTask.addEventListener("click", () => {
    const taskName = taskInput.value.trim();
    if (!taskName) return;

    const microSteps = [
      `1. Preparar espacio y herramientas para "${taskName}" (ej: abrir documentos/web).`,
      `2. Trabajar enfocado en la primera sección simple durante 10 minutos exactos.`,
      `3. Escribir en qué te quedaste y parar para tomar agua.`
    ];

    appState.tasks = microSteps.map((step, idx) => ({
      id: idx,
      title: step,
      completed: false
    }));

    renderMicroSteps();
    chunkingStepsContainer.classList.remove("hidden");
    taskInput.value = "";
    taskWarning.classList.add("hidden");
    
    // Registrar métrica en el backend
    apiPost('/api/adherence', { metric: 'tasksCreated' });

    startStepTimer(0);
  });

  function renderMicroSteps() {
    microStepsList.innerHTML = appState.tasks.map((step, idx) => `
      <li class="step-item ${step.completed ? 'completed' : ''} ${appState.activeStepIndex === idx ? 'active' : ''}" data-idx="${idx}">
        <div class="step-info">
          <div class="step-number">${idx + 1}</div>
          <span class="step-title">${step.title}</span>
        </div>
        ${!step.completed ? `<button class="btn btn-xs btn-secondary btn-step-action" data-idx="${idx}">Hacer</button>` : `<span class="material-icons text-emerald text-sm">done</span>`}
      </li>
    `).join('');

    microStepsList.querySelectorAll(".btn-step-action").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-idx"));
        startStepTimer(idx);
      });
    });
  }

  function startStepTimer(idx) {
    pauseTimer();
    appState.activeStepIndex = idx;
    activeTaskTitle.innerText = appState.tasks[idx].title;
    
    appState.timerSeconds = 600;
    updateTimerDisplay();
    
    activeTimerSection.classList.remove("hidden");
    renderMicroSteps();
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(appState.timerSeconds / 60);
    const seconds = appState.timerSeconds % 60;
    timerText.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    const timeFraction = appState.timerSeconds / 600;
    const dashOffset = 282.7 - (timeFraction * 282.7);
    timerIndicator.style.strokeDashoffset = dashOffset;

    if (appState.timerSeconds <= 120) {
      timerIndicator.classList.add("active-urgent");
    } else {
      timerIndicator.classList.remove("active-urgent");
    }
  }

  function pauseTimer() {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
    appState.timerRunning = false;
    btnTimerToggle.innerText = "Empezar";
    btnTimerToggle.className = "btn btn-emerald btn-sm";
  }

  btnTimerToggle.addEventListener("click", () => {
    if (appState.timerRunning) {
      pauseTimer();
    } else {
      appState.timerRunning = true;
      btnTimerToggle.innerText = "Pausar";
      btnTimerToggle.className = "btn btn-secondary btn-sm";

      appState.timerInterval = setInterval(() => {
        appState.timerSeconds--;
        updateTimerDisplay();

        if (appState.timerSeconds <= 0) {
          completeActiveStep();
        }
      }, 1000);
    }
  });

  btnTimerSkip.addEventListener("click", () => {
    completeActiveStep();
  });

  function completeActiveStep() {
    pauseTimer();
    if (appState.activeStepIndex !== null && appState.tasks[appState.activeStepIndex]) {
      appState.tasks[appState.activeStepIndex].completed = true;
      
      document.getElementById("stat-tasks-done").innerText = parseInt(document.getElementById("stat-tasks-done").innerText) + 1;
      
      // Registrar éxito de Chunking en backend
      apiPost('/api/adherence', { metric: 'tasksCompleted' });

      playPopSound();
      triggerVisualConfetti();

      const nextIdx = appState.activeStepIndex + 1;
      if (nextIdx < appState.tasks.length) {
        startStepTimer(nextIdx);
      } else {
        activeTimerSection.classList.add("hidden");
        chunkingStepsContainer.classList.add("hidden");
        appState.activeStepIndex = null;
        appState.tasks = [];
        alert("¡Excelente! Has completado todas las micro-secciones del bloque.");
      }
      saveState();
    }
  }

  function playPopSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.log("AudioContext bloqueado");
    }
  }

  function triggerVisualConfetti() {
    const confettiCount = 30;
    const body = document.body;
    for (let i = 0; i < confettiCount; i++) {
      const conf = document.createElement("div");
      conf.style.position = "fixed";
      conf.style.zIndex = "9999";
      conf.style.width = `${Math.random() * 8 + 5}px`;
      conf.style.height = `${Math.random() * 8 + 5}px`;
      conf.style.backgroundColor = ["#14b8a6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"][Math.floor(Math.random() * 5)];
      conf.style.left = `${Math.random() * 100}vw`;
      conf.style.top = `-10px`;
      conf.style.borderRadius = "50%";
      conf.style.pointerEvents = "none";
      body.appendChild(conf);

      const animation = conf.animate([
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: `translateY(100vh) translateX(${(Math.random() - 0.5) * 200}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], {
        duration: Math.random() * 1500 + 1000,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      });
      animation.onfinish = () => conf.remove();
    }
  }

  // ==========================================
  // FIDGET ZONE BUBBLES
  // ==========================================
  const bubbles = document.querySelectorAll(".bubble");
  bubbles.forEach(b => {
    b.addEventListener("click", () => {
      if (!b.classList.contains("popped")) {
        b.classList.add("popped");
        playPopSound();
        const allPopped = Array.from(bubbles).every(b => b.classList.contains("popped"));
        if (allPopped) {
          setTimeout(() => {
            bubbles.forEach(b => b.classList.remove("popped"));
          }, 800);
        }
      }
    });
  });

  document.getElementById("btn-reset-fidget").addEventListener("click", () => {
    bubbles.forEach(b => b.classList.remove("popped"));
  });

  document.getElementById("btn-quick-fidget").addEventListener("click", () => {
    showView("dashboard");
    const zone = document.querySelector(".fidget-wrapper");
    zone.scrollIntoView({ behavior: 'smooth' });
    zone.style.outline = "2px solid #14b8a6";
    setTimeout(() => zone.style.outline = "none", 1500);
  });

  // ==========================================
  // REESTRUCTURACIÓN COGNITIVA TCC
  // ==========================================
  const trapThoughts = [
    {
      title: "Todo o nada",
      original: "«Nunca termino lo que empiezo. Soy un completo inútil.»",
      bias: "Sobregeneralización excesiva. El TDAH causa bloqueos de inicio, pero no define tu capacidad de entrega final. Te enfocas solo en las tareas incompletas ignorando tus logros reales.",
      alternative: "«A veces me cuesta terminar ciertos bloques difíciles debido a mi TDAH, pero he completado muchas cosas antes. Dividir mis tareas me ayuda a cerrar proyectos paso a paso.»"
    },
    {
      title: "Identificación de desastre",
      original: "«Soy un desastre desorganizado y siempre lo seré.»",
      bias: "Etiquetado negativo y ceguera temporal. Identificar tu persona entera con un síntoma de inatención aumenta la vergüenza y paraliza tu motivación de intentar organizarte.",
      alternative: "«Mi cerebro procesa la información de forma diferente y desordenada, no soy un desastre. Puedo usar herramientas de externalización física para organizarme mejor.»"
    },
    {
      title: "Culpabilización",
      original: "«Si tuviera más fuerza de voluntad no procrastinaría. Es mi culpa.»",
      bias: "Culpabilización desinformada. El TDAH es un déficit neurobiológico de dopamina, no un fallo moral. Sentir culpa solo incrementa la procrastinación para evadir el dolor emocional.",
      alternative: "«No se trata de fuerza de voluntad; mi cerebro busca estimulación química. Dividir tareas en pasos pequeños baja la barrera dopaminérgica y me permite arrancar.»"
    },
    {
      title: "Catastrofismo vial/financiero",
      original: "«He olvidado esta factura, voy a arruinar mi historial financiero.»",
      bias: "Lectura del futuro y magnificación de errores. Olvidar plazos de pago (ceguera de plazos) es un síntoma clásico de TDAH que puede automatizarse o mitigarse con calendarios sin que defina tu destino financiero.",
      alternative: "«Es un olvido molesto pero reparable. Pagaré la factura ahora, colocaré una alarma persistente y programaré pagos automáticos para evitar olvidos futuros.»"
    },
    {
      title: "Hipersensibilidad al rechazo",
      original: "«Mi jefe hizo una corrección a mi informe; seguro piensa que no valgo nada.»",
      bias: "Sensibilidad al Rechazo Disfórica (RSD). Las personas con TDAH sienten la crítica constructiva como un dolor físico o rechazo absoluto del entorno debido a su desregulación emocional.",
      alternative: "«La corrección es para mejorar el documento, no un juicio sobre mi valor personal. Mi cerebro está amplificando la crítica, pero puedo procesarla con calma.»"
    }
  ];

  let selectedThoughtIndex = null;

  function renderThoughtsList() {
    thoughtsContainer.innerHTML = trapThoughts.map((t, idx) => `
      <div class="thought-card" data-idx="${idx}">
        <h4>${t.title}</h4>
        <p>${t.original}</p>
      </div>
    `).join('');

    thoughtsContainer.querySelectorAll(".thought-card").forEach(card => {
      card.addEventListener("click", (e) => {
        const target = e.currentTarget;
        thoughtsContainer.querySelectorAll(".thought-card").forEach(c => c.classList.remove("selected"));
        target.classList.add("selected");
        
        selectedThoughtIndex = parseInt(target.getAttribute("data-idx"));
        loadReframeProcess(selectedThoughtIndex);
      });
    });
  }

  function loadReframeProcess(idx) {
    const data = trapThoughts[idx];
    originalThoughtText.innerText = data.original;
    biasExplanation.innerText = data.bias;
    alternativeThoughtText.innerText = data.alternative;
    reframeProcessCard.classList.remove("hidden");
    reframeProcessCard.scrollIntoView({ behavior: 'smooth' });
  }

  btnApplyReframe.addEventListener("click", () => {
    if (selectedThoughtIndex !== null) {
      apiPost('/api/adherence', { metric: 'cognitiveRestructurings' });
      appState.adherenceMetrics = appState.adherenceMetrics || {};
      appState.adherenceMetrics.cognitiveRestructurings = (appState.adherenceMetrics.cognitiveRestructurings || 0) + 1;
      
      triggerVisualConfetti();
      playPopSound();
      alert("¡Reestructuración guardada con éxito! Has tomado control de tu pensamiento.");
      
      reframeProcessCard.classList.add("hidden");
      thoughtsContainer.querySelectorAll(".thought-card").forEach(c => c.classList.remove("selected"));
      selectedThoughtIndex = null;
      saveState();
      showView("dashboard");
    }
  });

  document.getElementById("btn-go-restructuring").addEventListener("click", () => {
    showView("restructuring");
    renderThoughtsList();
    reframeProcessCard.classList.add("hidden");
  });

  // ==========================================
  // PANEL DE CONTROL DEL COACH (INTEGRADO AL BACKEND)
  // ==========================================
  async function loadCoachDashboard() {
    const data = await apiGet('/api/coach/dashboard');
    if (!data) return;

    // 1. Ficha del Paciente y Adherencia
    if (data.userProfile) {
      document.getElementById("coach-client-name").innerText = data.userProfile.name;
      const focus = data.userProfile.kryptoniteArea ? data.userProfile.kryptoniteArea.split(", ")[0] : "Autonomía";
      document.getElementById("coach-client-focus").innerText = focus;
    }
    
    // Tasa de Chunking
    const adh = data.adherenceMetrics || { tasksCreated: 0, tasksCompleted: 0 };
    const chunkingRate = adh.tasksCreated > 0 ? Math.round((adh.tasksCompleted / adh.tasksCreated) * 100) : 85;
    document.getElementById("coach-adh-chunking").innerText = `${chunkingRate}%`;
    document.getElementById("bar-adh-chunking").style.width = `${chunkingRate}%`;

    // Tasa de respiraciones guiadas (Stop & Think)
    const breathsDone = adh.breathingExercisesDone || 0;
    const breathingRate = Math.min(100, Math.round((breathsDone / 12) * 100)); // meta de 12
    document.getElementById("coach-adh-breathing").innerText = `${breathingRate}%`;
    document.getElementById("bar-adh-breathing").style.width = `${breathingRate}%`;

    // 2. Gráficos de tendencias
    renderCoachCharts(data.dailyLogs);

    // 3. Alertas
    renderCoachAlerts(data.alerts);
  }

  function renderCoachCharts(dailyLogs) {
    const canvas = document.getElementById("symptomsChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Unir registros reales con los de simulación del seedData
    const logs = [...dailyLogs].reverse();
    const defaultData = window.seedData ? window.seedData.dailyLogs : [];
    
    // Configurar 7 días
    const chartData = [...defaultData];
    if (logs.length > 0) {
      logs.forEach((l, i) => {
        if (i < 3) {
          chartData[chartData.length - 1 - i] = {
            date: l.date.substring(0, 3),
            frustration: l.frustration,
            irritability: l.irritability
          };
        }
      });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - paddingRight, height - paddingBottom);
    ctx.stroke();

    for (let i = 1; i <= 5; i++) {
      const y = height - paddingBottom - (chartHeight * (i / 5));
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = "10px Outfit";
      ctx.fillText(i * 2, paddingLeft - 18, y + 3);
    }

    const pointsCount = chartData.length;
    const stepX = chartWidth / (pointsCount - 1);
    const frustrationPoints = [];
    const irritabilityPoints = [];
    
    chartData.forEach((d, idx) => {
      const x = paddingLeft + (idx * stepX);
      const yFrust = height - paddingBottom - (chartHeight * (d.frustration / 10));
      const yIrrit = height - paddingBottom - (chartHeight * (d.irritability / 10));
      
      frustrationPoints.push({ x, y: yFrust });
      irritabilityPoints.push({ x, y: yIrrit });

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Outfit";
      ctx.textAlign = "center";
      ctx.fillText(d.date.substring(0, 3), x, height - paddingBottom + 18);
    });

    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(frustrationPoints[0].x, frustrationPoints[0].y);
    for (let i = 1; i < frustrationPoints.length; i++) {
      ctx.lineTo(frustrationPoints[i].x, frustrationPoints[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = "#14b8a6";
    frustrationPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(irritabilityPoints[0].x, irritabilityPoints[0].y);
    for (let i = 1; i < irritabilityPoints.length; i++) {
      ctx.lineTo(irritabilityPoints[i].x, irritabilityPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#f43f5e";
    irritabilityPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "#14b8a6";
    ctx.fillText("■ Frustración", paddingLeft + 10, paddingTop + 10);
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("■ Irritabilidad", paddingLeft + 90, paddingTop + 10);
  }

  function renderCoachAlerts(alerts) {
    alertsList.innerHTML = alerts.map(a => `
      <div class="alert-row ${a.severity}">
        <div class="alert-icon-wrap">
          <span class="material-icons">${a.severity === 'critical' ? 'error' : 'warning'}</span>
        </div>
        <div class="alert-body">
          <h4>${a.type}</h4>
          <p>${a.message}</p>
        </div>
        <div class="alert-date">${a.date}</div>
      </div>
    `).join('');
  }

  // Eventos de roles
  roleClientBtn.addEventListener("click", () => {
    roleCoachBtn.classList.remove("active");
    roleClientBtn.classList.add("active");
    appState.role = "client";
    showView("dashboard");
  });

  roleCoachBtn.addEventListener("click", () => {
    roleClientBtn.classList.remove("active");
    roleCoachBtn.classList.add("active");
    appState.role = "coach";
    showView("coach");
  });

  // ==========================================
  // PERSISTENCIA DEL ESTADO LOCAL
  // ==========================================
  function saveState() {
    localStorage.setItem("focusflow_state", JSON.stringify({
      userProfile: appState.userProfile,
      intakeData: appState.intakeData,
      dailyLogs: appState.dailyLogs,
      adherenceMetrics: appState.adherenceMetrics
    }));
  }

  // ==========================================
  // INTEGRACIÓN DE MERCADO PAGO LÓGICA
  // ==========================================
  function updatePremiumUI() {
    if (appState.userProfile.premium) {
      const plan = appState.userProfile.premiumPlan || 'coach';
      const isCoach = plan === 'coach';
      
      const coachProfiles = {
        ARG: { name: "Lic. Martina Silva", phone: "5491122334455", email: "msilva.coach@focusflow.com" },
        MEX: { name: "Lic. Javier Ruiz", phone: "5215512345678", email: "jruiz.coach@focusflow.com" },
        ESP: { name: "Lic. Laura Gómez", phone: "34612345678", email: "lgomez.coach@focusflow.com" },
        COL: { name: "Lic. Andrés Felipe", phone: "573001234567", email: "afelipe.coach@focusflow.com" },
        OTHER: { name: "Lic. Clara Medina (Internacional)", phone: "5491199887766", email: "cmedina.coach@focusflow.com" }
      };

      if (premiumStatusArea) {
        if (isCoach) {
          const country = appState.userProfile.country || 'ARG';
          const coach = coachProfiles[country] || coachProfiles.OTHER;
          
          premiumStatusArea.innerHTML = `
            <span class="badge badge-emerald" style="background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; display: inline-block;">PLAN COACH PREMIUM ACTIVO</span>
            <p class="text-sm mt-2 text-muted" style="font-size: 0.75rem; line-height: 1.3;">Asignado a: <strong>${coach.name}</strong>. Ponte en contacto con tu profesional:</p>
            
            <div class="d-flex flex-col gap-2 mt-3">
              <a href="https://wa.me/${coach.phone}?text=Hola%20${encodeURIComponent(coach.name)},%20me%20pongo%20en%20contacto%20contigo%20para%20coordinar%20una%20consulta%20de%20acompa%C3%B1amiento%20para%20TDAH.%20%C2%A1Muchas%20gracias!" target="_blank" class="btn btn-xs btn-primary btn-full-width" style="background-color: #25d366; border: none; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 0; font-weight: 600; color: #fff; border-radius: 6px;">
                <span class="material-icons" style="font-size: 1rem;">chat</span> WhatsApp de ${coach.name.split(" ")[1]}
              </a>
              
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=${coach.email}&su=Consulta%20de%20acompa%C3%B1amiento%20para%20TDAH&body=Hola%20${encodeURIComponent(coach.name)},%20me%20gustar%C3%ADa%20coordinar%20una%20consulta%20de%20acompa%C3%B1amiento." target="_blank" class="btn btn-xs btn-secondary btn-full-width" style="display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 0; font-weight: 600; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); background: rgba(234, 67, 53, 0.1); color: #fca5a5;">
                <span class="material-icons" style="font-size: 1rem; color: #ea4335;">mail</span> Redactar en Gmail
              </a>

              <a href="https://outlook.live.com/mail/0/deeplink/compose?to=${coach.email}&subject=Consulta%20de%20acompa%C3%B1amiento%20para%20TDAH&body=Hola%20${encodeURIComponent(coach.name)},%20me%20gustar%C3%ADa%20coordinar%20una%20consulta%20de%20acompa%C3%B1amiento." target="_blank" class="btn btn-xs btn-secondary btn-full-width" style="display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 0; font-weight: 600; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); background: rgba(0, 120, 212, 0.1); color: #93c5fd;">
                <span class="material-icons" style="font-size: 1rem; color: #0078d4;">mail</span> Redactar en Outlook/Hotmail
              </a>

              <a href="mailto:${coach.email}?subject=Consulta%20de%20acompa%C3%B1amiento%20para%20TDAH" class="btn btn-xs btn-secondary btn-full-width" style="display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 0; font-weight: 600; border-radius: 6px; font-size: 0.7rem; opacity: 0.6;">
                <span class="material-icons" style="font-size: 0.9rem;">open_in_new</span> Abrir cliente local (mailto)
              </a>
            </div>
          `;
        } else {
          premiumStatusArea.innerHTML = `
            <span class="badge badge-emerald" style="background-color: rgba(20, 184, 166, 0.15); color: #14b8a6; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; display: inline-block;">PLAN AUTO-GUÍA ACTIVO</span>
            <p class="text-sm mt-3 text-muted" style="font-size: 0.75rem; line-height: 1.4;">Acceso completo desbloqueado a las herramientas TCC, Fidget Zone y temporizador anti-parálisis sin coach.</p>
          `;
        }
      }
    }
  }

  async function checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const plan = params.get("plan") || 'coach';
      const res = await apiPost('/api/profile/premium', { plan });
      if (res && res.success) {
        appState.userProfile.premium = true;
        appState.userProfile.premiumPlan = plan;
      } else {
        appState.userProfile.premium = true;
        appState.userProfile.premiumPlan = plan;
      }
      saveState();

      if (paymentSuccessModal) {
        // Personalizar el modal según el plan comprado
        const isCoach = plan === 'coach';
        paymentSuccessModal.querySelector("h2").innerText = isCoach ? "¡Suscripción Coach Activa!" : "¡Plan Auto-Guía Activo!";
        paymentSuccessModal.querySelector("p").innerText = isCoach 
          ? "Tu pago en Mercado Pago ha sido aprobado. Los canales de comunicación con tu coach asignado han sido habilitados de inmediato."
          : "Tu pago en Mercado Pago ha sido aprobado. Todas las funciones de la aplicación han sido desbloqueadas.";
        
        paymentSuccessModal.classList.remove("hidden");
      }
      
      // Limpiar parámetros de la URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    updatePremiumUI();
  }

  async function handleSubscription(plan, buttonEl) {
    buttonEl.innerText = "Cargando...";
    buttonEl.setAttribute("disabled", "true");
    
    const host = window.location.origin;
    const res = await apiPost('/api/checkout/mercadopago', { host, plan });
    
    buttonEl.innerText = plan === 'app' ? "Adquirir Solo App" : "Adquirir con Coach";
    buttonEl.removeAttribute("disabled");
    
    if (res && res.init_point) {
      window.location.href = res.init_point;
    } else if (res && res.simulated_url) {
      const confirmSim = confirm(
        "Mercado Pago está en modo Sandbox sin credenciales reales de producción configuradas.\n\n" +
        "¿Deseas simular un pago aprobado automáticamente para probar las funciones de este plan?"
      );
      if (confirmSim) {
        // Activar premium en el backend de forma asíncrona
        apiPost('/api/profile/premium', { plan });
        
        // Activar premium localmente al instante sin recargar la página
        appState.userProfile.premium = true;
        appState.userProfile.premiumPlan = plan;
        saveState();
        updatePremiumUI();
        
        // Mostrar modal de éxito
        if (paymentSuccessModal) {
          const isCoach = plan === 'coach';
          paymentSuccessModal.querySelector("h2").innerText = isCoach ? "¡Suscripción Coach Activa!" : "¡Plan Auto-Guía Activo!";
          paymentSuccessModal.querySelector("p").innerText = isCoach 
            ? "Tu pago en Mercado Pago ha sido aprobado. Los canales de comunicación con tu coach asignado han sido habilitados de inmediato."
            : "Tu pago en Mercado Pago ha sido aprobado. Todas las funciones de la aplicación han sido desbloqueadas.";
          paymentSuccessModal.classList.remove("hidden");
        }
      }
    } else {
      alert("No se pudo iniciar el pago con Mercado Pago. Por favor intenta de nuevo.");
    }
  }

  if (btnSubscribeApp) {
    btnSubscribeApp.addEventListener("click", () => handleSubscription('app', btnSubscribeApp));
  }

  if (btnSubscribeCoach) {
    btnSubscribeCoach.addEventListener("click", () => handleSubscription('coach', btnSubscribeCoach));
  }

  if (btnClosePaymentModal) {
    btnClosePaymentModal.addEventListener("click", () => {
      paymentSuccessModal.classList.add("hidden");
      updatePremiumUI();
    });
  }

});
