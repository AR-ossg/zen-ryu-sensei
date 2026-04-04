import re

db_path = "database.js"
with open(db_path, "r") as f:
    content = f.read()

# Map from exercise id to omercotkd gif id
gif_map = {
    "str_1": "0664",
    "str_2": "1273",
    "str_3": "0651",
    "str_4": "1759",
    "spd_1": "1160",
    "spd_2": "0514",
    "spd_3": "0630",
    "end_1": "0001",
    "end_2": "3544",
    "end_3": "3561",
    "flex_1": "1512",
    "flex_2": "0054",
    "flex_3": "0002",
    "flex_4": "0997",
    "flex_5": "0975"
}

for ex_id, gif_id in gif_map.items():
    # Find block of ex_id
    pattern = r'(id:\s*"' + ex_id + r'".*?m:\s*")[^"]*(")'
    new_url = f"https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/{gif_id}.gif"
    content = re.sub(pattern, r'\g<1>' + new_url + r'\g<2>', content, flags=re.DOTALL)

with open(db_path, "w") as f:
    f.write(content)
print("Database patched!")
