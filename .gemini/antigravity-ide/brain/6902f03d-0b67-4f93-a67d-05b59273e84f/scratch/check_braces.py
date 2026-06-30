import re

with open(r"c:\Users\ADMIN\Downloads\aviator-crash-master\aviator-crash-master\src\components\Main\main.scss", "r", encoding="utf-8") as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines, 1):
    # Strip comments
    line_clean = re.sub(r'/\*.*?\*/', '', line)
    line_clean = re.sub(r'//.*', '', line_clean)
    
    # Simple check for selector name
    selector = line.strip()
    
    for col, char in enumerate(line_clean, 1):
        if char == '{':
            stack.append((i, selector))
        elif char == '}':
            if not stack:
                pass
            else:
                closed_line, closed_sel = stack.pop()
                if closed_line == 4:
                    print(f"ROOT .game-play (line 4) was closed at line {i} by {selector}")
