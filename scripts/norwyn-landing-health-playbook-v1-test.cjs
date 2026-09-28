const assert = require("node:assert/strict");
const fs = require("node:fs");

const activityTypes = fs.readFileSync("modules/atividades/types/index.ts", "utf8");
const activityApi = fs.readFileSync("app/api/atividades/route.ts", "utf8");
const activityUi = fs.readFileSync("modules/atividades/components/AtividadesDashboard.tsx", "utf8");
const healthRunner = fs.readFileSync("modules/landing-pages/health/landing-health.ts", "utf8");
const healthUi = fs.readFileSync("modules/landing-pages/components/LandingPagesAdminPage.tsx", "utf8");
const presence = fs.readFileSync("modules/presence/services/presence-monitor.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260928113118_landing_health_playbook_v1.sql", "utf8");

assert.match(activityTypes, /template_tarefa_id: string \| null/);
assert.match(activityTypes, /concluida_em: string \| null/);
assert.doesNotMatch(activityTypes, /concluida_at:/);
assert.match(activityTypes, /export type AtividadeLog[\s\S]*detalhe: string \| null/);
assert.match(activityApi, /detalhe: input\.description/);
assert.match(activityApi, /action === "start_playbook"/);
assert.match(activityApi, /atividades_expandir_template/);
assert.match(activityUi, /Iniciar Playbook/);
assert.match(activityUi, /Publicar nova Landing Page/);

assert.match(migration, /landing_page_definitions/);
assert.match(migration, /norwyn_landing_registry/);
assert.match(migration, /digital_assets/);
assert.match(migration, /Publicar nova Landing Page/);
assert.match(migration, /template_tarefa_id/);
assert.match(migration, /concluida_em|atividades_tarefas/);
assert.doesNotMatch(migration, /create table/i, "V1 must reuse the current schema");
for (const route of ["stories", "bio", "whatsapp", "site", "ads"]) {
  assert.match(migration, new RegExp(`'${route}'`), `missing campaign link ${route}`);
}
for (const phase of ["Briefing e estratégia", "Criação visual", "Validação visual/funcional", "Integração técnica", "Tracking", "Checkout", "Domínio", "Links de entrada", "Links curtos", "Saúde e QA", "Métricas", "Aprovação final", "Publicação/distribuição", "Pós-publicação"]) {
  assert.match(migration, new RegExp(phase), `missing playbook phase: ${phase}`);
}
assert.match(migration, /\(40,'14\. Pós-publicação'/, "playbook must contain forty operational tasks");

assert.match(healthRunner, /runPresenceCheck/);
assert.match(healthRunner, /sourceType: "SIMULATED"/);
assert.match(healthRunner, /traffic_type: "test"/);
assert.match(healthRunner, /landing_page_qa_runs/);
assert.match(presence, /sourceType === "REAL"/);
assert.match(presence, /source_type: sourceType/);
assert.match(healthUi, /Saúde da página/);
assert.match(healthUi, /Diagnóstico técnico/);
assert.match(healthUi, /Os links de campanha são verificados como SIMULATED\/test/);

console.log("Landing Health + Playbook V1 regression PASS");
