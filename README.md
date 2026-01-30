<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

**Product Contract:** [docs/DROPAM_CORE.md](docs/DROPAM_CORE.md)

Any PR that violates docs/DROPAM_CORE.md must be rejected.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1RgiFq1KOT8QtKbgWISdB8gRI1Lqhouo3

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Run the schema: In Supabase Dashboard → SQL Editor, run `supabase_schema.sql`
3. **Disable email confirmation** (for easy sign-up): Supabase Dashboard → Authentication → Providers → Email → turn **off** "Confirm email"
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (or use defaults in code)
5. Run: `npm run dev`
