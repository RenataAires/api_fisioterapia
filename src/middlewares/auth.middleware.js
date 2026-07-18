const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.'});    
    }

    const parts = authHeader.split(' ');
    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id;
        req.userRole = decoded.role;

        return next();

    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente'});
    }
};

// 🔒 Middleware para checar o cargo (role)
const verificarRole = (rolesPermitidas) => {
    return (req, res, next) => {
       
        if (!req.userRole || !rolesPermitidas.includes(req.userRole)) {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para esta ação.' });
        }
        next();
    };
};

module.exports = { authMiddleware, verificarRole };