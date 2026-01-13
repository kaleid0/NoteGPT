# Server (Backend Proxy) - Quick Guide

This service acts as a minimal backend proxy to securely store and forward LLM requests to OpenAI.

## Setup

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` (or leave empty to run in demo/mock mode).
2. `npm install`
3. `npm run dev`

**Demo mode**: If `OPENAI_API_KEY` is not set, the server will use a mock LLM (`server/src/mock/mock-openai.ts`) that streams deterministic text for local demos and CI tests.

## API
- `POST /v1/generate` - Proxy endpoint that accepts `{ input: string }` and streams OpenAI responses back to client. For long inputs the server will segment the request to avoid oversized payloads.

## Security
- Store `OPENAI_API_KEY` in `.env` and never commit it.
- Implement minimal access control (e.g., simple token) and logging for audit.
