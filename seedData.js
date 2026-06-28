// Datos clínicos simulados de la última semana para FocusFlow
// Utilizados en el Panel de Control del Coach para demostrar tendencias longitudinales

const seedData = {
  userProfile: {
    name: "Alex Marín",
    age: 32,
    intakeDate: "2026-06-10",
    primaryFocus: "Trabajo y Finanzas"
  },
  
  // Registros diarios de la última semana
  dailyLogs: [
    { date: "Lunes", frustration: 4, irritability: 3, sensitivity: 2, detonants: ["Sobrecarga de tareas", "Interrupciones"] },
    { date: "Martes", frustration: 8, irritability: 6, sensitivity: 5, detonants: ["Monotonía", "Interrupciones"], triggerStopThink: true },
    { date: "Miércoles", frustration: 9, irritability: 8, sensitivity: 7, detonants: ["Crítica de terceros", "Sobrecarga de tareas"], triggerStopThink: true },
    { date: "Jueves", frustration: 7, irritability: 5, sensitivity: 4, detonants: ["Interrupciones"], triggerStopThink: true },
    { date: "Viernes", frustration: 3, irritability: 2, sensitivity: 2, detonants: ["Ninguno"] },
    { date: "Sábado", frustration: 5, irritability: 4, sensitivity: 3, detonants: ["Monotonía"] },
    { date: "Domingo", frustration: 2, irritability: 1, sensitivity: 1, detonants: ["Ninguno"] }
  ],

  // Tasa de adherencia en el uso de la técnica Chunking (Tareas evitadas vs Iniciadas/Terminadas)
  adherenceMetrics: {
    tasksCreated: 14,
    tasksDivided: 12,
    tasksCompleted: 9, // 75% de las tareas divididas se completaron
    breathingExercisesDone: 8,
    cognitiveRestructurings: 5
  },

  // Alertas JDQ e Indicadores de Riesgos Financieros (Sección 5 & 6 del Reporte de Diseño)
  clinicalAlerts: [
    {
      type: "Frustración Crítica",
      message: "El usuario registró niveles de frustración > 7 durante 3 días consecutivos (Martes, Miércoles, Jueves).",
      severity: "critical",
      date: "Hace 3 días"
    },
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
  ]
};

// Exportar para que esté disponible globalmente
if (typeof module !== 'undefined' && module.exports) {
  module.exports = seedData;
} else {
  window.seedData = seedData;
}
