import re

db_path = "database.js"
with open(db_path, "r") as f:
    content = f.read()

# Improved Map
gif_map = {
    "str_1": "0664",
    "str_2": "1273",
    "str_3": "0651",
    "str_4": "1759",
    "spd_1": "1160",
    "spd_2": "0514",
    "spd_3": "0630",
    "end_1": "3202",
    "end_2": "3665", 
    "end_3": "3561",
    "flex_1": "1424",
    "flex_2": "1585",
    "flex_3": "1710",
    "flex_4": "1271",
    "flex_5": "1358"
}

for ex_id, gif_id in gif_map.items():
    pattern = r'(id:\s*"' + ex_id + r'".*?m:\s*")[^"]*(")'
    new_url = f"https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/{gif_id}.gif"
    content = re.sub(pattern, r'\g<1>' + new_url + r'\g<2>', content, flags=re.DOTALL)

with open(db_path, "w") as f:
    f.write(content)
print("Database patched correctly!")
