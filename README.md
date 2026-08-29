# Scolarité — SaaS de gestion scolaire

Squelette d'application multi-tenant : backend Spring Boot (Java 21) + frontend Angular 19, avec authentification JWT et isolation des données par établissement (tenant).

## Structure

```
scolarite/
├── backend/    # API Spring Boot (Maven)
└── frontend/   # SPA Angular
```

## Multi-tenant

- Chaque établissement est un `Tenant` (colonne `code`, ex: `lycee-victor-hugo`).
- Les utilisateurs (`User`) appartiennent à un tenant, sauf les `SUPER_ADMIN` (plateforme).
- Les entités métier futures doivent hériter de `TenantAwareEntity` : le filtre Hibernate `tenantFilter`
  est activé automatiquement à chaque requête authentifiée (voir `JwtAuthenticationFilter`), ce qui
  restreint les requêtes JPA au tenant courant.

## Démarrer en local

### 1. Base de données

```bash
docker compose up -d
```

### 2. Backend (http://localhost:8080)

```bash
cd backend
./mvnw spring-boot:run
```

Variable d'environnement optionnelle : `JWT_SECRET` (sinon une valeur de dev est utilisée).

### 3. Frontend (http://localhost:4200)

```bash
cd frontend
npm install
npm start
```

## Flux d'authentification

1. `POST /api/auth/register-tenant` — crée un établissement + son premier compte `TENANT_ADMIN`.
2. `POST /api/auth/login` — `{ tenantCode, email, password }` → renvoie un JWT.
3. Le frontend stocke le JWT et l'attache aux requêtes (`Authorization: Bearer ...`).
4. `GET /api/ping` — endpoint protégé de démonstration, utilisé par le tableau de bord.

## Prochaines étapes suggérées

- Modules métier (élèves, classes, notes, bulletins) sous `backend/.../<module>` en héritant de `TenantAwareEntity`.
- Rafraîchissement de token / expiration côté frontend.
- Rôles fins (TEACHER, STUDENT, PARENT) avec `@PreAuthorize`.
