# FinplifAI

FinplifAI is a RAG-based multiagent chat system designed to assist users with accounting and finance queries in
accordance with Spanish state regulations. The platform leverages advanced language models and retrieval-augmented
generation to provide accurate, contextually relevant financial guidance.

## Architecture Overview

FinplifAI implements a sophisticated architecture with the following key components:

![Editor _ Mermaid Chart-2025-05-01-075240](https://github.com/user-attachments/assets/0b169d4f-e47c-47b3-983c-ea7dc2c3e0f5)

### RAG System

The core of FinplifAI is built on Retrieval-Augmented Generation (RAG), which enhances LLM responses by:

- Dynamic retrieval of relevant financial and accounting regulations
- Contextual augmentation of prompts with domain-specific knowledge
- Vector storage of Spanish financial regulatory frameworks
- Real-time document processing capabilities

### Multi-Agent System

The platform employs a multi-agent architecture that coordinates specialized components:

- Primary conversational agent (finance/accounting expert)
- Legal information retrieval agent
- Code generation agent for financial calculations
- Document processing agent for analyzing uploaded financial documents

## Tech Stack

### Frontend and Core

- **[Next.js](https://nextjs.org) App Router**
    - Server Components (RSCs) for optimal rendering strategy
    - Server Actions for secure, server-side mutations
    - Advanced routing for complex application flows

- **[AI SDK](https://sdk.vercel.ai/docs)**
    - Framework-agnostic API for LLM interactions
    - Streaming response handling with structured outputs
    - Provider flexibility with support for xAI (default), OpenAI, Groq, and other providers

- **[shadcn/ui](https://ui.shadcn.com) Components**
    - Accessible component primitives from Radix UI
    - Styled with Tailwind CSS for consistent design language
    - Customizable component system optimized for finance applications

### AI Infrastructure

- **Model Providers**
    - Primary: OpenAI (o3-mini, o4-mini)
    - Alternative: xAI (grok-2-1212)
    - Specialized: Groq (deepseek-r1-distill-llama-70b)

- **RAG Implementation**
    - Custom vector storage for Spanish financial regulations
    - Domain-specific embeddings for accounting terminology
    - Hybrid retrieval system combining semantic and keyword search

### Data Persistence

- **[Vercel Postgres powered by Neon](https://vercel.com/storage/postgres)**
    - Storage for conversation history
    - User profile and preference management
    - Vector embeddings for rapid retrieval

- **[Vercel Blob](https://vercel.com/storage/blob)**
    - Document storage for uploaded financial files
    - Support for multiple document formats (CSV, PDF, spreadsheets)

### Authentication

- **[NextAuth.js](https://github.com/nextauthjs/next-auth)**
    - Secure authentication flows
    - Role-based access control for enterprise usage
    - Multi-tenant support with organization boundaries

## Key Features

- Bilingual interface with primary focus on Spanish language
- Real-time financial calculations with embedded Python code execution
- Integration with Spanish accounting standards and tax regulations
- Document analysis for financial statements and reports
- Responsive design for desktop and mobile access
- Artifact generation for code, spreadsheets, and documentation

## Getting Started

### Prerequisites

- Node.js 18.x or later
- Vercel account (for deployments and environment variables)
- Access to required AI model providers

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/poacosta/finplifai.git
   cd finplifai
   ```

2. Install Vercel CLI
   ```bash
   npm i -g vercel
   ```

3. Link your local instance with Vercel and GitHub accounts
   ```bash
   vercel link
   ```

4. Download your environment variables
   ```bash
   vercel env pull
   ```

5. Install dependencies
   ```bash
   pnpm install
   ```

6. Start the development server
   ```bash
   pnpm dev
   ```

The application should now be running at [http://localhost:3000](http://localhost:3000).

### Environment Configuration

Create a `.env.local` file with the following variables:

```
# Database
DATABASE_URL="postgres://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="your-openai-key"
XAI_API_KEY="your-xai-key"
GROQ_API_KEY="your-groq-key"
```

## Deployment

FinplifAI is optimized for deployment on Vercel:

```bash
vercel deploy
```
