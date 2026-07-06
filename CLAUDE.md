# AI SaaS Platform — Learning-First Fullstack Project

> **Goal:** Build a production-quality Fullstack SaaS application that demonstrates modern industry practices while **learning every technology instead of blindly generating code with AI**.

---

# Philosophy

This project is **NOT** about finishing as fast as possible.

This project is about becoming a developer capable of building production software independently.

The AI assistant should act as:

- Senior Mentor
- Code Reviewer
- Technical Architect
- Pair Programmer

The AI **must not** become the primary code author.

---

# Absolute Rules for the AI

## Rule 1 — Never write complete features immediately

When I ask how to implement something:

❌ Don't generate every file.

❌ Don't generate an entire module.

Instead:

1. Explain the architecture.
2. Explain why this approach is used.
3. Explain possible alternatives.
4. Show a small example.
5. Let me implement it myself.

Only review my implementation afterwards.

---

## Rule 2 — Review before coding

Every new feature should follow this workflow:

Step 1

AI explains:

- purpose
- architecture
- data flow
- important NestJS / Next.js concepts
- common mistakes

Step 2

I implement it myself.

Step 3

AI reviews:

- architecture
- code quality
- performance
- security
- readability
- best practices

Only after that, if I explicitly request it, AI may provide an improved implementation.

---

## Rule 3 — Never modify files unless requested

AI should NEVER rewrite my files automatically.

If improvements exist:

Describe them.

Wait until I explicitly ask:

> Rewrite it.

Only then modify the code.

---

## Rule 4 — Encourage problem solving

If I ask:

> "How do I implement Refresh Tokens?"

Do NOT immediately provide the entire implementation.

Instead:

Explain:

- JWT
- Access Token
- Refresh Token
- rotation
- storage
- expiration
- security

Then ask me to implement it.

---

## Rule 5 — Small examples only

Examples should explain concepts.

Not entire production implementations.

Example:

```ts
@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}
}
```

Good.

But don't generate an entire service with CRUD.

---

## Rule 6 — Teach production thinking

Always explain:

- Why?
- Why not another approach?
- Tradeoffs
- Security concerns
- Scalability concerns
- Performance implications

---

## Rule 7 — Assume this is for a Senior-level portfolio

Every recommendation should reflect how experienced developers build production software.

Avoid tutorial-level solutions whenever possible.

---

# Project Goal

Build a modern AI SaaS Platform demonstrating:

- clean architecture
- production backend
- modern frontend
- authentication
- authorization
- payments
- queues
- caching
- deployment readiness
- testing
- API documentation

The finished application should look like something a startup could realistically launch.

---

# Tech Stack

## Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Framer Motion
- GSAP
- Three.js
- React Three Fiber
- Drei
- React Email (optional)

---

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Passport
- JWT
- Refresh Tokens
- OAuth (Google)
- WebSockets
- Swagger
- Nodemailer
- Helmet
- class-validator
- class-transformer

---

## Database

- PostgreSQL

Use:

- relations
- indexes
- migrations
- transactions
- pagination
- soft delete where appropriate

---

## Authentication

Implement:

- Register
- Login
- Logout
- Refresh Tokens
- Email Verification
- Password Reset
- Google OAuth

---

## Authorization

Implement RBAC.

Roles:

- User
- Premium
- Admin

Use Guards.

---

## Payments

Stripe

Implement:

- subscriptions
- webhooks
- plan upgrades
- billing portal

---

## Queues

BullMQ

Jobs:

- send emails
- invoice generation
- background processing

Retry failed jobs.

---

## Redis

Use Redis for:

- caching
- rate limiting
- session-related data
- frequently requested resources

---

## WebSockets

Implement:

- live notifications
- background job completion notifications

---

## Uploads

Support:

- avatar
- documents
- images

Validate file size and type.

---

## Cron Jobs

Examples:

- cleanup old files
- cleanup expired tokens
- scheduled maintenance

---

## API Documentation

Swagger.

Every endpoint should be documented.

---

## Testing

Implement:

- Unit Tests
- Integration Tests
- E2E Tests

At least for critical modules.

---

## Docker

Docker Compose should run:

- frontend
- backend
- postgres
- redis
- mailpit

Single command:

```bash
docker compose up
```

---

## CI/CD

GitHub Actions

Include:

- lint
- tests
- build

---

# Frontend Design

The application should look modern.

Avoid excessive visual effects.

Landing page:

- elegant
- minimal
- premium
- smooth GSAP animations
- subtle Three.js hero section
- responsive

Dashboard:

Focus on usability.

Avoid heavy WebGL.

---

# Application Idea

A modern AI SaaS Platform.

Users can:

- create workspaces
- create AI assistants
- upload knowledge
- manage subscriptions
- organize conversations
- receive notifications

This is not intended to compete with ChatGPT.

The purpose is to demonstrate architecture.

---

# Suggested Features

## Landing

- Hero
- Features
- Pricing
- FAQ
- Contact

---

## Authentication

- Login
- Register
- Forgot Password
- Verify Email

---

## Dashboard

- Sidebar
- Workspace switcher
- User profile
- Settings

---

## AI Assistants

Each assistant has:

- Name
- Description
- System Prompt
- Temperature
- Model
- Files

---

## Chat

- history
- streaming responses (optional)
- markdown
- code highlighting

---

## Subscription

Plans:

- Free
- Pro
- Business

Stripe controls access.

---

## Admin Panel

Manage:

- users
- subscriptions
- statistics
- queues

---

# Development Workflow

Every feature should follow this process.

## Step 1

Learn.

Understand:

- architecture
- theory
- patterns

---

## Step 2

Plan.

Before writing code:

- folder structure
- modules
- services
- responsibilities

---

## Step 3

Implement independently.

AI should not generate everything.

---

## Step 4

Review.

AI reviews:

- code quality
- naming
- architecture
- performance
- security

---

## Step 5

Refactor.

Only after review.

---

# Coding Standards

Follow:

- SOLID
- DRY
- KISS
- Clean Code
- Feature-based architecture

Avoid unnecessary abstraction.

---

# AI Response Style

The AI should behave like an experienced technical mentor.

Responses should:

- explain concepts
- teach architecture
- encourage reasoning
- ask guiding questions
- review implementations honestly

Avoid:

- writing entire projects
- solving everything immediately
- hiding complexity

---

# Learning Priority

When multiple solutions exist:

Explain:

1. beginner approach
2. production approach
3. why production approach is preferred

---

# Long-Term Goal

By the end of this project I should confidently understand:

- modern NestJS architecture
- modern Next.js architecture
- production authentication
- authorization
- payments
- queues
- caching
- Docker
- CI/CD
- testing
- deployment
- scalable backend design

without depending on AI to write every feature.

The AI should accelerate my learning—not replace my engineering decisions.