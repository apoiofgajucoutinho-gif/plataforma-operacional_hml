import json
from pathlib import Path

workflow_path = Path("Instagram_Analytics.json")
data = json.loads(workflow_path.read_text(encoding="utf-8"))

for node in data.get("nodes", []):
    if node.get("name") == "Append or update row in sheet":
        node["name"] = "Enviar para Supabase"
        node["type"] = "n8n-nodes-base.httpRequest"
        node["typeVersion"] = 4.2
        node.pop("credentials", None)
        node["parameters"] = {
            "method": "POST",
            "url": "={{ $env.PLATAFORMA_INSTAGRAM_IMPORT_URL }}",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {
                        "name": "Authorization",
                        "value": "=Bearer {{ $env.N8N_INGEST_TOKEN }}",
                    },
                    {
                        "name": "Content-Type",
                        "value": "application/json",
                    },
                ],
            },
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ JSON.stringify({ source: 'n8n', rows: [$json] }) }}",
            "options": {
                "timeout": 30000,
            },
        }

connections = data.setdefault("connections", {})
loop_connections = connections.get("Loop Posts", {}).get("main")
if loop_connections:
    for output in loop_connections:
        for connection in output:
            if connection.get("node") == "Append or update row in sheet":
                connection["node"] = "Enviar para Supabase"

workflow_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Workflow atualizado:", workflow_path)
