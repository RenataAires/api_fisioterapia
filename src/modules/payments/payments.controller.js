const pool = require('../../config/database');

const paymentsController = {
    // ── 1. REGISTRAR NOVO PAGAMENTO ──
    async registerPayment(req, res, next) {
        try {
            const { 
                patient_id, 
                treatment_plan_id = null, // Pode ser null se for sessão avulsa
                session_id = null,        // Pode ser null se for pacote fechado
                amount, 
                payment_method, 
                payment_date, 
                notes 
            } = req.body;

            // 🔑 Quem recebeu o dinheiro? (Auditoria)
            const created_by = req.userId;

            // Validação de segurança: Dinheiro não aceita dados vazios!
            if (!patient_id || !amount || !payment_method || !payment_date) {
                return res.status(400).json({ error: 'Paciente, valor, método e data são obrigatórios para o faturamento.' });
            }

            const newPayment = await pool.query(
                `INSERT INTO payments 
                (patient_id, treatment_plan_id, session_id, amount, payment_method, payment_date, notes, created_by) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING *`,
                [patient_id, treatment_plan_id, session_id, amount, payment_method, payment_date, notes, created_by]
            );

            res.status(201).json({
                message: 'Pagamento registrado com sucesso! O caixa agradece.',
                payment: newPayment.rows[0]
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
                [patientId]
            );

            // Bônus de Engenharia: Vamos calcular o total que esse paciente já gastou na clínica!
            const totalSpent = result.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

            res.status(200).json({
                total_revenue_from_patient: totalSpent,
                history: result.rows
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = paymentsController;