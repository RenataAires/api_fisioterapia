const pool = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  const client = await pool.connect();

  try {
    const hashedPassword = await bcrypt.hash('fisio123', 12);

    await client.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Dr. Fisioterapeuta', 'fisio@fisiotech.com', hashedPassword, 'admin']);

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('   Email: fisio@fisiotech.com');
    console.log('   Senha: fisio123');

  } catch (err) {
    console.error('Erro ao criar usuário:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
};

seed();