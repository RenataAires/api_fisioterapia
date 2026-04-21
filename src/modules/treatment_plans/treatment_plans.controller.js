const pool = require('../../config/database');

const treatmentPlansController = {
    // ── 1. CRIAR NOVO PLANO DE TRATAMENTO ──
    async createPlan(req, res, next) {
        try {
            const { 
                patient_id, 
                title, 
                total_sessions, 
                status = 'Ativo',
                started_at,
                notes,
                base_value = 0,      // 🚀 Adicionado para bater com o Frontend
                transport_fee = 0    // 🚀 Adicionado para bater com o Frontend
            } = req.body;

            const created_by = req.userId;

            if (!patient_id || !title || !total_sessions) {
                return res.status(400).json({ error: 'Paciente, título e total de sessões são obrigatórios.' });
            }

            // Inserimos com sessions_done começando em 0
            const newPlan = await pool.query(
                `INSERT INTO treatment_plans 
                (patient_id, created_by, title, total_sessions, sessions_done, status, started_at, notes, base_value, transport_fee) 
                VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9) 
                RETURNING *`,
                [
                    patient_id, 
                    created_by, 
                    title, 
                    total_sessions, 
                    status, 
                    started_at || new Date(), 
                    notes,
                    base_value,
                    transport_fee
                ]
            );

            res.status(201).json({
                message: 'Plano de tratamento criado com sucesso!',
                plan: newPlan.rows[0]
            });
        } catch (error) {
            next(error);
        }
    },

    // ── 2. GERAR RELATÓRIO DE PROGRESSO (Mantido com melhoria de cálculo) ──
    async getPlanProgress(req, res, next) {
        try {
            const { id } = req.params;

            const planResult = await pool.query('SELECT * FROM treatment_plans WHERE id = $1', [id]);
            if (planResult.rows.length === 0) {
                return res.status(404).json({ error: 'Plano não encontrado.' });
            }
            const plan = planResult.rows[0];

            const sessionsResult = await pool.query(
                'SELECT * FROM sessions WHERE treatment_plan_id = $1 AND status = \'Realizada\' ORDER BY session_date ASC',
                [id]
            );
            const sessions = sessionsResult.rows;

            const completed_sessions = sessions.length;
            const remaining_sessions = Math.max(0, plan.total_sessions - completed_sessions);

            let pain_progress = "Aguardando sessões para calcular evolução.";
            
            if (completed_sessions >= 1) {
                const initial_pain = sessions[0].pain_scale_start;
                const current_pain = sessions[completed_sessions - 1].pain_scale_end; // Usar dor do FIM da última sessão

                pain_progress = {
                    initial_pain,
                    current_pain,
                    reduction: initial_pain - current_pain
                };
            }

            res.status(200).json({
                patient_id: plan.patient_id,
                plan_title: plan.title,
                progress: {
                    total: plan.total_sessions,
                    completed: completed_sessions,
                    remaining: remaining_sessions,
                    percentage_completed: plan.total_sessions > 0 
                        ? Math.round((completed_sessions / plan.total_sessions) * 100) + '%'
                        : '0%'
                },
                clinical_evolution: pain_progress
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = treatmentPlansController;