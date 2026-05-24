import json
import sys
from pathlib import Path


FIELDS = [
    ("tenant_name", "Juliana Coutinho"),
    ("account_name", "Juliana Coutinho"),
    ("username", "fga.jucoutinho"),
    ("source", "n8n_supabase_node"),
    ("data_coleta", "={{ $json.data_coleta }}"),
    ("post_id", "={{ $json.post_id }}"),
    ("tipo_postagem", "={{ $json.tipo_postagem }}"),
    ("likes", "={{ $json.likes || 0 }}"),
    ("comentarios", "={{ $json.comentarios || 0 }}"),
    ("data_postagem", "={{ $json.data_postagem }}"),
    ("hora_postagem", "={{ $json.hora_postagem }}"),
    ("legenda", "={{ $json.legenda || '' }}"),
    ("permalink", "={{ $json.permalink || '' }}"),
    ("reach", "={{ $json.reach || 0 }}"),
    ("saved", "={{ $json.saved || 0 }}"),
    ("shares", "={{ $json.shares || 0 }}"),
]


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python update_n8n_instagram_workflow_to_supabase_node.py <input> <output>")
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    workflow = json.loads(input_path.read_text(encoding="utf-8"))
    workflow["name"] = "Instagram_Analytics_v2"

    replacement = {
        "parameters": {
            "resource": "row",
            "operation": "create",
            "tableId": "instagram_n8n_import_rows",
            "dataToSend": "defineBelow",
            "fieldsUi": {
                "fieldValues": [
                    {"fieldId": field_id, "fieldValue": field_value}
                    for field_id, field_value in FIELDS
                ]
            },
        },
        "type": "n8n-nodes-base.supabase",
        "typeVersion": 1,
        "position": [784, 176],
        "id": "16d1a0f7-9125-4cea-84f0-a3f10963ab88",
        "name": "Enviar para Supabase",
    }

    replaced = False
    for index, node in enumerate(workflow.get("nodes", [])):
        if node.get("id") == "16d1a0f7-9125-4cea-84f0-a3f10963ab88" or node.get("name") == "Enviar para Supabase":
            workflow["nodes"][index] = replacement
            replaced = True
            break

    if not replaced:
        workflow.setdefault("nodes", []).append(replacement)

    connections = workflow.setdefault("connections", {})
    connections["Loop Posts"] = {
        "main": [
            [],
            [
                {
                    "node": "Get Insights",
                    "type": "main",
                    "index": 0,
                }
            ],
        ]
    }
    connections["Get Insights"] = {
        "main": [
            [
                {
                    "node": "Code in JavaScript1",
                    "type": "main",
                    "index": 0,
                }
            ]
        ]
    }
    connections["Code in JavaScript1"] = {
        "main": [
            [
                {
                    "node": "Enviar para Supabase",
                    "type": "main",
                    "index": 0,
                }
            ]
        ]
    }
    connections["Enviar para Supabase"] = {
        "main": [
            [
                {
                    "node": "Loop Posts",
                    "type": "main",
                    "index": 0,
                }
            ]
        ]
    }

    output_path.write_text(
        json.dumps(workflow, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Updated workflow saved to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
