#!/bin/zsh
# Entfernt die App und ihre lokalen Daten. Die Zugänge im Schlüsselbund und die Repositories auf GitHub bleiben.
osascript -e 'quit app "Nina Insta"' 2>/dev/null
rm -rf "/Applications/Nina Insta.app" "$HOME/Library/Application Support/Nina Insta" "$HOME/Library/Logs/Nina Insta"
echo "Nina Insta wurde entfernt."
echo "Schlüsselbund-Einträge (Dienst de.vamela.ninainsta) lassen sich in der Schlüsselbundverwaltung löschen."
