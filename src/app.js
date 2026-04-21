const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

const app = express();
const sessionsRoutes = require("./modules/sessions/sessions.routes");
const treatmentPlanRoutes = require("./modules/treatment_plans/treatment_plans.routes");
const paymentRoutes = require("./modules/payments/payments.routes");
const techniquesRoutes = require("./modules/techniques/techniques.routes");
const goalsRoutes = require("./modules/goals/goals.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true, // 🚀 ESSENCIAL: Permite o envio de cookies/headers de autenticação
    allowedHeaders: ["Content-Type", "Authorization"], // 🛡️ Segurança: Define quais headers o navegador pode enviar
  }),
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

app.use("/api/sessions", sessionsRoutes);
app.use("/api/treatment-plans", treatmentPlanRoutes);

const authRoutes = require("./modules/auth/auth.routes");
const patientRoutes = require("./modules/patients/patients.routes");

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/techniques", techniquesRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
  });
});

module.exports = app;
