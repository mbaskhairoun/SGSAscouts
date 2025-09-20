#!/bin/bash
# Local build script - injects environment variable into config.js
# Set IMAGE_UPLOAD_TOKEN environment variable before running this

if [ -z "$IMAGE_UPLOAD_TOKEN" ]; then
    echo "ERROR: IMAGE_UPLOAD_TOKEN environment variable is not set"
    echo "Please set it with: export IMAGE_UPLOAD_TOKEN=your_token_here"
    exit 1
fi

echo "Injecting token into config.js..."
sed -i "s/{{IMAGE_UPLOAD_TOKEN}}/$IMAGE_UPLOAD_TOKEN/g" config.js

echo "Build complete! You can now open index.html locally."
echo "To reset: run git checkout config.js"