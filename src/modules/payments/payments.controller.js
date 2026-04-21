const pool = require("../../config/database");

const paymentsController = {
  // ── 1. REGISTRAR NOVO PAGAMENTO ──
  async registerPayment(req, res, next) {
    try {
      const {
        patient_id,
        treatment_plan_id = null,
        session_id = null,
        amount,
        payment_method,
        payment_date,
        notes,
      } = req.body;

      const created_by = req.userId;

      if (!patient_id || !amount || !payment_method || !payment_date) {
        return res.status(400).json({
          error: "Paciente, valor, método e data são obrigatórios para o faturamento.",
        });
      }

      const newPayment = await pool.query(
        `INSERT INTO payments 
         (patient_id, treatment_plan_id, session_id, amount, payment_method, payment_date, notes, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (session_id) 
         DO UPDATE SET 
            amount = EXCLUDED.amount, 
            payment_method = EXCLUDED.payment_method,
            payment_date = EXCLUDED.payment_date,
            updated_at = NOW()
         RETURNING *`,
        [patient_id, treatment_plan_id, session_id, amount, payment_method, payment_date, notes, created_by],
      );

      res.status(201).json({
        message: "Pagamento registrado com sucesso! O caixa agradece.",
        payment: newPayment.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },

  // ── 2. EXTRATO FINANCEIRO DO PACIENTE ──
  async getPatientFinancials(req, res, next) {
    try {
      const { patientId } = req.params;

      const result = await pool.query(
        `SELECT * FROM payments 
         WHERE patient_id = $1 
         ORDER BY payment_date DESC`,
        [patientId],
      );

      const totalSpent = result.rows.reduce(
        (sum, payment) => sum + parseFloat(payment.amount),
        0,
      );

      res.status(200).json({
        total_revenue_from_patient: totalSpent,
        history: result.rows,
      });
    } catch (error) {
      next(error);
    }
  },

  // ── 🚀 3. LISTAR PAGAMENTOS PENDENTES (ADICIONADO AQUI) ──
  async getPendingPayments(req, res, next) {
    try {
      const result = await pool.query(
        `SELECT 
            s.id AS session_id, 
            s.session_date, 
            s.session_number,
            s.patient_id,
            s.treatment_plan_id,
            p.name AS patient_name,
            tp.title AS plan_title
         FROM sessions s
         JOIN patients p ON p.id = s.patient_id
         JOIN treatment_plans tp ON tp.id = s.treatment_plan_id
         LEFT JOIN payments pay ON pay.session_id = s.id
         WHERE s.status = 'Realizada' 
         AND pay.id IS NULL 
         ORDER BY s.session_date DESC`
      );

      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  },
}; // <--- Aqui fecha o objeto controller

module.exports = paymentsController;