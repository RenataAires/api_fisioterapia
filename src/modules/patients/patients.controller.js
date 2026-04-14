const pool = require('../../config/database');

const patientsController = {

    async createPatient(req, res, next) {
        try {
            const { name, phone, birth_date, address, specialty, diagnosis, health_plan, notes, treatment_start_date, treatment_end_date } = req.body;
        
            // ── VALIDAÇÃO DE SEGURANÇA ──
            if (!name || name.trim().length < 3) {
                return res.status(400).json({ error: 'O nome é obrigatório e deve ter pelo menos 3 caracteres.' });
            }
            if (!phone) {
                return res.status(400).json({ error: 'O telefone de contato é obrigatório.' });
            }
            if (!specialty) {
                return res.status(400).json({ error: 'A especialidade (ex: Ortopedia) é obrigatória.' });
            }

            const created_by = req.userId;

            const newPatient = await pool.query(`
                INSERT INTO patients 
                (name, phone, birth_date, address, specialty, diagnosis, health_plan, notes, created_by, treatment_start_date, treatment_end_date, weekly_frequency, treatment_objective) VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
                [name, phone, birth_date, address, specialty, diagnosis, health_plan, notes, created_by, treatment_start_date, treatment_end_date, weekly_frequency, treatment_objective]);

            res.status(201).json({
                message: 'Paciente cadastrado com sucesso!',
                patient: newPatient.rows[0]
            });

        } catch (error) {
            next(error);
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
            const result = await pool.query(
                'SELECT * FROM patients WHERE id = $1 AND active = true', 
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Paciente não encontrado ou está desativado.' });
            }

            res.status(200).json(result.rows[0]);
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