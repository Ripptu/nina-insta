#!/bin/zsh
# Baut die App neu und ersetzt sie in /Programme.
export PATH="$HOME/.local/node/bin:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")/app" || exit 1
npm install --no-audit --no-fund && npx tauri build || { echo "Build fehlgeschlagen."; read -k1 "?Taste drücken zum Schließen"; exit 1; }
osascript -e 'quit app "Nina Insta"' 2>/dev/null
rm -rf "/Applications/Nina Insta.app"
cp -R "src-tauri/target/release/bundle/macos/Nina Insta.app" "/Applications/"
cp "src-tauri/target/release/bundle/dmg/"*.dmg "../Nina Insta.dmg"
open "/Applications/Nina Insta.app"
