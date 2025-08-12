// Migração simples sem dependências TypeScript
// Para uso durante instalação quando módulos podem não estar compilados

const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://health_admin:password@localhost:5432/health_system'
  });

  try {
    console.log('Iniciando migração simples...');

    // Verificar se tabelas existem
    const tablesExist = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'health_units', 'sessions')
    `);

    if (tablesExist.rows.length < 3) {
      console.log('Criando tabelas essenciais...');
      
      // Criar tabelas essenciais
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        );

        CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

        CREATE TABLE IF NOT EXISTS health_units (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          address VARCHAR,
          phone VARCHAR,
          manager_name VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          role VARCHAR NOT NULL DEFAULT 'recepcao',
          first_name VARCHAR,
          last_name VARCHAR,
          username VARCHAR UNIQUE NOT NULL,
          health_unit_id INTEGER REFERENCES health_units(id),
          email VARCHAR UNIQUE,
          password VARCHAR NOT NULL,
          crm VARCHAR,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS exam_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          description TEXT,
          monthly_quota INTEGER DEFAULT 0,
          requires_secretary_approval BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS consultation_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          description TEXT,
          monthly_quota INTEGER DEFAULT 0,
          requires_secretary_approval BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS patients (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          phone VARCHAR NOT NULL,
          age INTEGER NOT NULL,
          address VARCHAR,
          social_name VARCHAR,
          cpf VARCHAR UNIQUE,
          city VARCHAR,
          state VARCHAR,
          birth_date DATE,
          notes TEXT,
          id_photo_front VARCHAR,
          id_photo_back VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS requests (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          doctor_id INTEGER NOT NULL REFERENCES users(id),
          registrar_id INTEGER REFERENCES users(id),
          health_unit_id INTEGER NOT NULL REFERENCES health_units(id),
          exam_type_id INTEGER REFERENCES exam_types(id),
          consultation_type_id INTEGER REFERENCES consultation_types(id),
          is_urgent BOOLEAN DEFAULT false,
          urgency_explanation TEXT,
          status VARCHAR DEFAULT 'received',
          notes TEXT,
          attachment_file_name VARCHAR,
          attachment_file_size INTEGER,
          attachment_mime_type VARCHAR,
          attachment_uploaded_at TIMESTAMP,
          attachment_uploaded_by INTEGER REFERENCES users(id),
          additional_document_file_name VARCHAR,
          additional_document_file_size INTEGER,
          additional_document_mime_type VARCHAR,
          additional_document_uploaded_at TIMESTAMP,
          additional_document_uploaded_by INTEGER REFERENCES users(id),
          exam_location VARCHAR,
          exam_date VARCHAR,
          exam_time VARCHAR,
          result_file_name VARCHAR,
          result_file_size INTEGER,
          result_mime_type VARCHAR,
          result_uploaded_at TIMESTAMP,
          result_uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          
          CONSTRAINT check_single_type CHECK (
            (exam_type_id IS NOT NULL AND consultation_type_id IS NULL) OR
            (exam_type_id IS NULL AND consultation_type_id IS NOT NULL)
          )
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          action VARCHAR NOT NULL,
          entity_type VARCHAR NOT NULL,
          entity_id INTEGER,
          details JSONB,
          ip_address VARCHAR,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      console.log('Tabelas criadas com sucesso');
    }

    // Inserir dados iniciais
    console.log('Inserindo dados iniciais...');
    
    // Unidade de saúde padrão
    await pool.query(`
      INSERT INTO health_units (name, address, phone, manager_name) 
      VALUES ('SMS Alexandria', 'Centro, Alexandria/RN', '(84) 99999-9999', 'Secretário Municipal de Saúde')
      ON CONFLICT DO NOTHING
    `);

    // Tipos de exames
    const examTypes = [
      ['Hemograma Completo', 'Exame de sangue completo', 100, false],
      ['Glicemia em Jejum', 'Dosagem de glicose no sangue', 80, false],
      ['Colesterol Total', 'Dosagem de colesterol', 60, false],
      ['Ultrassom Abdominal', 'Exame de imagem do abdome', 20, true],
      ['Raio-X de Tórax', 'Exame radiológico do tórax', 30, false],
      ['Eletrocardiograma', 'Exame do coração', 40, false],
      ['Mamografia', 'Exame de mama', 15, true],
      ['Tomografia Computadorizada', 'Exame de imagem avançado', 5, true]
    ];

    for (const [name, description, quota, requiresApproval] of examTypes) {
      await pool.query(`
        INSERT INTO exam_types (name, description, monthly_quota, requires_secretary_approval) 
        VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING
      `, [name, description, quota, requiresApproval]);
    }

    // Tipos de consultas
    const consultationTypes = [
      ['Cardiologia', 'Consulta especializada em cardiologia', 20, true],
      ['Endocrinologia', 'Consulta especializada em endocrinologia', 15, true],
      ['Ginecologia', 'Consulta especializada em ginecologia', 25, true],
      ['Urologia', 'Consulta especializada em urologia', 15, true],
      ['Dermatologia', 'Consulta especializada em dermatologia', 20, true],
      ['Oftalmologia', 'Consulta especializada em oftalmologia', 30, true],
      ['Ortopedia', 'Consulta especializada em ortopedia', 25, true],
      ['Neurologia', 'Consulta especializada em neurologia', 10, true]
    ];

    for (const [name, description, quota, requiresApproval] of consultationTypes) {
      await pool.query(`
        INSERT INTO consultation_types (name, description, monthly_quota, requires_secretary_approval) 
        VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING
      `, [name, description, quota, requiresApproval]);
    }

    // Usuário administrador
    const adminPasswordHash = '$2b$10$AfZ.WuRWBiCyZgh1R9IJVOlJ2KiuthycW.GtP4sZ/SW1t9l4Q7jLu';
    await pool.query(`
      INSERT INTO users (role, first_name, last_name, username, email, password, health_unit_id, is_active) 
      VALUES ('admin', 'Administrador', 'Sistema', 'admin', 'admin@alexandria.rn.gov.br', $1, 1, true)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        updated_at = NOW()
    `, [adminPasswordHash]);

    console.log('Migração concluída com sucesso!');
    console.log('Usuário admin criado: admin/admin123');

  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrate();
}

module.exports = { migrate };