const pool = require("../../config/database");

// Resumo geral — cards do topo do dashboard
const getSummary = async (req, res, next) => {
  try {
    const [patients, pendingPayments, todaySessions] = await Promise.all([
      // Total de pacientes ativos
      pool.query(`
        SELECT COUNT(*) AS total
        FROM patients
        WHERE active = true
      `),

      // Sessões com pagamento pendente
      pool.query(`
  SELECT COUNT(DISTINCT s.id) AS total
  FROM sessions s
  LEFT JOIN payments p ON p.session_id = s.id
  WHERE s.status = 'Realizada' 
        AND p.id IS NULL
      `),

      // Sessões agendadas para hoje
      pool.query(`
  SELECT COUNT(*) AS total
  FROM sessions
  WHERE DATE(session_date) = CURRENT_DATE
  AND status != 'Cancelada' -- ⬅️ O segredo está aqui!
`),
    ]);

    res.json({
      activePatients: parseInt(patients.rows[0].total),
      pendingPayments: parseInt(pendingPayments.rows[0].total),
      todaySessions: parseInt(todaySessions.rows[0].total),
    });
  } catch (err) {
    next(err);
  }
};

// Sessões de hoje com dados do paciente
const getToday = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.session_date,
        s.status,
        s.session_number,
        s.duration_minutes,
        p.name        AS patient_name,
        p.phone       AS patient_phone,
        p.address     AS patient_address,
        tp.title      AS plan_title,
        tp.total_sessions,
        COALESCE(pay.id::boolean, false) AS paid
      FROM sessions s
      JOIN patients        p  ON p.id  = s.patient_id
      JOIN treatment_plans tp ON tp.id = s.treatment_plan_id
      LEFT JOIN payments   pay ON pay.session_id = s.id
      WHERE DATE(s.session_date) = CURRENT_DATE
      ORDER BY s.session_date ASC
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getToday };
