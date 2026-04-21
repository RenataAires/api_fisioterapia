const pool = require("../../config/database");

const sessionsController = {
  // 1. REGISTRA SESSÃO FEITA NA HORA (POST)
  async createSession(req, res, next) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        treatment_plan_id,
        patient_id,
        session_date,
        session_number,
        duration_minutes,
        pain_scale_start,
        pain_scale_end,
        evolution_status,
        evolution_notes,
        next_goal_id,
        next_goal_custom,
        techniques_used,
        payment_amount,
        payment_method,
      } = req.body;

      const user_id = req.userId;

      if (!patient_id || !treatment_plan_id) {
        return res
          .status(400)
          .json({ error: "Paciente e Plano são obrigatórios." });
      }

      const newSession = await client.query(
        `INSERT INTO sessions
          (patient_id, user_id, treatment_plan_id, session_date, session_number, 
           duration_minutes, pain_scale_start, pain_scale_end, evolution_status, 
           evolution_notes, next_goal_id, next_goal_custom, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, 'Realizada')
         RETURNING *`,
        [
          patient_id,
          user_id,
          treatment_plan_id,
          session_date || new Date(),
          session_number,
          duration_minutes || 45,
          pain_scale_start,
          pain_scale_end,
          evolution_status,
          evolution_notes,
          next_goal_id || null,
          next_goal_custom || null,
        ],
      );

      const sessionId = newSession.rows[0].id;

      if (techniques_used?.length > 0) {
        for (const tid of techniques_used) {
          await client.query(
            "INSERT INTO session_techniques (session_id, technique_id) VALUES ($1, $2)",
            [sessionId, tid],
          );
        }
      }

      // 💰 Lógica de Pagamento Condicional (Pagar Depois)
      // Só entra aqui se o valor existir e for maior que zero
      if (payment_amount && parseFloat(payment_amount) > 0) {
        await client.query(
          `INSERT INTO payments (treatment_plan_id, patient_id, session_id, amount, payment_method, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_id) 
     DO UPDATE SET 
        amount = EXCLUDED.amount, 
        payment_method = EXCLUDED.payment_method,
        updated_at = NOW()`, // 🚀 Lembra que adicionamos essa coluna no SQL?
          [
            treatment_plan_id,
            patient_id,
            id, // ID da sessão
            payment_amount,
            payment_method,
            req.userId,
          ],
        );
      } else {
        // Se caiu aqui, a sessão é marcada como realizada, mas sem registro na tabela de pagamentos
        console.log(`Sessão ${id} finalizada sem pagamento imediato.`);
      }

      // ATUALIZA CONTADOR E STATUS DO PLANO
      await client.query(
        `UPDATE treatment_plans 
         SET sessions_done = (SELECT COUNT(*) FROM sessions WHERE treatment_plan_id = $1 AND status = 'Realizada'),
             status = CASE 
               WHEN total_sessions IS NOT NULL AND (SELECT COUNT(*) FROM sessions WHERE treatment_plan_id = $1 AND status = 'Realizada') >= total_sessions THEN 'Concluído'
               ELSE status 
             END
         WHERE id = $1`,
        [treatment_plan_id],
      );

      await client.query("COMMIT");
      res
        .status(201)
        .json({ message: "Sessão registrada!", session: newSession.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  },

  // 2. ATUALIZA AGENDAMENTO PARA REALIZADA (PUT)
  async updateSession(req, res, next) {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const {
        duration_minutes,
        pain_scale_start,
        pain_scale_end,
        evolution_status,
        evolution_notes,
        next_goal_id,
        next_goal_custom,
        techniques_used,
        payment_amount,
        payment_method,
        treatment_plan_id,
        patient_id,
        session_number, // 🚀 Importante para manter o número correto
      } = req.body;

      await client.query("BEGIN");

      const updatedSession = await client.query(
        `UPDATE sessions
         SET duration_minutes = $1, pain_scale_start = $2, pain_scale_end = $3,
             evolution_status = $4, evolution_notes = $5, next_goal_id = $6,
             next_goal_custom = $7, session_number = $8, status = 'Realizada', updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [
          duration_minutes || 45,
          pain_scale_start,
          pain_scale_end,
          evolution_status,
          evolution_notes,
          next_goal_id || null,
          next_goal_custom || null,
          session_number,
          id,
        ],
      );

      // ATUALIZA CONTADOR E STATUS DO PLANO NO PUT TAMBÉM
      await client.query(
        `UPDATE treatment_plans 
         SET sessions_done = (SELECT COUNT(*) FROM sessions WHERE treatment_plan_id = $1 AND status = 'Realizada'),
             status = CASE 
               WHEN total_sessions IS NOT NULL AND (SELECT COUNT(*) FROM sessions WHERE treatment_plan_id = $1 AND status = 'Realizada') >= total_sessions THEN 'Concluído'
               ELSE status 
             END
         WHERE id = $1`,
        [treatment_plan_id],
      );

      // Sincroniza Técnicas
      await client.query(
        "DELETE FROM session_techniques WHERE session_id = $1",
        [id],
      );
      if (techniques_used?.length > 0) {
        for (const tid of techniques_used) {
          await client.query(
            "INSERT INTO session_techniques (session_id, technique_id) VALUES ($1, $2)",
            [id, tid],
          );
        }
      }

      // 💰 Registro de Pagamento Inteligente (Evita erro de duplicidade)
      if (payment_amount && payment_method) {
        await client.query(
          `INSERT INTO payments (treatment_plan_id, patient_id, session_id, amount, payment_method, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_id) 
     DO UPDATE SET 
        amount = EXCLUDED.amount, 
        payment_method = EXCLUDED.payment_method`,
          [
            treatment_plan_id,
            patient_id,
            id,
            payment_amount,
            payment_method,
            req.userId,
          ],
        );
      }

      await client.query("COMMIT");
      res.status(200).json({
        message: "Sessão concluída!",
        session: updatedSession.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  },

  // MÉTODOS DE BUSCA (Mantidos conforme sua lógica original)
  async getPatientSessions(req, res, next) {
    try {
      const { patientId } = req.params;
      const result = await pool.query(
        `SELECT 
            s.*, 
            g.name AS next_goal_name, 
            p.id AS payment_id,
            p.amount AS payment_amount,
            p.payment_method AS payment_method,
            ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL) AS techniques
         FROM sessions s
         LEFT JOIN goals g ON g.id = s.next_goal_id
         LEFT JOIN session_techniques st ON st.session_id = s.id
         LEFT JOIN techniques t ON t.id = st.technique_id
         LEFT JOIN payments p ON p.session_id = s.id 
         WHERE s.patient_id = $1
         GROUP BY s.id, g.name, p.id, p.amount, p.payment_method
         ORDER BY s.session_date DESC`,
        [patientId],
      );
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  },

  async getSessionById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT s.*, p.name AS patient_name, tp.title AS plan_title, tp.total_sessions,
                g.name AS next_goal_name, ARRAY_AGG(t.name) FILTER (WHERE t.id IS NOT NULL) AS techniques
         FROM sessions s
         JOIN patients p ON p.id = s.patient_id
         JOIN treatment_plans tp ON tp.id = s.treatment_plan_id
         LEFT JOIN goals g ON g.id = s.next_goal_id
         LEFT JOIN session_techniques st ON st.session_id = s.id
         LEFT JOIN techniques t ON t.id = st.technique_id
         WHERE s.id = $1
         GROUP BY s.id, p.name, tp.title, tp.total_sessions, g.name`,
        [id],
      );
      if (!result.rows[0])
        return res.status(404).json({ error: "Sessão não encontrada" });
      res.status(200).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async getByWeek(req, res, next) {
    try {
      const { start, end } = req.query;
      const result = await pool.query(
        `SELECT s.id, s.patient_id, s.session_date, s.duration_minutes, s.status, s.session_number,
                p.name AS patient_name, p.address AS patient_address, p.phone AS patient_phone,
                tp.title AS plan_title, tp.total_sessions
         FROM sessions s
         JOIN patients p ON p.id = s.patient_id
         JOIN treatment_plans tp ON tp.id = s.treatment_plan_id
         WHERE s.session_date BETWEEN $1 AND $2
         ORDER BY s.session_date ASC`,
        [start, end],
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  },

  async scheduleSession(req, res, next) {
    try {
      const {
        patient_id,
        treatment_plan_id,
        session_date,
        duration_minutes,
        session_number,
      } = req.body;
      if (!patient_id || !treatment_plan_id || !session_date) {
        return res
          .status(400)
          .json({ error: "Paciente, plano e data são obrigatórios." });
      }
      const result = await pool.query(
        `INSERT INTO sessions (patient_id, user_id, treatment_plan_id, session_date, duration_minutes, session_number, status)
         VALUES ($1,$2,$3,$4,$5,$6,'Agendada') RETURNING *`,
        [
          patient_id,
          req.userId,
          treatment_plan_id,
          session_date,
          duration_minutes || 45,
          session_number || 1,
        ],
      );
      res
        .status(201)
        .json({ message: "Sessão agendada!", session: result.rows[0] });
    } catch (error) {
      next(error);
    }
  },

  async cancelSession(req, res, next) {
    try {
      const { id } = req.params;
      await pool.query(
        "UPDATE sessions SET status = 'Cancelada' WHERE id = $1",
        [id],
      );
      res.json({ message: "Sessão cancelada!" });
    } catch (error) {
      next(error);
    }
  },

  async signSession(req, res, next) {
    try {
      const { id } = req.params;
      const { signature } = req.body;
      if (!signature)
        return res.status(400).json({ error: "Assinatura é obrigatória." });
      await pool.query(
        "UPDATE sessions SET signature = $1, signed_at = NOW() WHERE id = $2",
        [signature, id],
      );
      res.json({ message: "Assinatura salva!" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = sessionsController;
