with open('src/ui/UIManager.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update popup card borders
content = content.replace('border: 5px solid #2E7D32;', 'border: 5px solid #FBC02D;')
content = content.replace('box-shadow: inset 0 0 0 2.5px #A5D6A7, 0 6px 0 #1B5E20', 'box-shadow: inset 0 0 0 2.5px #FFF59D, 0 6px 0 #F57F17')

# 2. Update showGameOver colors
content = content.replace('newRecord.style.background = "#4CAF50";', 'newRecord.style.background = "#FBC02D";')
content = content.replace('newRecord.style.border = "2px solid #A5D6A7";', 'newRecord.style.border = "2px solid #FFF59D";')
content = content.replace('scoreVal.style.color = "#1B5E20";', 'scoreVal.style.color = "#47363B";')
content = content.replace('msgVal.style.color = "#2E7D32";', 'msgVal.style.color = "#47363B";')

# 3. Update showReviveOffer colors
content = content.replace('question.style.color = "#1B5E20";', 'question.style.color = "#47363B";')
content = content.replace('noText.style.color = "#2E7D32";', 'noText.style.color = "#47363B";')

with open('src/ui/UIManager.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Colors replaced successfully.')
