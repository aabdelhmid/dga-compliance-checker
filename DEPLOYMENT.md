# Deployment Guide

Follow these steps to deploy your DGA Compliance Checker.

## 1. Push to GitHub

Since I've already initialized the git repository for you, you just need to create the repo on GitHub and push.

1.  **Create a new repository** on GitHub (e.g., `dga-compliance-checker`).
2.  **Run these commands** in your terminal (inside `dga-compliance-checker` folder):

```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/dga-compliance-checker.git
git branch -M main
git push -u origin main
```

## 2. Set up Supabase Database

1.  **Create a new project** at [supabase.com](https://supabase.com).
2.  **Go to the SQL Editor** in your Supabase dashboard.
3.  **Run the Schema Script**:
    - Open `supabase_schema.sql` from this project.
    - Copy the content and paste it into the SQL Editor.
    - Click **Run**.
4.  **Run the Rules Script**:
    - Open `supabase_rules.sql` from this project (I generated this for you!).
    - Copy the content and paste it into the SQL Editor.
    - Click **Run**.
    *(This will populate your database with all 56 DGA rules)*

## 3. Deploy to Vercel

1.  **Install Vercel CLI** (if not installed):
    ```bash
    npm i -g vercel
    ```
2.  **Deploy**:
    ```bash
    vercel
    ```
3.  **Configure Environment Variables**:
    - When asked, link to your GitHub project.
    - Go to your Vercel Project Settings > Environment Variables.
    - Add:
        - `VITE_SUPABASE_URL`: (Get this from Supabase Settings > API)
        - `VITE_SUPABASE_ANON_KEY`: (Get this from Supabase Settings > API)
    - Redeploy if needed.

## 4. Verify

Visit your Vercel URL and try scanning `https://dm.interactive.sa` to confirm everything works!
