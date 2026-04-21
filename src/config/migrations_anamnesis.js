const pool = require('./database');
require('dotenv').config();

const createAnamnesis = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS anamnesis (
        id                    SERIAL PRIMARY KEY,
        patient_id            INTEGER   NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        created_by            INTEGER   NOT NULL REFERENCES users(id),

        main_complaint        TEXT,
        symptom_onset         TEXT,
        aggravating_factors   TEXT,
        relieving_factors     TEXT,
        previous_treatments   TEXT,

        medical_history       TEXT,
        current_medications   TEXT,
        surgeries_fractures   TEXT,
        has_pain              BOOLEAN   DEFAULT false,
        pain_location         TEXT,

        physical_activity     TEXT,
        profession            TEXT,

        patient_goals         TEXT,
        additional_notes      TEXT,

        lgpd_consent          BOOLEAN   NOT NULL DEFAULT false,
        lgpd_consent_date     TIMESTAMP,

        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Tabela anamnesis criada com sucesso!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
};

createAnamnesis();