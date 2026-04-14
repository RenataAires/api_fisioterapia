const pool = require('../../config/database');

const techniquesController = {
    // ── 1. LISTAR TODAS AS TÉCNICAS PARA O APLICATIVO ──
    async getAllTechniques(req, res, next) {
        try {
            // Dica de UX: Usamos ORDER BY para que a lista já chegue 
            // em ordem alfabética no celular do fisioterapeuta!
            const result = await pool.query('SELECT * FROM techniques ORDER BY category, name');
            
            res.status(200).json(result.rows);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = techniquesController;