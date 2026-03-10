

# Plan : Mettre à jour la clé API Anthropic

## Problème
Toutes les fonctions de génération échouent avec `401 - invalid x-api-key`. La clé `ANTHROPIC_API_KEY` stockée dans les secrets est invalide ou expirée.

## Action
1. L'utilisateur doit générer une nouvelle clé sur console.anthropic.com
2. Mettre à jour le secret `ANTHROPIC_API_KEY` via l'outil add_secret
3. Relancer la génération

Aucune modification de code n'est nécessaire — seul le secret doit être mis à jour.

