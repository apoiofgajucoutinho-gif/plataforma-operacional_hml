# Norwyn Environments

Last verified: 2026-09-27 (America/Sao_Paulo).

## HML

- Vercel project: `plataf-op-hml` (`prj_eXMOrb1OvBQnGiYApbqi9CtTShSq`)
- Public URL: `https://plataf-op-hml.vercel.app`
- Vercel target used by the alias: `production` (inside the HML-only Vercel project)
- Supabase project ref: `oerdsmgiebquecqwcbox`
- Supabase API URL: `https://oerdsmgiebquecqwcbox.supabase.co`
- Juliana tenant: `ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0` (`Juliana Coutinho`, active)

Evidence used for this mapping:

1. `.vercel/project.json` links this repository to the Vercel project `plataf-op-hml`.
2. `vercel inspect https://plataf-op-hml.vercel.app` resolves the alias to that linked project.
3. The JavaScript bundle served by that alias contains the public Supabase URL above. This is the effective `NEXT_PUBLIC_SUPABASE_URL` compiled into the deployed application.
4. A read-only query in that Supabase project confirmed the Juliana tenant.

The Supabase display name is not an environment authority. The deployment configuration above is the source of truth.

`EXPECTED_SUPABASE_PROJECT_REF` must be set to `oerdsmgiebquecqwcbox` in the Vercel HML project. Write-capable Acervo routes compare it with `NEXT_PUBLIC_SUPABASE_URL` and fail closed on mismatch without exposing credentials.

## Other Supabase project

- Project ref: `znmxyfgtvobtfpbvucod`
- Supabase display name: `Plataforma_Operacional_HML`
- Status observed on 2026-09-27: `INACTIVE`
- Environment role: not confirmed; it is not used by the current `plataf-op-hml.vercel.app` deployment.

## Production

- Vercel project: not confirmed in this audit.
- Supabase project ref: not confirmed in this audit.

Do not infer Production from either Supabase display name.
