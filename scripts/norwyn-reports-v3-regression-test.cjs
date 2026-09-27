const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const due = read("app/api/relatorios/due/route.ts");
const dispatch = read("app/api/relatorios/dispatch/route.ts");
const sendNow = read("app/api/relatorios/send-now/route.ts");
const renderer = read("modules/relatorios/utils/telegram-format.ts");
const service = read("modules/relatorios/services/relatorios-server.ts");
const workflow = JSON.parse(read("modules/relatorios/Resumo_Operacional_Telegram_v1.json"));
const telegramNode = workflow.nodes.find((node) => node.id === "enviar-telegram");
const body = telegramNode?.parameters?.bodyParameters?.parameters ?? [];
const bodyValue = (name) => body.find((item) => item.name === name)?.value;

assert.match(due, /text: telegramHtmlToPlainText\(dispatch\.text\)/, "legacy due consumers must receive safe plain text");
assert.match(due, /html: dispatch\.text/, "due must expose the V3 HTML payload separately");
assert.match(dispatch, /text: telegramHtmlToPlainText\(dispatch\.text\)/, "legacy dispatch consumers must receive safe plain text");
assert.match(dispatch, /html: dispatch\.text/, "dispatch must expose the V3 HTML payload separately");
assert.equal(bodyValue("text"), "={{ $json.html || $json.text }}", "active V3 workflow file must prefer HTML and fall back to plain text");
assert.equal(bodyValue("parse_mode"), "={{ $json.parseMode || $json.parse_mode || 'HTML' }}", "Telegram payload must include parse_mode=HTML");
assert.match(sendNow, /parse_mode: "HTML"/, "manual sends must use HTML parse mode");
assert.match(service, /status: hasContent \? "preparado" : "sem_conteudo"/, "empty reports must be marked sem_conteudo");
assert.match(service, /if \(dispatch\.hasContent\) dispatches\.push\(dispatch\)/, "empty scheduled reports must not be sent");
assert.match(service, /idempotency_key: idempotencyKey/, "scheduled reports must keep their idempotency key");
assert.doesNotMatch(service, /Dados temporariamente indispon[ií]veis\. Fonte:/, "executive messages must not expose technical source names");
assert.match(renderer, /telegramHtmlToPlainText/, "HTML-to-plain fallback must be centralized");

console.log("Norwyn Reports Telegram V3 regression: PASS");
