const pool = require('../../config/database');

const treatmentPlansController = {
    // ── 1. CRIAR NOVO PLANO DE TRATAMENTO ──
    async createPlan(req, res, next) {
        try {
            const { 
                patient_id, 
                title, 
                total_sessions, 
                status = 'Ativo', // Se não enviarem o status, ele entra como 'Ativo'
                started_at,
                notes 
            } = req.body;

            // 🔑 Pegando o ID do Fisioterapeuta logado
            const created_by = req.userId;

            // Validação de segurança
            if (!patient_id || !title || !total_sessions) {
                return res.status(400).json({ error: 'Paciente, título e total de sessões são obrigatórios.' });
            }

            const newPlan = await pool.query(
                `INSERT INTO treatment_plans 
                (patient_id, created_by, title, total_sessions, status, started_at, notes) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING *`,
                [patient_id, created_by, title, total_sessions, status, started_at, notes]
            );

            res.status(201).json({
                message: 'Plano de tratamento criado com sucesso!',
                plan: newPlan.rows[0]
            });
        } catch (error) {
            next(error);
        }
    },

    // ── 2. GERAR RELATÓRIO DE PROGRESSO DO PLANO ──
    async getPlanProgress(req, res, next) {
        try {
            const { id } = req.params; // ID do Plano de Tratamento

            // 1º Passo: Pegar as regras do plano (Quantas sessões são no total?)
            const planResult = await pool.query('SELECT * FROM treatment_plans WHERE id = $1', [id]);
            if (planResult.rows.length === 0) {
                return res.status(404).json({ error: 'Plano não encontrado.' });
            }
            const plan = planResult.rows[0];

            // 2º Passo: Pegar todas as sessões executadas, da mais ANTIGA para a mais NOVA (ASC)
            const sessionsResult = await pool.query(
                'SELECT * FROM sessions WHERE treatment_plan_id = $1 ORDER BY session_date ASC',
                [id]
            );
            const sessions = sessionsResult.rows;

            // 3º Passo: A Mágica dos Dados (Cálculos de Engenharia)
            const completed_sessions = sessions.length;
            const remaining_sessions = plan.total_sessions - completed_sessions;

            // 4º Passo: Calcular a evolução da dor
            let pain_progress = "Aguardando sessões para calcular evolução.";
            
            if (completed_sessions > 0) {
                const initial_pain = sessions[0].pain_scale_start; // Dor na primeira sessão
                const current_pain = sessions[completed_sessions - 1].pain_scale_start; // Dor na sessão mais recente

                pain_progress = {
                    initial_pain: initial_pain,
                    current_pain: current_pain,
                    reduction: initial_pain - current_pain // Se for positivo, a dor diminuiu!
                };
            }

            // 5º Passo: Entregar o relatório mastigado
            res.status(200).json({
                patient_id: plan.patient_id,
                plan_title: plan.title,
                progress: {
                    total: plan.total_sessions,
                    completed: completed_sessions,
                    remaining: remaining_sessions,
                    percentage_completed: Math.round((completed_sessions / plan.total_sessions) * 100) + '%'
                },
                clinical_evolution: pain_progress
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = treatmentPlansController;