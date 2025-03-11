# Application de Notes Multimédia

Une application mobile moderne et intuitive développée avec React Native et Expo, permettant de créer et gérer des notes multimédias enrichies.

## 🚀 Technologies Utilisées

- React Native
- Expo
- TypeScript
- AsyncStorage pour la persistance des données
- Expo AV pour la gestion audio
- Expo Image Picker pour la gestion des images
- React Native Draggable Grid pour l'organisation des notes
- Expo Blur pour les effets visuels
- Linear Gradient pour le design moderne

## ✨ Fonctionnalités Principales

### 📝 Gestion des Notes
- Création, modification et suppression de notes
- Interface utilisateur intuitive avec animations fluides
- Organisation des notes par glisser-déposer
- Recherche rapide dans les notes
- Classement automatique par date (Aujourd'hui, 7 jours, 30 jours, Plus ancien)

### 🎵 Fonctionnalités Audio
- Enregistrement audio intégré
- Lecture des enregistrements avec visualisation
- Gestion multiple d'enregistrements par note
- Visualiseur audio animé pendant la lecture
- Contrôle de la durée d'enregistrement

### 📸 Gestion des Images
- Ajout de jusqu'à 5 images par note
- Sélection depuis la galerie
- Prévisualisation des images
- Suppression facile des images

### 🔗 Gestion des Liens
- Support des liens web et des emplacements
- Prévisualisation des miniatures pour les liens
- Organisation intelligente des liens

### 💾 Persistance des Données
- Sauvegarde automatique des notes
- Synchronisation locale avec AsyncStorage
- Récupération des données au démarrage

### 🎨 Interface Utilisateur
- Design moderne avec dégradés de couleurs
- Animations tactiles sur les interactions
- Mode clair avec palette de couleurs harmonieuse
- Effets de flou pour une expérience visuelle améliorée
- Interface responsive et adaptative

### 📱 Fonctionnalités Mobiles
- Partage de notes
- Permissions intelligentes pour l'accès aux médias
- Support complet des gestes tactiles
- Adaptation automatique à la taille de l'écran

## 🛠 Installation

1. Clonez le repository :
```bash
git clone [URL_DU_REPO]
cd demo-app
```

2. Installez les dépendances :
```bash
npm install
# ou
yarn install
```

## 🏃‍♂️ Lancement de l'application

Pour démarrer l'application en mode développement :

```bash
npx expo start
```

Cela ouvrira le menu Expo dans votre navigateur. Vous pourrez alors :
- Scanner le QR code avec l'application Expo Go sur votre smartphone
- Lancer l'application sur un émulateur iOS/Android
- Ouvrir l'application dans le navigateur web

## 📁 Structure du Projet

```
demo-app/
├── assets/         # Images, fonts et autres ressources
├── types/          # Définitions des types TypeScript
├── App.tsx         # Point d'entrée principal de l'application
├── app.json       # Configuration Expo
└── package.json   # Dépendances et scripts
```

## 📱 Utilisation

1. **Créer une note** : Appuyez sur le bouton + pour créer une nouvelle note
2. **Enregistrer un audio** : Utilisez le bouton d'enregistrement dans l'éditeur de note
3. **Ajouter des images** : Sélectionnez jusqu'à 5 images depuis votre galerie
4. **Organiser vos notes** : Glissez-déposez pour réorganiser vos notes
5. **Rechercher** : Utilisez la barre de recherche pour filtrer vos notes
6. **Partager** : Utilisez le bouton de partage pour envoyer vos notes

## 🎨 Palette de Couleurs

- Primary: #FFB340
- Secondary: #FFB340
- Accent: #FF2D55
- Background: #F2F2F7
- Success: #34C759
- Error: #FF3B30
- Warning: #FFCC00


