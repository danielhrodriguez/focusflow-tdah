// Lógica de Control FocusFlow (Acompañante de TDAH en Adultos) - Versión Fullstack
document.addEventListener("DOMContentLoaded", () => {
  console.log("FocusFlow App v1.0.5 cargada correctamente.");
  
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
    onboarding: document.getElementById("view-onboarding"),
    welcome: document.getElementById("view-welcome"),
    intake: document.getElementById("view-intake"),
    dashboard: document.getElementById("view-dashboard"),
    checkin: document.getElementById("view-checkin"),
    restructuring: document.getElementById("view-restructuring"),
    coach: document.getElementById("view-coach"),
    "coach-register": document.getElementById("view-coach-register")
  };

  // Selectores de Autenticación
  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegisterBtn = document.getElementById("tab-register-btn");
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const authErrorMessage = document.getElementById("auth-error-message");
  const btnLogout = document.getElementById("btn-logout");

  // Selectores de Modales de Términos y Privacidad
  const modalTerms = document.getElementById("modal-terms");
  const modalPrivacy = document.getElementById("modal-privacy");
  const linkOpenTerms = document.getElementById("link-open-terms");
  const linkOpenPrivacy = document.getElementById("link-open-privacy");
  const btnCloseTerms = document.getElementById("btn-close-terms");
  const btnClosePrivacy = document.getElementById("btn-close-privacy");
  const btnAgreeTermsClose = document.getElementById("btn-agree-terms-close");
  const btnAgreePrivacyClose = document.getElementById("btn-agree-privacy-close");

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
  
  // Elementos del Simulador Visual de Mercado Pago
  const checkoutSimulationModal = document.getElementById("checkout-simulation-modal");
  const btnCloseSimModal = document.getElementById("btn-close-sim-modal");
  const simPlanTitle = document.getElementById("sim-plan-title");
  const simPlanPrice = document.getElementById("sim-plan-price");
  const simPaymentForm = document.getElementById("sim-payment-form");
  const btnSubmitSimPayment = document.getElementById("btn-submit-sim-payment");

  // ==========================================
  // HELPERS DE CONEXIÓN CON EXPRESS (BACKEND)
  // ==========================================
  async function apiGet(url) {
    try {
      const headers = {};
      const token = localStorage.getItem("focusflow_auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      if (res.status === 401) {
        handleLocalLogout();
        return null;
      }
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Error GET a ${url}, fallback local`, e);
    }
    return null;
  }

  async function apiPost(url, data) {
    try {
      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("focusflow_auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });
      if (res.status === 401) {
        handleLocalLogout();
        return null;
      }
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Error POST a ${url}, fallback local`, e);
    }
    return null;
  }

  // ==========================================
  // ENRUTADOR DE VISTAS (SPA Routing)
  // ==========================================
  function showView(viewName, pushState = true) {
    const token = localStorage.getItem("focusflow_auth_token");
    if (!token && viewName !== "welcome" && viewName !== "coach-register" && viewName !== "onboarding") {
      // Route Guard: Evitar navegación si no está autenticado (mostrando onboarding en primer inicio)
      viewName = localStorage.getItem("focusflow_onboarded_seen") ? "welcome" : "onboarding";
    }

    if (viewName !== "dashboard") {
      pauseTimer();
    }

    Object.keys(views).forEach(key => {
      if (views[key]) views[key].classList.add("hidden");
    });

    if (views[viewName]) {
      views[viewName].classList.remove("hidden");
    }

    if (pushState) {
      window.history.pushState({ view: viewName }, "", `#${viewName}`);
    }

    if (viewName === "onboarding" || viewName === "welcome" || viewName === "coach-register") {
      bcRoot.innerText = "FocusFlow";
      bcCurrent.innerText = viewName === "onboarding" ? "Presentación" : (viewName === "welcome" ? "Bienvenida" : "Registro Clínico");
      if (btnLogout) btnLogout.classList.add("hidden");
      const roleSelector = document.querySelector(".role-selector");
      if (roleSelector) roleSelector.classList.add("hidden");
      const btnQuickFidget = document.getElementById("btn-quick-fidget");
      if (btnQuickFidget) btnQuickFidget.classList.add("hidden");
    } else {
      const btnQuickFidget = document.getElementById("btn-quick-fidget");
      if (btnQuickFidget) btnQuickFidget.classList.remove("hidden");
      
      if (viewName === "intake") {
        bcRoot.innerText = "FocusFlow";
        bcCurrent.innerText = "Onboarding";
        if (btnLogout) btnLogout.classList.remove("hidden");
      } else if (viewName === "dashboard") {
        bcRoot.innerText = "Espacio Personal";
        bcCurrent.innerText = "Workspace";
        if (btnLogout) btnLogout.classList.remove("hidden");
      } else if (viewName === "checkin") {
        bcRoot.innerText = "Espacio Personal";
        bcCurrent.innerText = "Check-in Emocional";
        if (btnLogout) btnLogout.classList.remove("hidden");
      } else if (viewName === "restructuring") {
        bcRoot.innerText = "Espacio Personal";
        bcCurrent.innerText = "TCC: Pensamiento Trampa";
        if (btnLogout) btnLogout.classList.remove("hidden");
      } else if (viewName === "coach") {
        bcRoot.innerText = "Área Clínica";
        bcCurrent.innerText = "Dashboard Coach";
        if (btnLogout) btnLogout.classList.remove("hidden");
        loadCoachDashboard();
      }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // CONTROLADOR DE CARROUSEL DE BIENVENIDA (ONBOARDING)
  // ==========================================
  let currentOnboardingSlide = 1;
  const btnOnboardingSkip = document.getElementById("btn-onboarding-skip");
  const btnOnboardingNext = document.getElementById("btn-onboarding-next");
  const onboardingBtnText = document.getElementById("onboarding-btn-text");
  const onboardingBtnIcon = document.getElementById("onboarding-btn-icon");
  const onboardingSlides = document.querySelectorAll(".onboarding-slide");
  const onboardingDots = document.querySelectorAll(".onboarding-dots .dot");

  function updateOnboardingSlide(slideNum) {
    currentOnboardingSlide = slideNum;
    onboardingSlides.forEach(slide => {
      if (parseInt(slide.dataset.slide) === slideNum) {
        slide.classList.add("active");
      } else {
        slide.classList.remove("active");
      }
    });

    onboardingDots.forEach(dot => {
      if (parseInt(dot.dataset.dot) === slideNum) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });

    if (slideNum === 3) {
      if (onboardingBtnText) onboardingBtnText.innerText = "Ingresar a FocusFlow";
      if (onboardingBtnIcon) onboardingBtnIcon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
    } else {
      if (onboardingBtnText) onboardingBtnText.innerText = "Siguiente";
      if (onboardingBtnIcon) onboardingBtnIcon.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>';
    }
  }

  if (btnOnboardingNext) {
    btnOnboardingNext.addEventListener("click", () => {
      if (currentOnboardingSlide < 3) {
        updateOnboardingSlide(currentOnboardingSlide + 1);
      } else {
        finishOnboarding();
      }
    });
  }

  if (btnOnboardingSkip) {
    btnOnboardingSkip.addEventListener("click", () => {
      finishOnboarding();
    });
  }

  onboardingDots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      const targetDot = parseInt(e.currentTarget.dataset.dot);
      if (targetDot) updateOnboardingSlide(targetDot);
    });
  });

  function finishOnboarding() {
    localStorage.setItem("focusflow_onboarded_seen", "true");
    showView("welcome");
  }

  const btnReopenOnboarding = document.getElementById("btn-reopen-onboarding");
  if (btnReopenOnboarding) {
    btnReopenOnboarding.addEventListener("click", () => {
      updateOnboardingSlide(1);
      showView("onboarding");
    });
  }

  // Soporte de Swipe táctil en móviles para el carrusel
  let touchStartX = 0;
  let touchEndX = 0;
  const slidesWrapper = document.querySelector(".onboarding-slides-wrapper");
  if (slidesWrapper) {
    slidesWrapper.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, false);
    slidesWrapper.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 40) {
        if (currentOnboardingSlide < 3) updateOnboardingSlide(currentOnboardingSlide + 1);
      } else if (touchEndX > touchStartX + 40) {
        if (currentOnboardingSlide > 1) updateOnboardingSlide(currentOnboardingSlide - 1);
      }
    }, false);
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
  // GENERADOR DE RUIDO DE ENFOQUE (Web Audio API)
  // ==========================================
  class NoiseGenerator {
    constructor() {
      this.audioCtx = null;
      this.noiseNode = null;
      this.gainNode = null;
      this.isPlaying = false;
      this.currentType = 'brown'; // 'white', 'brown', 'binaural'
      this.oscillator1 = null;
      this.oscillator2 = null;
    }
    
    init() {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.12; // Volumen bajo de fondo
      this.gainNode.connect(this.audioCtx.destination);
    }
    
    createWhiteNoise() {
      const bufferSize = 2 * this.audioCtx.sampleRate;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      return whiteNoise;
    }
    
    createBrownNoise() {
      const bufferSize = 2 * this.audioCtx.sampleRate;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      const brownNoise = this.audioCtx.createBufferSource();
      brownNoise.buffer = noiseBuffer;
      brownNoise.loop = true;
      return brownNoise;
    }
    
    createBinauralBeats() {
      this.oscillator1 = this.audioCtx.createOscillator();
      this.oscillator1.type = 'sine';
      this.oscillator1.frequency.value = 150; // 150Hz oído izquierdo
      
      this.oscillator2 = this.audioCtx.createOscillator();
      this.oscillator2.type = 'sine';
      this.oscillator2.frequency.value = 155; // 155Hz oído derecho -> 5Hz Theta
      
      const gain1 = this.audioCtx.createGain();
      const gain2 = this.audioCtx.createGain();
      gain1.gain.value = 0.5;
      gain2.gain.value = 0.5;
      
      this.oscillator1.connect(gain1);
      this.oscillator2.connect(gain2);
      
      const panner1 = this.audioCtx.createStereoPanner();
      const panner2 = this.audioCtx.createStereoPanner();
      panner1.pan.value = -1;
      panner2.pan.value = 1;
      
      gain1.connect(panner1);
      gain2.connect(panner2);
      
      panner1.connect(this.gainNode);
      panner2.connect(this.gainNode);
      
      this.oscillator1.start();
      this.oscillator2.start();
    }
    
    play(type) {
      if (!this.audioCtx) this.init();
      
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      this.stop();
      this.currentType = type;
      
      if (type === 'white') {
        this.noiseNode = this.createWhiteNoise();
        this.noiseNode.connect(this.gainNode);
        this.noiseNode.start();
      } else if (type === 'brown') {
        this.noiseNode = this.createBrownNoise();
        this.noiseNode.connect(this.gainNode);
        this.noiseNode.start();
      } else if (type === 'binaural') {
        this.createBinauralBeats();
      }
      
      this.isPlaying = true;
    }
    
    stop() {
      if (this.noiseNode) {
        try { this.noiseNode.stop(); } catch(e) {}
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.oscillator1) {
        try { this.oscillator1.stop(); } catch(e) {}
        this.oscillator1.disconnect();
        this.oscillator1 = null;
      }
      if (this.oscillator2) {
        try { this.oscillator2.stop(); } catch(e) {}
        this.oscillator2.disconnect();
        this.oscillator2 = null;
      }
      this.isPlaying = false;
    }
  }

  const noiseGen = new NoiseGenerator();
  let selectedNoiseType = 'brown';

  // Eventos de selección de sonido
  const noiseBtns = document.querySelectorAll(".btn-noise");
  noiseBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      noiseBtns.forEach(b => {
        b.classList.remove("active");
        b.style.border = "none";
        b.style.color = "var(--color-text-secondary)";
      });
      btn.classList.add("active");
      btn.style.border = "1px solid rgba(20, 184, 166, 0.3)";
      btn.style.color = "#fff";
      selectedNoiseType = btn.getAttribute("data-noise");
      
      if (noiseGen.isPlaying) {
        noiseGen.play(selectedNoiseType);
        updateNoiseIndicator();
      }
    });
  });

  const btnNoisePlay = document.getElementById("btn-noise-play");
  const btnNoiseStop = document.getElementById("btn-noise-stop");
  const noiseIndicator = document.getElementById("noise-playing-indicator");
  const noiseTypeText = document.getElementById("noise-playing-type");

  if (btnNoisePlay && btnNoiseStop) {
    btnNoisePlay.addEventListener("click", () => {
      noiseGen.play(selectedNoiseType);
      btnNoisePlay.setAttribute("disabled", "true");
      btnNoiseStop.removeAttribute("disabled");
      updateNoiseIndicator();
    });

    btnNoiseStop.addEventListener("click", () => {
      noiseGen.stop();
      btnNoisePlay.removeAttribute("disabled");
      btnNoiseStop.setAttribute("disabled", "true");
      if (noiseIndicator) noiseIndicator.classList.add("hidden");
    });
  }

  function updateNoiseIndicator() {
    if (noiseIndicator && noiseTypeText) {
      let typeLabel = "Marrón";
      if (selectedNoiseType === 'white') typeLabel = "Blanco";
      if (selectedNoiseType === 'binaural') typeLabel = "Binaurales 5Hz (Theta)";
      noiseTypeText.innerText = typeLabel;
      noiseIndicator.classList.remove("hidden");
      noiseIndicator.style.display = "flex";
    }
  }

  // ==========================================
  // INICIALIZACIÓN ASÍNCRONA
  // ==========================================
  async function initializeFocusFlow() {
    const token = localStorage.getItem("focusflow_auth_token");
    if (!token) {
      if (window.location.hash === "#registro-coach") {
        showView("coach-register");
      } else {
        showView("welcome");
      }
      return;
    }

    // Gestionar visibilidad del selector de roles clínica/paciente
    const roleSelector = document.querySelector(".role-selector");
    if (roleSelector) {
      if (appState.userProfile && appState.userProfile.role === "coach") {
        roleSelector.classList.remove("hidden");
        showView("coach");
        if (roleClientBtn && roleCoachBtn) {
          roleClientBtn.classList.remove("active");
          roleCoachBtn.classList.add("active");
        }
        return;
      } else {
        roleSelector.classList.add("hidden");
      }
    }

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

  function getSemanticMicroSteps(taskName) {
    const text = taskName.toLowerCase();
    
    if (text.includes("limpiar") || text.includes("ordenar") || text.includes("cocina") || text.includes("casa") || text.includes("ropa") || text.includes("habitación") || text.includes("baño")) {
      return [
        `1. Poner alarma de 10 min y despejar la superficie de trabajo más visible (ej: la mesa/cama).`,
        `2. Separar lo que sirve de lo que va al tacho o lavar, en una sola pila sin juzgar.`,
        `3. Guardar las cosas seleccionadas en sus cajas y dar por terminado el primer bloque.`
      ];
    }
    
    if (text.includes("estudiar") || text.includes("leer") || text.includes("aprender") || text.includes("escribir") || text.includes("examen") || text.includes("tarea") || text.includes("informe")) {
      return [
        `1. Sentarse, abrir el material y leer estrictamente el primer párrafo o título.`,
        `2. Escribir a mano en una sola frase lo que entendiste (sin importar el formato).`,
        `3. Cerrar el libro, pararse de la silla por 2 minutos y estirarse.`
      ];
    }
    
    if (text.includes("comprar") || text.includes("compras") || text.includes("super") || text.includes("almacen") || text.includes("tienda")) {
      return [
        `1. Revisar la heladera y escribir en un papelito solo 5 ingredientes clave.`,
        `2. Colocar las llaves, el barbijo/bolsas y la billetera en la mesa principal.`,
        `3. Salir directo hacia la tienda predefinida sin mirar otras vidrieras.`
      ];
    }

    if (text.includes("llamar") || text.includes("mail") || text.includes("correo") || text.includes("mensaje") || text.includes("enviar") || text.includes("escribirle")) {
      return [
        `1. Escribir el mensaje/borrador en un anotador digital simple (sin destinatario puesto).`,
        `2. Copiar y pegar el texto en el mail/chat real y agregar el correo del contacto.`,
        `3. Presionar "Enviar" con los ojos cerrados, cerrar la ventana e ir por un vaso de agua.`
      ];
    }

    if (text.includes("pagar") || text.includes("cuenta") || text.includes("dinero") || text.includes("factura") || text.includes("banco")) {
      return [
        `1. Buscar y abrir la boleta/factura física o digital y dejarla en pantalla.`,
        `2. Ingresar a la web del banco/Mercado Pago y completar el código de barra.`,
        `3. Confirmar la transferencia y guardar el comprobante en una carpeta única.`
      ];
    }

    return [
      `1. Poner un temporizador de 5 minutos y hacer solo la parte más ridícula y pequeña de "${taskName}".`,
      `2. Trabajar enfocado sin mirar el teléfono (ponlo boca abajo o lejos).`,
      `3. Anotar en qué punto te quedaste y tomar un descanso de 2 minutos.`
    ];
  }

  btnAnalyzeTask.addEventListener("click", () => {
    const taskName = taskInput.value.trim();
    if (!taskName) return;

    const microSteps = getSemanticMicroSteps(taskName);

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

  const reframeFormState = document.getElementById("reframe-form-state");
  const reframeSuccessState = document.getElementById("reframe-success-state");
  const reframeSuccessThoughtText = document.getElementById("reframe-success-thought-text");
  const btnReframeFinishGoBack = document.getElementById("btn-reframe-finish-go-back");

  btnApplyReframe.addEventListener("click", () => {
    if (selectedThoughtIndex !== null) {
      apiPost('/api/adherence', { metric: 'cognitiveRestructurings' });
      appState.adherenceMetrics = appState.adherenceMetrics || {};
      appState.adherenceMetrics.cognitiveRestructurings = (appState.adherenceMetrics.cognitiveRestructurings || 0) + 1;
      saveState();

      triggerVisualConfetti();
      playPopSound();

      const data = trapThoughts[selectedThoughtIndex];
      if (reframeSuccessThoughtText) {
        reframeSuccessThoughtText.innerText = data.alternative;
      }
      if (reframeFormState) reframeFormState.classList.add("hidden");
      if (reframeSuccessState) reframeSuccessState.classList.remove("hidden");
    }
  });

  if (btnReframeFinishGoBack) {
    btnReframeFinishGoBack.addEventListener("click", () => {
      reframeProcessCard.classList.add("hidden");
      thoughtsContainer.querySelectorAll(".thought-card").forEach(c => c.classList.remove("selected"));
      selectedThoughtIndex = null;
      
      if (reframeFormState) reframeFormState.classList.remove("hidden");
      if (reframeSuccessState) reframeSuccessState.classList.add("hidden");
      
      showView("dashboard");
    });
  }

  document.getElementById("btn-go-restructuring").addEventListener("click", () => {
    showView("restructuring");
    renderThoughtsList();
    reframeProcessCard.classList.add("hidden");
    
    if (reframeFormState) reframeFormState.classList.remove("hidden");
    if (reframeSuccessState) reframeSuccessState.classList.add("hidden");
  });

  // ==========================================
  // PANEL DE CONTROL DEL COACH (INTEGRADO AL BACKEND)
  // ==========================================
  async function loadCoachDashboard(patientEmail = null) {
    let url = '/api/coach/dashboard';
    if (patientEmail) {
      url += `?patientEmail=${encodeURIComponent(patientEmail)}`;
    }
    const data = await apiGet(url);
    if (!data) return;

    // Poblar el selector de pacientes
    const patientSelect = document.getElementById("coach-patient-select");
    if (patientSelect && data.patients) {
      const activeEmail = data.selectedPatientEmail;
      
      patientSelect.innerHTML = data.patients.map(p => `
        <option value="${p.email}" ${p.email === activeEmail ? 'selected' : ''}>
          ${p.name} (${p.email}) ${p.completedIntake ? '' : '[Pendiente Intake]'}
        </option>
      `).join('');
      
      // Adjuntar listener para cambios en el selector (una sola vez)
      if (!patientSelect.dataset.listenerAttached) {
        patientSelect.addEventListener("change", (e) => {
          loadCoachDashboard(e.target.value);
        });
        patientSelect.dataset.listenerAttached = "true";
      }
    }

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

  let pendingSimPlan = null;

  async function handleSubscription(plan, buttonEl) {
    buttonEl.innerText = "Cargando...";
    buttonEl.setAttribute("disabled", "true");
    
    const host = window.location.origin;
    const res = await apiPost('/api/checkout/mercadopago', { host, plan });
    
    buttonEl.innerText = plan === 'app' ? "Adquirir Solo App" : "Adquirir con Coach";
    buttonEl.removeAttribute("disabled");
    
    if (res && res.init_point) {
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        // En desarrollo local (localhost), abrir simulador para comodidad de pruebas del desarrollador
        pendingSimPlan = plan;
        if (simPlanTitle && simPlanPrice) {
          simPlanTitle.innerText = plan === 'app' ? 'Plan Auto-Guía' : 'Plan Coach Premium';
          simPlanPrice.innerText = plan === 'app' ? '$1.900 ARS' : '$9.900 ARS';
        }
        if (checkoutSimulationModal) {
          checkoutSimulationModal.classList.remove("hidden");
        }
      } else {
        // En producción (Render), redirigir directamente al link de Mercado Pago
        window.location.href = res.init_point;
      }
    } else if (res && res.simulated_url) {
      pendingSimPlan = plan;
      
      if (simPlanTitle && simPlanPrice) {
        simPlanTitle.innerText = plan === 'app' ? 'Plan Auto-Guía' : 'Plan Coach Premium';
        simPlanPrice.innerText = plan === 'app' ? '$1.900 ARS' : '$9.900 ARS';
      }

      if (checkoutSimulationModal) {
        checkoutSimulationModal.classList.remove("hidden");
      }
    } else {
      alert("No se pudo iniciar el pago con Mercado Pago. Por favor intenta de nuevo.");
    }
  }

  // Cerrar el modal del simulador
  if (btnCloseSimModal) {
    btnCloseSimModal.addEventListener("click", () => {
      if (checkoutSimulationModal) {
        checkoutSimulationModal.classList.add("hidden");
      }
    });
  }

  // Procesar formulario de tarjeta simulada
  if (simPaymentForm) {
    simPaymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      if (!btnSubmitSimPayment) return;
      btnSubmitSimPayment.innerText = "Procesando pago en Mercado Pago...";
      btnSubmitSimPayment.setAttribute("disabled", "true");

      // Simular un delay de pasarela bancaria de 1.5 segundos
      setTimeout(async () => {
        const plan = pendingSimPlan || 'coach';
        
        // Activar premium en el backend de forma asíncrona
        await apiPost('/api/profile/premium', { plan });
        
        // Activar premium localmente
        appState.userProfile.premium = true;
        appState.userProfile.premiumPlan = plan;
        saveState();
        updatePremiumUI();
        
        // Restaurar estado del botón
        btnSubmitSimPayment.innerText = "Pagar con Mercado Pago";
        btnSubmitSimPayment.removeAttribute("disabled");

        // Ocultar pasarela simulada
        if (checkoutSimulationModal) {
          checkoutSimulationModal.classList.add("hidden");
        }

        // Mostrar modal de éxito
        if (paymentSuccessModal) {
          const isCoach = plan === 'coach';
          paymentSuccessModal.querySelector("h2").innerText = isCoach ? "¡Suscripción Coach Activa!" : "¡Plan Auto-Guía Activo!";
          paymentSuccessModal.querySelector("p").innerText = isCoach 
            ? "Tu pago en Mercado Pago ha sido aprobado. Los canales de comunicación con tu coach asignado han sido habilitados de inmediato."
            : "Tu pago en Mercado Pago ha sido aprobado. Todas las funciones de la aplicación han sido desbloqueadas.";
          paymentSuccessModal.classList.remove("hidden");
        }
      }, 1500);
    });
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

  // ==========================================
  // MANEJADORES DE ACCESO Y AUTENTICACIÓN
  // ==========================================
  
  if (tabLoginBtn && tabRegisterBtn && formLogin && formRegister) {
    tabLoginBtn.addEventListener("click", () => {
      tabRegisterBtn.classList.remove("active");
      tabRegisterBtn.style.borderBottom = "2px solid transparent";
      tabRegisterBtn.style.color = "var(--color-text-secondary)";
      tabLoginBtn.classList.add("active");
      tabLoginBtn.style.borderBottom = "2px solid var(--color-teal)";
      tabLoginBtn.style.color = "#fff";
      formRegister.classList.add("hidden");
      formLogin.classList.remove("hidden");
      if (authErrorMessage) authErrorMessage.classList.add("hidden");
    });

    tabRegisterBtn.addEventListener("click", () => {
      tabLoginBtn.classList.remove("active");
      tabLoginBtn.style.borderBottom = "2px solid transparent";
      tabLoginBtn.style.color = "var(--color-text-secondary)";
      tabRegisterBtn.classList.add("active");
      tabRegisterBtn.style.borderBottom = "2px solid var(--color-teal)";
      tabRegisterBtn.style.color = "#fff";
      formLogin.classList.add("hidden");
      formRegister.classList.remove("hidden");
      if (authErrorMessage) authErrorMessage.classList.add("hidden");
    });
  }

  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      
      if (authErrorMessage) authErrorMessage.classList.add("hidden");

      const res = await apiPost('/api/auth/login', { username: email, password });
      if (res && res.success && res.token) {
        localStorage.setItem("focusflow_auth_token", res.token);
        appState.userProfile = res.profile;
        saveState();
        
        initializeFocusFlow();
      } else {
        if (authErrorMessage) {
          authErrorMessage.innerText = "Usuario o contraseña incorrectos. Intenta de nuevo.";
          authErrorMessage.classList.remove("hidden");
        }
      }
    });
  }

  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const agreeCheckbox = document.getElementById("register-agree-checkbox");

      if (authErrorMessage) authErrorMessage.classList.add("hidden");

      if (!agreeCheckbox || !agreeCheckbox.checked) {
        if (authErrorMessage) {
          authErrorMessage.innerText = "Debes aceptar los Términos y Condiciones para continuar.";
          authErrorMessage.classList.remove("hidden");
        }
        return;
      }

      const res = await apiPost('/api/auth/register', { username: email, password });
      if (res && res.success && res.token) {
        localStorage.setItem("focusflow_auth_token", res.token);
        
        // Resetear estado local para el nuevo usuario
        appState.userProfile = res.profile;
        appState.intakeData = { asrsAnswers: [], camhAnswers: {}, wfirsAreas: [] };
        appState.dailyLogs = [];
        appState.tasks = [];
        appState.adherenceMetrics = {
          tasksCreated: 0,
          tasksDivided: 0,
          tasksCompleted: 0,
          breathingExercisesDone: 0,
          cognitiveRestructurings: 0,
          premiumUnlocked: false
        };
        saveState();
        
        initializeFocusFlow();
      } else {
        if (authErrorMessage) {
          authErrorMessage.innerText = res && res.error ? res.error : "No se pudo crear la cuenta. El usuario podría ya existir.";
          authErrorMessage.classList.remove("hidden");
        }
      }
    });
  }

  function handleLocalLogout() {
    localStorage.removeItem("focusflow_auth_token");
    
    // Restaurar estado global al valor inicial por defecto
    appState.userProfile = {
      name: "Invitado",
      completedIntake: false,
      kryptoniteArea: "Pendiente",
      asrsScore: 0,
      camhAlerts: 0,
      breathsDone: 0,
      premium: false,
      country: "ARG",
      premiumPlan: null
    };
    appState.dailyLogs = [];
    appState.tasks = [];
    appState.adherenceMetrics = {
      tasksCreated: 0,
      tasksDivided: 0,
      tasksCompleted: 0,
      breathingExercisesDone: 0,
      cognitiveRestructurings: 0,
      premiumUnlocked: false
    };
    saveState();
    
    showView("welcome");
    
    if (formLogin) formLogin.reset();
    if (formRegister) formRegister.reset();
    if (authErrorMessage) authErrorMessage.classList.add("hidden");
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await apiPost('/api/auth/logout', {});
      handleLocalLogout();
    });
  }

  // ==========================================
  // MANEJADORES DE MODALES LEGALES
  // ==========================================
  
  if (linkOpenTerms && modalTerms && btnCloseTerms && btnAgreeTermsClose) {
    linkOpenTerms.addEventListener("click", (e) => {
      e.preventDefault();
      modalTerms.classList.remove("hidden");
    });
    
    const linkOpenTermsCoach = document.getElementById("link-open-terms-coach");
    if (linkOpenTermsCoach) {
      linkOpenTermsCoach.addEventListener("click", (e) => {
        e.preventDefault();
        modalTerms.classList.remove("hidden");
      });
    }

    btnCloseTerms.addEventListener("click", () => {
      modalTerms.classList.add("hidden");
    });
    btnAgreeTermsClose.addEventListener("click", () => {
      modalTerms.classList.add("hidden");
      const checkbox = document.getElementById("register-agree-checkbox");
      if (checkbox) checkbox.checked = true;
      const coachCheckbox = document.getElementById("coach-agree-checkbox");
      if (coachCheckbox) coachCheckbox.checked = true;
    });
  }

  if (linkOpenPrivacy && modalPrivacy && btnClosePrivacy && btnAgreePrivacyClose) {
    linkOpenPrivacy.addEventListener("click", (e) => {
      e.preventDefault();
      modalPrivacy.classList.remove("hidden");
    });

    const linkOpenPrivacyCoach = document.getElementById("link-open-privacy-coach");
    if (linkOpenPrivacyCoach) {
      linkOpenPrivacyCoach.addEventListener("click", (e) => {
        e.preventDefault();
        modalPrivacy.classList.remove("hidden");
      });
    }

    btnClosePrivacy.addEventListener("click", () => {
      modalPrivacy.classList.add("hidden");
    });
    btnAgreePrivacyClose.addEventListener("click", () => {
      modalPrivacy.classList.add("hidden");
      const coachCheckbox = document.getElementById("coach-agree-checkbox");
      if (coachCheckbox) coachCheckbox.checked = true;
    });
  }

  // ==========================================
  // MANEJADORES DE REGISTRO SECRETO DE COACHES
  // ==========================================
  const formCoachRegister = document.getElementById("form-coach-register");
  const coachAuthErrorMessage = document.getElementById("coach-auth-error-message");
  const linkReturnWelcome = document.getElementById("link-return-welcome");

  if (formCoachRegister) {
    formCoachRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const name = document.getElementById("coach-register-name").value.trim();
      const email = document.getElementById("coach-register-email").value.trim();
      const password = document.getElementById("coach-register-password").value;
      const country = document.getElementById("coach-register-country").value;
      const license = document.getElementById("coach-register-license").value.trim();
      
      if (coachAuthErrorMessage) coachAuthErrorMessage.classList.add("hidden");

      const res = await apiPost('/api/auth/register-coach', {
        name,
        username: email,
        password,
        country,
        license
      });

      if (res && res.success && res.token) {
        localStorage.setItem("focusflow_auth_token", res.token);
        appState.userProfile = res.profile;
        saveState();
        
        // Quitar hash para no molestar la navegación normal
        window.location.hash = "";
        
        initializeFocusFlow();
      } else {
        if (coachAuthErrorMessage) {
          coachAuthErrorMessage.innerText = res && res.error ? res.error : "No se pudo registrar la cuenta de profesional.";
          coachAuthErrorMessage.classList.remove("hidden");
        }
      }
    });
  }

  if (linkReturnWelcome) {
    linkReturnWelcome.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = "";
      showView("welcome");
    });
  }

  // Vincular botones "Volver al Dashboard" de la interfaz
  document.querySelectorAll(".btn-back-dashboard").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showView("dashboard");
    });
  });

  // Escuchar el evento popstate del navegador (botón físico Atrás/Adelante)
  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.view) {
      showView(e.state.view, false);
    } else {
      const hash = window.location.hash.replace("#", "");
      if (hash && views[hash]) {
        showView(hash, false);
      } else {
        const token = localStorage.getItem("focusflow_auth_token");
        if (token) {
          showView("dashboard", false);
        } else {
          showView("welcome", false);
        }
      }
    }
  });

  // Escuchar el cambio de hash para navegación secreta
  function checkHashRoute() {
    if (window.location.hash === "#registro-coach") {
      showView("coach-register");
    }
  }
  
  window.addEventListener("hashchange", checkHashRoute);
  // Chequear al cargar la página
  checkHashRoute();

});
