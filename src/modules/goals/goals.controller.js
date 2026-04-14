const pool = require('../../config/database');

const goalsController = {

    async getAllGoals(req, res, next){
        try {
            const result = await pool.query('SELECT * FROM goals ORDER BY name');
            res.status(200).json(result.rows);
        } catch (error) {
            next(error);
        }
    }

};

module.exports = goalsController;