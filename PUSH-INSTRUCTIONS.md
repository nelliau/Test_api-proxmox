# Instructions pour pousser les changements

## Situation

Le serveur n'a pas d'accès Internet direct (nécessite VPN). Les commits sont prêts localement mais ne peuvent pas être poussés directement.

## Commits prêts à être poussés

- `f93343f` - modification
- `32feded` - modification  
- `4930110` - Nettoyage complet du projet et script d'installation automatisé

## Solutions

### Option 1: Pousser depuis Cursor (si vous avez Internet)

1. Dans Cursor, ouvrir le panneau Source Control
2. Cliquer sur les 3 points `...`
3. Sélectionner `Push`

### Option 2: Utiliser le bundle Git

Un bundle a été créé dans `/tmp/test_api2-complete.bundle`

**Depuis un autre ordinateur avec Internet:**

```bash
# Cloner le repository
git clone https://github.com/nelliau/test_api2.git
cd test_api2

# Appliquer le bundle
git pull /chemin/vers/test_api2-complete.bundle

# Pousser
git push origin main
```

### Option 3: Attendre que le VPN fonctionne

Une fois le VPN connecté et fonctionnel:

```bash
cd /home/soc-admin/test_api2
git push origin main
```

Le token est déjà configuré dans le remote.

### Option 4: Copier le répertoire

Copier `/home/soc-admin/test_api2` vers un autre ordinateur avec Internet et pousser depuis là.

## Token GitHub configuré

Le token est déjà configuré dans:
- Remote Git: `origin`
- Fichier credentials: `~/.git-credentials`
- Scripts: `install.sh` et `push-github.sh`

