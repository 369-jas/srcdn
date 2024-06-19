#!/bin/bash

# Function to check if a string is a number
is_number() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

# Find the folder with a numeric name in the current directory
numeric_folders=$(find . -maxdepth 1 -type d -name '[0-9]*' -printf "%f\n")

# Check if no numeric folders were found
if [ -z "$numeric_folders" ]; then
  echo "No numeric folder found in the current directory."
  exit 1
fi

# Check if multiple numeric folders were found
if [ $(echo "$numeric_folders" | wc -l) -ne 1 ]; then
  echo "Multiple numeric folders found in the current directory. Please ensure only one numeric folder exists."
  exit 1
fi

# Extract the folder name
FOLDER_NAME=$(echo "$numeric_folders" | head -n 1)

# Increment the folder name
NEW_FOLDER_NAME=$((FOLDER_NAME + 1))

# Rename the folder
mv "$FOLDER_NAME" "$NEW_FOLDER_NAME"
find . -type f -exec sed -i "s/main\/$FOLDER_NAME/main\/$NEW_FOLDER_NAME/g" {} +


# Output the new folder name
echo "Folder renamed to: $NEW_FOLDER_NAME"

