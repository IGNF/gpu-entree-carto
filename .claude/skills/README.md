# Skills Claude Code — entree-carto

Skills propres au projet, chargés automatiquement par Claude Code (CLI et extension VS Code)
dans ce dépôt. Ils sont versionnés : toute l’équipe en profite.

## Structure

Un dossier par skill, contenant un fichier `SKILL.md` (nom de dossier en kebab-case) :

```
.claude/skills/
  nom-du-skill/
    SKILL.md        # obligatoire
    scripts/…       # optionnel : scripts appelés par le skill
    references/…    # optionnel : docs chargées à la demande
```

## Format de `SKILL.md`

```markdown
---
name: nom-du-skill
description: Ce que fait le skill et QUAND l’utiliser (Claude s’appuie sur ce texte pour le déclencher).
---

# Titre

Instructions pas à pas, commandes à lancer, fichiers à toucher, vérifications à faire.
```

## Utilisation

- Invocation explicite : `/nom-du-skill` dans Claude Code.
- Invocation automatique : Claude charge le skill quand la demande correspond à sa `description`.

Ce fichier `README.md` n’est pas un skill (il n’est pas dans un sous-dossier avec `SKILL.md`).
