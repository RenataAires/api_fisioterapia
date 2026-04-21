    const pool = require('../../config/database');

    const patientsController = {

        async createPatient(req, res, next) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const {
                // Dados básicos
                name, phone, birth_date, address, health_plan,
                specialty, diagnosis,
                // Anamnese
                main_complaint, symptom_onset,
                aggravating_factors, relieving_factors,
                previous_treatments, medical_history,
                current_medications, surgeries_fractures,
                has_pain, pain_location, physical_activity,
                profession, patient_goals, additional_notes,
                lgpd_consent,
                // Plano
                plan_title, total_sessions,
            } = req.body;

            if (!name || name.trim().length < 3) {
                return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres.' });
            }
            if (!phone) {
                return res.status(400).json({ error: 'Telefone é obrigatório.' });
            }

            // 1. Cria o paciente
            const patientResult = await client.query(`
                INSERT INTO patients
                    (name, phone, birth_date, address, health_plan,
                    specialty, diagnosis, created_by)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                RETURNING *
            `, [name, phone, birth_date, address, health_plan,
                specialty, diagnosis, req.userId]);

            const patient = patientResult.rows[0];

            // 2. Cria a anamnese vinculada
            await client.query(`
                INSERT INTO anamnesis
                    (patient_id, created_by, main_complaint, symptom_onset,
                    aggravating_factors, relieving_factors, previous_treatments,
                    medical_history, current_medications, surgeries_fractures,
                    has_pain, pain_location, physical_activity, profession,
                    patient_goals, additional_notes, lgpd_consent, lgpd_consent_date)
                VALUES
                    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                    CASE WHEN $17 THEN NOW() ELSE NULL END)
            `, [patient.id, req.userId, main_complaint, symptom_onset,
                aggravating_factors, relieving_factors, previous_treatments,
                medical_history, current_medications, surgeries_fractures,
                has_pain, pain_location, physical_activity, profession,
                patient_goals, additional_notes, lgpd_consent]);

            // 3. Cria o plano de tratamento
            let plan = null;
            if (plan_title || specialty) {
                const planResult = await client.query(`
                    INSERT INTO treatment_plans
                        (patient_id, created_by, title, total_sessions)
                    VALUES ($1,$2,$3,$4)
                    RETURNING *
                `, [patient.id, req.userId,
                    plan_title || `Plano - ${specialty || 'Geral'}`,
                    total_sessions || null]);

                plan = planResult.rows[0];
            }

            await client.query('COMMIT');
            res.status(201).json({
                message: 'Paciente cadastrado com sucesso!',
                patient,
                plan
            });

        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    },

        async getAllPatients(req, res, next) {
            try {
                const result = await pool.query('SELECT * FROM patients WHERE active = true ORDER BY name ASC');

                res.status(200).json(result.rows);
            } catch (error) {
                next(error);
            }
        },

        // ── BUSCAR UM ÚNICO PACIENTE (Pelo ID) ──
        async getPatientById(req, res, next) {
        try {
            const { id } = req.params;

            const [patient, plans, anamnesis] = await Promise.all([

                pool.query(`
                    SELECT * FROM patients
                    WHERE id = $1 AND active = true
                `, [id]),

                pool.query(`
                    SELECT
                        tp.*,
                        COUNT(s.id) AS sessions_done,
                        COUNT(CASE WHEN pay.id IS NULL THEN s.id END) AS unpaid_sessions
                    FROM treatment_plans tp
                    LEFT JOIN sessions  s   ON s.treatment_plan_id = tp.id
                    LEFT JOIN payments  pay ON pay.session_id = s.id
                    WHERE tp.patient_id = $1
                    GROUP BY tp.id
                    ORDER BY tp.created_at DESC
                `, [id]),

                pool.query(`
                    SELECT * FROM anamnesis
                    WHERE patient_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [id]),

            ]);

            if (patient.rows.length === 0) {
                return res.status(404).json({ error: 'Paciente não encontrado ou está desativado.' });
            }

            res.status(200).json({
                ...patient.rows[0],
                plans: plans.rows,
                anamnesis: anamnesis.rows[0] || null,
            });

        } catch (error) {
            next(error);
        }
    },

        // ── RECEITA 3: ATUALIZAR PACIENTE (Update) ──
        async updatePatient(req, res, next) {
            try {
                const patientId = req.params.id;
                const { name, phone, birth_date, address, specialty, diagnosis, health_plan, notes, treatment_start_date, treatment_end_date, weekly_frequency, treatment_objective } = req.body;

                const checkPatient = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
                if (checkPatient.rows.length === 0) {
                    return res.status(404).json({ error: 'Paciente não encontrado.' });
                }

                const updatedPatient = await pool.query(
                    `UPDATE patients 
                    SET name = $1, phone = $2, birth_date = $3, address = $4, specialty = $5, 
                        diagnosis = $6, health_plan = $7, notes = $8, 
                        treatment_start_date = $9, treatment_end_date = $10, weekly_frequency = $11, treatment_objective = $12,
                        updated_at = NOW() 
                    WHERE id = $13 
                    RETURNING *`,
                    [name, phone, birth_date, address, specialty, diagnosis, health_plan, notes, treatment_start_date, treatment_end_date, weekly_frequency, treatment_objective, patientId]
                );

                res.status(200).json({
                    message: 'Dados do paciente atualizados com sucesso!',
                    patient: updatedPatient.rows[0]
                });

            } catch (error) {
                next(error);
            }
        },

        // ── RECEITA 4: DESATIVAR PACIENTE (Soft Delete) ──
        async deletePatient(req, res, next) {
            try {
                const patientId = req.params.id;

                const checkPatient = await pool.query('SELECT id FROM patients WHERE id = $1', [patientId]);
                if (checkPatient.rows.length === 0) {
                    return res.status(404).json({ error: 'Paciente não encontrado.' });
                }

                await pool.query(
                    'UPDATE patients SET active = false, updated_at = NOW() WHERE id = $1',
                    [patientId]
                );

                res.status(200).json({ message: 'Paciente arquivado/desativado com sucesso!' });

            } catch (error) {
                next(error);
            }
        }
    };

    module.exports = patientsController;