# DGA Compliance Checker

A standalone tool to scan websites against the Saudi Digital Government Authority (DGA) Design System guidelines.

## Features

- **Single Page Scan**: Check compliance for a specific URL.
- **Full Website Scan**: Crawl and scan up to 50 pages automatically.
- **DGA Rules**: Checks against 50+ design and accessibility rules.
- **Visual Previews**: See exactly where issues are on your page.
- **Reports**: Download detailed JSON or HTML reports.
- **Supabase Integration**: Store scan history (optional).

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Supabase (Optional)**:
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL in `supabase_schema.sql` in your Supabase SQL Editor
   - Create a `.env` file in the root directory:
     ```env
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Run locally**:
   ```bash
   npm run dev
   ```

## Deployment

### Vercel (Recommended)

1. Push this code to GitHub.
2. Import the project in Vercel.
3. Add the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy!

## Project Structure

- `src/pages/DGACompliance.jsx`: Main scanner UI and logic
- `src/utils/dgaScanner.js`: Scanning engine
- `src/utils/webCrawler.js`: Web crawler for multi-page scanning
- `src/utils/dgaRules.js`: DGA rule definitions
- `src/utils/supabase.js`: Database client

## License

MIT
