const pool = require('./database');

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. USUÁRIOS ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100)        NOT NULL,
        email      VARCHAR(150) UNIQUE NOT NULL,
        password   VARCHAR(255)        NOT NULL,
        role       VARCHAR(20)         NOT NULL DEFAULT 'secretary',
        active     BOOLEAN             NOT NULL DEFAULT true,
        created_at TIMESTAMP           NOT NULL DEFAULT NOW()
      );
    `);

    // role: 'admin' = fisioterapeuta, 'secretary' = secretária

    // ── 2. TÉCNICAS ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS techniques (
        id       SERIAL PRIMARY KEY,
        name     VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50)
      );
    `);

    await client.query(`
      INSERT INTO techniques (name, category) VALUES
        ('Cinesioterapia',              'Terapêutica'),
        ('Mobilização Articular',       'Manual'),
        ('Massagem Terapêutica',        'Manual'),
        ('Liberação Miofascial',        'Manual'),
        ('Dry Needling',                'Invasiva'),
        ('Laser Terapêutico',           'Equipamento'),
        ('TENS',                        'Equipamento'),
        ('Ultrassom Terapêutico',       'Equipamento'),
        ('Fortalecimento com Halteres', 'Equipamento'),
        ('RPG',                         'Postural'),
        ('Reeducação Postural',         'Postural'),
        ('Treino de Marcha',            'Neurológica'),
        ('Estimulação Neuromuscular',   'Neurológica'),
        ('Exercícios Respiratórios',    'Respiratória'),
        ('Crioterapia',                 'Terapêutica'),
        ('Termoterapia',                'Terapêutica')
      ON CONFLICT (name) DO NOTHING;
    `);

    // ── 3. OBJETIVOS ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id   SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL
      );
    `);

    await client.query(`
      INSERT INTO goals (name) VALUES
        ('Reduzir dor'),
        ('Reduzir inflamação'),
        ('Melhorar mobilidade articular'),
        ('Fortalecer musculatura'),
        ('Melhorar equilíbrio e coordenação'),
        ('Reeducação da marcha'),
        ('Recuperação pós-cirúrgica'),
        ('Melhorar postura'),
        ('Ganho de amplitude de movimento'),
        ('Reduzir espasmos musculares'),
        ('Melhorar função neurológica'),
        ('Alta fisioterapêutica')
      ON CONFLICT (name) DO NOTHING;
    `);

    // ── 4. PACIENTES ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        phone       VARCHAR(20),
        birth_date  DATE,
        address     TEXT,
        specialty   VARCHAR(50),
        diagnosis   TEXT,
        health_plan VARCHAR(100),
        notes       TEXT,
        active      BOOLEAN      NOT NULL DEFAULT true,
        created_by  INTEGER      REFERENCES users(id),
        created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);

    // specialty: 'Ortopedia', 'Neurológica', 'Traumatologia', 'Reabilitação Física'

    // ── 5. PLANOS DE TRATAMENTO ───────────────────────────
    // Um paciente pode ter vários planos ao longo do tempo
    // Ex: fez 10 sessões em janeiro, voltou em julho com novo plano
    await client.query(`
      CREATE TABLE IF NOT EXISTS treatment_plans (
        id              SERIAL PRIMARY KEY,
        patient_id      INTEGER      NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        created_by      INTEGER      NOT NULL REFERENCES users(id),
        title           VARCHAR(150) NOT NULL,
        total_sessions  SMALLINT,
        status          VARCHAR(20)  NOT NULL DEFAULT 'Em andamento',
        started_at      DATE         NOT NULL DEFAULT CURRENT_DATE,
        finished_at     DATE,
        notes           TEXT,
        created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);

    // status: 'Em andamento', 'Concluído', 'Cancelado', 'Pausado'
    // total_sessions NULL = sessões avulsas sem número definido

    // ── 6. SESSÕES / EVOLUÇÕES ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id                SERIAL PRIMARY KEY,
        treatment_plan_id INTEGER   NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
        patient_id        INTEGER   NOT NULL REFERENCES patients(id),
        user_id           INTEGER   NOT NULL REFERENCES users(id),
        session_number    SMALLINT  NOT NULL,
        session_date      TIMESTAMP NOT NULL DEFAULT NOW(),
        duration_minutes  SMALLINT  NOT NULL DEFAULT 45,
        pain_scale_start  SMALLINT  CHECK (pain_scale_start >= 0 AND pain_scale_start <= 10),
        pain_scale_end    SMALLINT  CHECK (pain_scale_end   >= 0 AND pain_scale_end   <= 10),
        evolution_status  VARCHAR(20),
        evolution_notes   TEXT,
        next_goal_id      INTEGER   REFERENCES goals(id),
        next_goal_custom  VARCHAR(200),
        created_at        TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // evolution_status: 'Melhorou', 'Estável', 'Piorou'
   

    // ── 7. TÉCNICAS POR SESSÃO (N para N) ─────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_techniques (
        session_id   INTEGER NOT NULL REFERENCES sessions(id)   ON DELETE CASCADE,
        technique_id INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
        PRIMARY KEY (session_id, technique_id)
      );
    `);


    // ── 8. PAGAMENTOS ─────────────────────────────────────
    // Separado da sessão pois o pagamento pode ocorrer
    // em momento diferente do atendimento

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                SERIAL PRIMARY KEY,
        treatment_plan_id INTEGER        NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
        patient_id        INTEGER        NOT NULL REFERENCES patients(id),
        session_id        INTEGER        REFERENCES sessions(id),
        amount            NUMERIC(10, 2) NOT NULL,
        payment_method    VARCHAR(30)    NOT NULL,
        payment_date      DATE           NOT NULL DEFAULT CURRENT_DATE,
        notes             TEXT,
        created_by        INTEGER        NOT NULL REFERENCES users(id),
        created_at        TIMESTAMP      NOT NULL DEFAULT NOW()
      );
    `);

    // payment_method: 'Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'
    // session_id NULL = pagamento de pacote (não vinculado a sessão específica)
    // session_id preenchido = pagamento de sessão avulsa

    await client.query('COMMIT');
    console.log('Tabelas criadas com sucesso!');
    console.log('Tabelas criadas:');
    console.log('  ✅ users');
    console.log('  ✅ techniques');
    console.log('  ✅ goals');
    console.log('  ✅ patients');
    console.log('  ✅ treatment_plans');
    console.log('  ✅ sessions');
    console.log('  ✅ session_techniques');
    console.log('  ✅ payments');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar tabelas:', err.message);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
};

createTables();