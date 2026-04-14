const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');

const authController = {
    
    // ── RECEITA 1: REGISTRAR (Criar o usuário no banco) ──
    async register(req, res, next) {
        try {
            // 1. Pegamos os dados que você digitou no Postman
            const { name, email, password, role } = req.body;

            // 2. Perguntamos ao banco: "Já existe alguém com esse e-mail?"
            const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            
            // Se a lista de pessoas encontradas for maior que zero, reclamamos!
            if (userExists.rows.length > 0) {
                return res.status(400).json({ error: 'Este e-mail já está em uso.' });
            }

            // 3. A Mágica da Segurança (Bcrypt)
            // O 'salt' é como um tempero secreto que embaralha a senha. 
            // O 'hash' transforma "senha123" em "x8$#k9Lp...", assim ninguém rouba.
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // 4. Guardamos a pessoa de verdade no banco de dados (INSERT)
            const newUser = await pool.query(
                `INSERT INTO users (name, email, password, role) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, name, email, role, active`,
                [name, email, hashedPassword, role || 'admin']
            );

            // 5. Entregamos a resposta verde de sucesso!
            res.status(201).json({
                message: 'Usuário criado com sucesso no banco de dados!',
                user: newUser.rows[0]
            });

        } catch (error) {
            next(error); // Se der erro grave, joga pro app.js cuidar
        }
    },

    // ── RECEITA 2: LOGIN (Entrar no sistema e pegar o crachá) ──
    async login(req, res, next) {
        try {
            // 1. Pegamos o e-mail e senha digitados
            const { email, password } = req.body;

            // 2. Buscamos a pessoa no banco (SELECT)
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            
            // Se a lista for vazia (0), o e-mail não existe.
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas.'});
            }

            // Pegamos os dados do usuário encontrado
            const user = result.rows[0];

            // 3. Verificamos se ele não foi expulso/desativado da clínica
            if (!user.active) {
                return res.status(403).json({ error: 'Usuário desativado. Contate o suporte'});
            }

            // 4. Comparamos a senha que ele digitou com a senha embaralhada do banco
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }

            // 5. A Mágica do Crachá (JWT)
            // Criamos um passe livre que dura 8 horas (lendo do seu arquivo .env)
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }     
            );
            
            // 6. Devolvemos a mensagem de sucesso com o crachá!
            res.status(200).json({
                message: 'Login realizado com sucesso!',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = authController;