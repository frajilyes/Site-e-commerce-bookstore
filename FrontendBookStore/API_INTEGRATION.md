# FrontendBookStore ↔ BackendBookStore

Ce document décrit le contrat entre les deux projets : ce que le frontend
appelle, ce que le backend renvoie, et où se fait la traduction entre les deux.

---

## 1. Démarrage des deux projets

Côté navigateur, **tout passe par `http://localhost:3000`** : la boutique React
occupe ce port (`PORT=3000` dans `FrontendBookStore/.env`) et le proxy de dev de
CRA (champ `proxy` de `package.json`) relaie `/api` et `/health`
vers le backend, qui écoute sur le **5000**. Une seule origine : pas de CORS,
cookie de refresh en same-site, et l’origine exacte déclarée chez Google pour
la connexion sociale. Les deux serveurs doivent tourner en
parallèle.

```bash
# Terminal 1 — API
cd BackendBookStore
cp .env.example .env      # puis renseigner DB_URI et JWT_SECRET
npm install
npm run seed              # catalogue de départ + compte admin
npm run dev               # http://localhost:5000 (interne)

# Terminal 2 — boutique
cd FrontendBookStore
cp .env.example .env
npm install
npm start                 # http://localhost:3000
```

Vérification rapide : `GET http://localhost:3000/health` (proxifié) doit répondre
`{ "success": true, "database": "connected" }`, et la page `/api` de la boutique
liste le contenu de chaque ressource.

### Variables à garder alignées

| BackendBookStore/.env      | FrontendBookStore/.env                 | Pourquoi |
| -------------------------- | -------------------------------------- | -------- |
| `PORT=5000`                | `"proxy": "http://localhost:5000"` (package.json) | Cible du relais CRA |
| `PORT=5000`                | `REACT_APP_API_URL=/api`               | Appels relatifs, proxifiés vers l’API |
| `PORT=5000`                | `REACT_APP_SERVER_URL=` *(vide)*       | `/health` et images relatives, même origine |
| `CLIENT_URL=…:3000`        | `PORT=3000`                            | URLs de retour Stripe |
| `CORS_ORIGINS` ⊇ `…:3000`  | `PORT=3000`                            | Filet de sécurité si un appel part en direct sur le 5000 |
| `SHIPPING_FLAT_RATE=4.99`  | `REACT_APP_SHIPPING_FLAT_RATE=4.99`    | Récapitulatif = montant facturé |
| `FREE_SHIPPING_THRESHOLD=50` | `REACT_APP_FREE_SHIPPING_THRESHOLD=50` | Idem |
| `TAX_RATE=0`               | `REACT_APP_TAX_RATE=0`                 | Idem |
| `CURRENCY=usd`             | `REACT_APP_CURRENCY=USD`               | Affichage des prix |

---

## 2. Forme des réponses

Toute réponse réussie sort de `utils/response.js` dans une enveloppe :

```jsonc
// ressource simple
{ "success": true, "data": { … } }

// liste paginée
{ "success": true, "total": 42, "page": 1, "limit": 12,
  "totalPages": 4, "hasNextPage": true, "hasPrevPage": false, "data": [ … ] }
```

Les erreurs sortent de `middlewares/error.js` :

```jsonc
{ "success": false, "status": "fail", "message": "…",
  "errors": [{ "field": "email", "message": "A valid email is required" }] }
```

Côté frontend, `src/services/httpClient.js` **déballe l'enveloppe** : un appelant
reçoit directement le contenu de `data`, et la pagination dans `response.meta`.
Les erreurs sont converties en `ApiError` (`src/services/apiError.js`), avec
`status`, `message`, `details` et les raccourcis `isNetworkError`,
`isValidationError`, `fieldMessages`.

---

## 3. Correspondance des identifiants et des champs

| Backend (Mongo)        | Frontend            | Traduction |
| ---------------------- | ------------------- | ---------- |
| `_id`                  | `id` (+ `_id` gardé)| `services/adapters.js` |
| `order.totalPrice`     | `order.total`       | `adaptOrder` expose les deux |
| `cart.items[].book`    | `item.id`, `item.title`, `item.image` | `adaptCartItem` aplatit le livre peuplé |
| `image: "/chemin/relatif"` | URL absolue      | `utils/imageUrl.js → resolveImage` |
| `review.createdAt`     | `submittedAt`       | `adaptReview` |

Règle : **le frontend travaille avec `id`**, y compris après l'intégration. Les
composants existants (`BookCardItem`, `WishList`, `CheckOutPage`…) n'ont donc
rien eu à changer.

Le catalogue provient exclusivement de l'API : la seule source de livres est
`BackendBookStore/seed/books.js`, charge en base par `seed/seed.js`. Les
identifiants sont donc toujours des ObjectId. Les services filtrent malgre tout
sur `/^[a-f\d]{24}$/i` avant d'envoyer un id au serveur, pour ne jamais
declencher un 422.

---

## 4. Table des endpoints

Tous les chemins sont centralisés dans `src/config/apiRoutes.js`.

| Domaine | Route API | Service frontend |
| ------- | --------- | ---------------- |
| Auth | `POST /api/auth/register`, `login`, `refresh`, `logout` | `services/authService.js` |
| Auth (confirmation) | `POST /api/auth/verify-email`, `POST /api/auth/resend-verification` | `services/authService.js` + `Components/Sign/VerifyEmail.jsx` |
| Compte | `GET/PATCH/DELETE /api/auth/me`, `me/password`, `me/addresses` | `services/userService.js` (réexporté par `authService`) |
| Comptes (admin) | `GET /api/auth/users`, `GET/PATCH/DELETE /api/auth/users/:id` | `services/userService.js` |
| Auth social | `POST /api/auth/google`, `GET /api/auth/providers` | `services/authService.js` + `services/socialAuth.js` |
| Livres | `GET /api/books` (+ `featured`, `best-sellers`, `categories`, `:id`, `:id/related`) | `services/bookService.js` |
| Livres (admin) | `POST/PATCH/DELETE /api/books`, `PATCH /api/books/:id/stock` | idem |
| Panier | `GET/DELETE /api/carts/me`, `POST /api/carts/me/merge`, `POST /api/carts/items`, `PATCH/DELETE /api/carts/items/:bookId` | `services/cartService.js` |
| Wishlist | `GET/DELETE /api/wishlists/me`, `POST/DELETE /api/wishlists/books/:bookId` | `services/wishlistService.js` |
| Commandes | `POST /api/orders`, `GET /api/orders/my`, `GET /api/orders/:id`, `PATCH /api/orders/:id/cancel` | `services/orderService.js` |
| Paiements | `POST /api/payments/checkout-session`, `payment-intent`, `GET /api/payments/session/:id`, `my` | `services/paymentService.js` |
| Avis | `GET/POST /api/books/:bookId/reviews`, `GET /api/reviews/mine`, `PATCH/DELETE /api/reviews/:id` | `services/reviewService.js` |
| Santé | `GET /health` | `authService.checkApiHealth()` |

---

## 5. Authentification

1. `login` et `verify-email` renvoient `{ user, accessToken }` **et** posent un
   cookie `httpOnly` `refreshToken` sur le chemin `/api/auth`. `register`, lui,
   ne renvoie **aucune session** (cf. « Confirmation par email » ci-dessous).
2. Le token d'accès est stocké dans `localStorage` sous `userSession`
   (`services/session.js`) et injecté en `Authorization: Bearer …`.
3. Sur un `401`, `httpClient` rejoue **une** fois la requête après un
   `POST /api/auth/refresh`. Les appels concurrents partagent le même refresh.
   Si le refresh échoue, la session est vidée.
4. `withCredentials: true` est indispensable : sans lui le cookie ne repart pas
   et la session serait perdue à chaque expiration du token (1 jour par défaut).

### Confirmation par email

Un compte créé avec email + mot de passe reste en sommeil : `register` renvoie
`{ requiresVerification, email, delivered, resendAfter }` et le backend envoie
un code à 6 chiffres. `SignUp` enchaîne donc sur `/verify-email`, seul écran qui
ouvre la session (`authService.verifyEmail`).

- L'adresse rejouée est **celle renvoyée par le serveur**, pas la saisie brute :
  le backend la rogne et la met en minuscules (`utils/email.js`), et applique
  exactement la même transformation sur `register`, `login`, `verify-email` et
  `resend-verification` — sans quoi on s'inscrit sous une valeur et on en
  cherche une autre.
- Le mail porte aussi un lien `${CLIENT_URL}/verify-email?email=…&code=…` :
  l'écran lit la query et valide tout seul.
- Une connexion sur un compte non confirmé échoue en `403` avec
  `code: "EMAIL_NOT_VERIFIED"` (`apiError.needsEmailVerification`) ; `SignIn`
  redirige alors vers `/verify-email` au lieu d'afficher une erreur.
- `delivered: false` signale que le serveur n'a pas de SMTP : le code est dans
  sa console, et l'écran le dit plutôt que de laisser attendre un mail.

Les comptes Google sautent l'étape, le fournisseur ayant déjà vérifié
l'adresse.

### Connexion Google

Le front n'authentifie personne : `services/socialAuth.js` ouvre la fenêtre du
fournisseur et n'en rapporte qu'un jeton, envoyé à `POST /api/auth/google`. Le
backend le vérifie (client_id Google) avant d'ouvrir une session — un jeton
obtenu pour une autre application est rejeté. La réponse est identique à celle
de `login` : `{ user, accessToken }` et le même cookie de rafraîchissement,
donc rien de particulier à gérer ensuite.

Un compte social n'a pas de mot de passe ; si l'email correspond à un compte
existant, le fournisseur y est simplement rattaché au lieu de créer un doublon.
Le bouton ne s'affiche que si `REACT_APP_GOOGLE_CLIENT_ID` est renseigné **et**
que `GET /api/auth/providers` confirme que le serveur a le secret correspondant.

Rôles : `session.role === "admin"` ouvre les écrans d'administration. Les routes
admin répondent `403` à un lecteur — c'est le serveur qui décide, l'UI ne fait
que masquer.

### Mode dégradé

Avec `REACT_APP_USE_LOCAL_FALLBACK=true`, une API injoignable ne bloque pas la
démo : le catalogue local prend le relais et une session « hors ligne »
(`session.offline === true`, sans token) est ouverte. Aucune route protégée n'est
appelée dans cet état. Passer la variable à `false` en production.

---

## 6. Panier et wishlist

Le backend n'a **pas** de panier anonyme (`cartRouter.use(protect)`). D'où le
fonctionnement retenu :

- visiteur non connecté → panier Redux (`bookSlice`), persisté en `localStorage` ;
- à la connexion → `useCartSync` (monté dans `App.jsx`) envoie
  `POST /api/carts/me/merge`, puis réécrit Redux avec la réponse du serveur ;
- le serveur plafonne chaque quantité au stock disponible et écarte les livres
  archivés : remonter un panier périmé est sans risque.

La wishlist suit le même principe, livre par livre (`$addToSet` est idempotent).

---

## 7. Tunnel d'achat

`src/services/checkoutFlow.js` enchaîne :

1. `POST /api/orders` — le serveur relit les prix en base, **réserve le stock**
   (`Services/inventory.js`) et recalcule les totaux (`Services/pricing.js`).
   Rien de ce que le client envoie sur les montants n'est pris en compte.
2. `POST /api/payments/checkout-session` — session Stripe pour cette commande.
3. Redirection vers Stripe, puis retour sur :
   - `/checkout/success?session_id=…` → `pages/CheckoutSuccess.jsx` confirme via
     `GET /api/payments/session/:id`, sans attendre le webhook ;
   - `/checkout/cancel?order=…` → `pages/CheckoutCancel.jsx` propose de reprendre
     le paiement ou d'annuler la commande (ce qui relâche le stock).

Ces deux URLs sont **imposées** par `payementController.js` à partir de
`CLIENT_URL` : elles doivent exister côté front, d'où les routes ajoutées dans
`App.jsx`.

Cas particuliers gérés :

| Situation | Code backend | Mode `checkoutFlow` | Comportement |
| --------- | ------------ | ------------------- | ------------ |
| Stripe non configuré (503) | `STRIPE_NOT_CONFIGURED` | `order-only` | La commande existe en `pending`, l'écran confirme et signale le règlement à finaliser |
| Stripe injoignable (503/502) | `STRIPE_UNAVAILABLE` | `order-only` | Idem : rien n'a été refusé, la commande tient |
| Carte refusée (402) | `STRIPE_CARD_DECLINED` | `payment-failed` | Le message de la banque est affiché, **aucun écran de succès** |
| Demande rejetée (400/429/409) | `STRIPE_INVALID_REQUEST`, `STRIPE_RATE_LIMITED`, `STRIPE_IDEMPOTENCY_CONFLICT` | `payment-failed` | Idem, l'acheteur peut réessayer |
| Stock insuffisant (409) | — | (exception) | Message du serveur affiché, aucun faux succès |
| Adresse invalide (422) | — | (exception) | `fieldMessages` listés dans l'alerte de paiement |
| API injoignable | — | `offline` | Repli sur le paiement simulé historique (mode démo) |

Ces codes viennent de `BackendBookStore/utils/stripeError.js` et sont repris
dans `src/services/apiError.js` (`API_ERROR_CODES`). Ils se testent par leur
`code`, jamais par le texte du message : `error.isCardDeclined`,
`error.isPaymentUnavailable`, `error.isPaymentRefused`.

Le formulaire de checkout est à plat (`shipFirstName`, `shipCity`…) alors que le
serveur attend un sous-document `shippingAddress` : la traduction est faite par
`orderService.toShippingAddress()`.

---

## 8. Avis

`ReviewPage` enregistre toujours la note localement, puis publie via
`reviewService.submitReviews()`. Le serveur exige un commentaire de 3 à 2000
caractères : une note **sans commentaire** reste locale plutôt que d'être
refusée en 422. Un livre déjà noté renvoie `409` — le service bascule alors sur
une mise à jour quand l'avis existant est connu.

Le badge « achat vérifié » et le recalcul de `rating` / `numReviews` sur la fiche
produit sont entièrement gérés par le backend.

---

## 9. Fichiers ajoutés côté frontend

```
.env.example                    contrat d'environnement
API_INTEGRATION.md              ce document
src/config/apiRoutes.js         carte des endpoints du backend
src/services/apiError.js        erreurs normalisées
src/services/adapters.js        documents Mongo -> forme du front
src/services/authService.js     ouverture de session + /health
src/services/userService.js     compte (profil, mot de passe, adresses) + admin
src/services/cartService.js     panier serveur + fusion
src/services/wishlistService.js wishlist serveur
src/services/orderService.js    commandes + traduction du formulaire
src/services/paymentService.js  Stripe (session, intent, confirmation)
src/services/reviewService.js   avis
src/services/checkoutFlow.js    tunnel commande -> paiement
src/utils/pricing.js            copie de Services/pricing.js
src/hooks/useCartSync.js        fusion panier/wishlist à la connexion
src/pages/CheckoutSuccess.jsx   retour Stripe (succès)
src/pages/CheckoutCancel.jsx    retour Stripe (abandon)
```

Et côté backend : `.env.example`, plus `CLIENT_URL` / `CORS_ORIGINS` réalignés
sur le port du frontend.
