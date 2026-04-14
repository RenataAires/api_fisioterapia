const pool = require('../../config/database');

const sessionsController = {
    // ── 1. REGISTRAR NOVA SESSÃO ──
    // ── 1. REGISTRAR SESSÃO DETALHADA ──
    // ── 1. REGISTRAR SESSÃO DETALHADA ──
   // ── 1. REGISTRAR SESSÃO DETALHADA E VINCULADA AO PLANO ──
    // ── 1. REGISTRAR SESSÃO COM TÉCNICAS (Transação Atômica) ──
    async createSession(req, res, next) {
        // 🚨 Iniciamos a "Cápsula de Segurança" do Banco de Dados
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); // Trava o banco: "Só salve se tudo der certo!"

            const { 
                treatment_plan_id, 
                patient_id, 
                session_date, 
                notes, 
                session_number, 
                duration_minutes, 
                pain_scale_start,
                techniques_used // <-- 📦 A nova sacola com a lista de IDs [1, 7, 15]
            } = req.body;

            const user_id = req.userId; 

            if (!patient_id || !session_date) {
                return res.status(400).json({ error: 'Paciente e data são obrigatórios.' });
            }

            // ── PASSO 1: Salvar a Sessão Principal ──
            const newSession = await client.query(
                `INSERT INTO sessions 
                (patient_id, user_id, session_date, notes, session_number, duration_minutes, pain_scale_start, treatment_plan_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING *`,
                [patient_id, user_id, session_date, notes, session_number, duration_minutes, pain_scale_start, treatment_plan_id]
            );

            // Pegamos o ID da sessão que acabou de nascer!
            const sessionId = newSession.rows[0].id;

            // ── PASSO 2: Salvar a lista de Técnicas ──
            if (techniques_used && techniques_used.length > 0) {
                // Fazemos um loop pela lista [1, 7, 15]...
                for (const techniqueId of techniques_used) {
                    await client.query(
                        `INSERT INTO session_techniques (session_id, technique_id) VALUES ($1, $2)`,
                        [sessionId, techniqueId]
                    );
                }
            }

            await client.query('COMMIT'); // Tudo deu certo! Pode salvar no HD!

            res.status(201).json({
                message: 'Sessão e técnicas registradas com sucesso!',
                session: newSession.rows[0],
                techniques_saved: techniques_used || [] // Mostramos o que foi salvo
            });

        } catch (error) {
            await client.query('ROLLBACK'); // Deu erro? Apaga tudo e protege o banco!
            next(error);
        } finally {
            client.release(); // Libera a conexão para o próximo cliente
        }
    },

    // ── 2. BUSCAR HISTÓRICO DE UM PACIENTE ──
    async getPatientSessions(req, res, next) {
        try {
            const { patientId } = req.params;

            // Busca todas as sessões do paciente e ordena da mais recente para a mais antiga (DESC)
            const result = await pool.query(
                `SELECT * FROM sessions 
                 WHERE patient_id = $1 
                 ORDER BY session_date DESC`,
                [patientId]
            );

            res.status(200).json(result.rows);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = sessionsController;