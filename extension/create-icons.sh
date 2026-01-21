#!/bin/bash

# Script to create extension icons
# Using ImageMagick to create simple truck icons

ICON_DIR="/app/extension/icons"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found, installing..."
    apt-get update && apt-get install -y imagemagick
fi

# Create a simple truck icon using ImageMagick
for size in 16 32 48 128; do
    convert -size ${size}x${size} xc:none \
        -fill "#667eea" \
        -draw "roundrectangle 0,0 ${size},${size} $((size/8)),$((size/8))" \
        -fill white \
        -pointsize $((size/2)) \
        -gravity center \
        -annotate +0+0 "🚚" \
        "${ICON_DIR}/icon${size}.png"
    
    echo "Created icon${size}.png"
done

echo "All icons created successfully!"