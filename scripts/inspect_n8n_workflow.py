import json

with open("Instagram_Analytics.json", encoding="utf-8") as file:
    data = json.load(file)

print("name:", data.get("name"))
nodes = data.get("nodes", [])
print("nodes:", len(nodes))

for index, node in enumerate(nodes):
    print(f"{index}: {node.get('name')} | {node.get('type')}")
