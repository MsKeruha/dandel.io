import base64
import os

img_path = r'c:\Users\Кирилл\Documents\Проекты\яяя\image copy 8.png'
b64 = base64.b64encode(open(img_path, 'rb').read()).decode('utf-8')
svg = f'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,{b64}" width="100" height="100"/></svg>'
with open(r'c:\Users\Кирилл\Documents\Проекты\dandel.io\frontend\public\dandel-logo.svg', 'w') as f:
    f.write(svg)
print("SVG logo generated successfully!")
