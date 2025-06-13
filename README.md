# Digest Flow Daily

**A smart, resilient, and automated content digest application powered by Supabase and React.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=githubpages)](https://ruofei29.github.io/digest-flow-daily/)

---

## 📖 Overview

Digest Flow Daily is a web application designed to help users stay informed without being overwhelmed. Users can subscribe to their favorite content sources (like blogs, news sites, and subreddits via RSS feeds), and the application will automatically fetch, process, and deliver a personalized summary digest at a user-defined schedule.

This project showcases a modern web architecture, combining a static React frontend with a powerful serverless backend provided by Supabase.

## ✨ Key Features

- **Personalized Content Feeds**: Users can add, manage, and validate their own content sources.
- **Automated Digest Generation**: A robust, user-configurable scheduling system automatically generates daily or weekly digests.
- **Intelligent Source Handling**:
  - **Auto-Correction**: Automatically corrects plain Reddit URLs to their proper `.rss` feed format.
  - **Resilient Processing**: Even if some sources fail to fetch, the system generates a partial digest with the content that was successfully retrieved.
- **Secure Authentication**: Full user management system including email confirmation and password resets handled by Supabase Auth.
- **Dynamic Frontend**: A responsive and modern user interface built with React and Shadcn/ui.
- **Automated Deployment**: Continuous deployment pipeline set up with GitHub Actions for seamless updates to the live application on GitHub Pages.

## 🛠️ Tech Stack & Architecture

### Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Supabase
  - **Database**: Supabase Postgres
  - **Authentication**: Supabase Auth
  - **Serverless Functions**: Deno Edge Functions
- **Deployment**: GitHub Actions & GitHub Pages

### System Architecture

The application follows a modern JAMstack architecture. The frontend is a static site that interacts directly with the Supabase backend for data and authentication. The core business logic, such as fetching content and generating digests, is encapsulated in serverless Edge Functions, which are triggered by schedulers or frontend events.

```mermaid
graph TD
    subgraph User's Browser
        A[React Frontend on GitHub Pages]
    end

    subgraph Supabase Cloud
        B[Supabase Auth]
        C[Supabase DB]
        D[Edge Functions]
    end
    
    subgraph Schedulers
        E[Auto-Digest Cron]
        F[Task Completion Cron]
    end

    A -- Auth Requests --> B
    A -- Data Queries (CRUD) --> C
    A -- Triggers 'validate-source' --> D
    
    E -- Triggers 'auto-digest-scheduler' --> D
    F -- Triggers 'check-task-completion' --> D

    D -- Interacts with --> C
    D -- Fetches from --> G[External Content Sources <br/> (RSS Feeds)]
    
```

## 🚀 Getting Started

Follow these instructions to set up and run the project locally for development.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase account and a new project created on [supabase.com](https://supabase.com)

### 1. Clone the Repository

```bash
git clone https://github.com/Ruofei29/digest-flow-daily.git
cd digest-flow-daily
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase Locally

First, link your local repository to your Supabase project. You will need your project's reference ID.

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Next, pull any existing schema changes from your remote Supabase project.

```bash
supabase db pull
```

### 4. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example file.

```bash
cp env.example .env
```

Now, fill in the `.env` file with your Supabase project's URL and `anon` key. You can find these in your Supabase project dashboard under `Project Settings > API`.

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
*Note: The `SERVICE_ROLE_KEY` is needed for running some functions locally but is correctly excluded from the frontend build.*

### 5. Start the Development Servers

To run the full application, you need to start both the Supabase local services (database, functions) and the React development server.

**Start Supabase services:**
This command starts the local Supabase Docker container, applies database migrations, and serves your Edge Functions.

```bash
supabase start
```

**Start the React frontend:**
Open a **new terminal window** and run:

```bash
npm run dev
```

Your application should now be running on `http://localhost:8080`.

## 📦 Deployment

This project is configured for automated deployment to GitHub Pages via GitHub Actions.

- **Trigger**: A push to the `main` branch automatically triggers the `Deploy to GitHub Pages` workflow defined in `.github/workflows/deploy.yml`.
- **Process**:
  1. The workflow checks out the code.
  2. It installs dependencies and builds the React application.
  3. During the build, the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are securely injected from GitHub Actions Secrets.
  4. The workflow creates a `404.html` file to correctly handle SPA routing on GitHub Pages.
  5. The final built assets from the `dist/` directory are pushed to the `gh-pages` branch, which is served by GitHub Pages.
- **Backend**: Supabase Edge Functions are deployed separately using the Supabase CLI commands (e.g., `supabase functions deploy <function-name>`). 