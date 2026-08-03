# SafeMove HaNoi database setup

## 1. Create `.env`

Use `.env` at the repo root and replace `DATABASE_URL` with your real Neon connection string.

```env
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/DBNAME?sslmode=require
PORT=3001 (change if port 3001 is bussy)
LLM_PROVIDER=ollama
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b
```

## 2. Install dependencies

```powershell
npm install
```

## 3. Apply schema

Use the SQL in [db/db.sql](./db/db.sql) against your Neon database.

## 4. Verify the connection

```powershell
npm run db:check
```

or run the local API:

```powershell
npm run dev:api
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/bootstrap
```

## 5. Optional: local AI chatbot with Ollama

```powershell
ollama pull qwen2.5:7b
ollama serve
```

The SafeMove HaNoi chatbot uses the OpenAI-compatible Ollama endpoint at `http://127.0.0.1:11434/v1` by default.
