from PIL import Image, ImageDraw, ImageFont
import os

# Create icons directory
icon_dir = '/app/extension/icons'
os.makedirs(icon_dir, exist_ok=True)

# Define sizes
sizes = [16, 32, 48, 128]

# Color scheme
bg_color = '#667eea'
text_color = '#ffffff'

for size in sizes:
    # Create image with rounded rectangle background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle
    corner_radius = size // 8
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=corner_radius,
        fill=bg_color
    )
    
    # Add truck emoji or text
    font_size = size // 2
    try:
        # Try to load a system font
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Draw text
    text = 'FC'
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    position = ((size - text_width) // 2, (size - text_height) // 2 - bbox[1])
    draw.text(position, text, fill=text_color, font=font)
    
    # Save icon
    icon_path = os.path.join(icon_dir, f'icon{size}.png')
    img.save(icon_path, 'PNG')
    print(f'Created {icon_path}')

print('All icons created successfully!')