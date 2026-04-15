# FisioTech API — Backend de Gestão Clínica

![Status](https://img.shields.io/badge/status-concluído-brightgreen)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Railway](https://img.shields.io/badge/deploy-Railway-purple)

API RESTful desenvolvida para digitalizar, centralizar e organizar a rotina
de atendimentos, sessões e evoluções dos pacientes de fisioterapeutas autônomos.

---

## 🎯 Problema Resolvido

Fisioterapeutas autônomos gerenciam informações críticas espalhadas em papéis,
mensagens de WhatsApp e planilhas: evolução de pacientes, planos de tratamento,
histórico de técnicas aplicadas e controle financeiro.

Esta API substitui esses controles manuais por uma arquitetura relacional segura,
permitindo o registro completo de cada sessão e a rastreabilidade total do
tratamento de cada paciente.

---

## 🚀 Tecnologias

| Tecnologia | Uso |
|---|---|
| Node.js + Express | Servidor e roteamento |
| PostgreSQL | Banco de dados relacional |
| JWT | Autenticação e controle de acesso |
| bcryptjs | Criptografia de senhas |
| Railway | Hospedagem e CI/CD via GitHub |

---

## 🗄️ Modelo de Dados

O banco foi modelado para refletir a realidade clínica do fisioterapeuta:

```
users
└── patients
└── treatment_plans (plano: ex. 10 sessões)
├── sessions (registro de cada atendimento)
│     └── session_techniques (técnicas aplicadas)
└── payments (controle financeiro por sessão ou pacote)
```

---

## 🔐 Autenticação

A API usa **JWT Bearer Token** com expiração de 8 horas.
Todas as rotas exceto `/api/auth/login` exigem o header:

**8 tabelas:** `users`, `patients`, `treatment_plans`, `sessions`,
`session_techniques`, `techniques`, `goals`, `payments`

`Authorization: Bearer <seu_token>`

---

Perfis de acesso:
- `admin` — fisioterapeuta (acesso total)
- `secretary` — secretária (acesso restrito)

---

## 📡 Endpoints

### Auth
| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/api/auth/register` | Cadastra usuário | Admin |
| POST | `/api/auth/login` | Retorna token JWT | Pública |

### Pacientes
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/patients` | Lista pacientes ativos |
| POST | `/api/patients` | Cadastra paciente |
| GET | `/api/patients/:id` | Busca paciente por ID |
| PUT | `/api/patients/:id` | Atualiza dados do paciente |

### Planos de Tratamento
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/treatment-plans` | Cria plano de tratamento |
| GET | `/api/treatment-plans/:id` | Busca plano com sessões |

### Sessões
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/sessions` | Registra nova sessão com técnicas |
| GET | `/api/sessions/:id` | Busca sessão completa |

### Catálogos (listas de seleção)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/techniques` | Lista técnicas disponíveis |
| GET | `/api/goals` | Lista objetivos terapêuticos |

### Financeiro
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/payments` | Registra pagamento |
| GET | `/api/payments/patient/:id` | Histórico financeiro do paciente |

---

## 🛠️ Como rodar localmente

**Pré-requisitos:** Node.js 18+, conta no Railway (PostgreSQL)

```bash
# 1. Clone o repositório
git clone https://github.com/RenataAires/api_fisioterapia.git
cd api_fisioterapia

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com seus dados

# 4. Crie as tabelas no banco
node src/config/migrations.js

# 5. Inicie o servidor
npm run dev
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz com:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
JWT_SECRET=chave_secreta_longa_e_aleatoria
JWT_EXPIRES_IN=8h
```

> ⚠️ Nunca suba o `.env` para o GitHub. Ele já está no `.gitignore`.

---

## ☁️ Deploy

A API está hospedada no **Railway** com deploy automático a cada push na branch `main`.

---

## 👩‍💻 Autora

Desenvolvido por **Renata Aires** com o apoio de inteligência artificial: 

* Claude
* Gemini