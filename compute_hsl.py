def hex_to_hsl_channels(hex_color):
    """Convert hex color to HSL channel string (e.g., '211 65% 57%')"""
    hex_color = hex_color.lstrip('#')
    r, g, b = tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
    
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    delta = max_c - min_c
    
    # Lightness
    l = (max_c + min_c) / 2
    
    # Saturation
    if delta == 0:
        s = 0
        h = 0
    else:
        s = delta / (1 - abs(2 * l - 1))
        
        if max_c == r:
            h = 60 * (((g - b) / delta) % 6)
        elif max_c == g:
            h = 60 * ((b - r) / delta + 2)
        else:
            h = 60 * ((r - g) / delta + 4)
    
    if h < 0:
        h += 360
    
    return f"{h:.1f} {s*100:.1f}% {l*100:.1f}%"

colors = {
    '#4A90D9': 'vault-gold (primary blue)',
    '#5BA0E8': 'vault-gold-light',
    '#111D33': 'vault-black',
    '#0B1426': 'vault-black-deep (background)',
    '#142238': 'vault-surface',
    '#1C2D47': 'vault-surface-elevated (card)',
    '#CC0000': 'vault-red (destructive)',
    '#E60000': 'vault-red-hover',
    '#FFFFFF': 'white',
    '#8B9DB7': 'vault-text-muted',
    '#2ECC71': 'vault-success',
    '#F39C12': 'vault-warning',
    '#0A1628': 'dark text (light theme foreground)',
    '#1B4D8E': 'light primary',
    '#2A6AB5': 'light primary light',
    '#F0F3F8': 'light vault-black',
    '#F8FAFB': 'light vault-black-deep',
    '#E8ECF2': 'light vault-surface',
    '#DDE3ED': 'light vault-surface-elevated',
    '#B80000': 'light vault-red',
    '#3D5070': 'light vault-text-muted',
}

for hex_val, name in colors.items():
    print(f"  {hex_val} → {hex_to_hsl_channels(hex_val)}  /* {name} */")
