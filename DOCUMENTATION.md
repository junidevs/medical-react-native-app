# MedConnect   pełna dokumentacja projektu (prosto, jak do dziecka)

> Jeden dokument, który tłumaczy **co zbudowaliśmy**, **dlaczego akurat tak**, **jak to działa w środku** i **jak z tym pracować**.
> Dodatkowo: mapowanie 1:1 na ofertę pracy, porównanie z najlepszymi praktykami z internetu, oraz instrukcja „jak skonfigurowałem Entra ID" od podpięcia karty pod konto admina aż do ostatniego użytkownika.

Data: 2026-08-30 · Autor konfiguracji: zespół MedConnect · Wersja stacku: Expo SDK 57, React Native 0.86, NestJS 12, Prisma 7.

---

## Spis treści

1. [Co to jest MedConnect (w 5 zdaniach)](#1-co-to-jest-medconnect-w-5-zdaniach)
2. [Czy oferta jest spełniona? (tabela punkt po punkcie)](#2-czy-oferta-jest-spełniona-tabela-punkt-po-punkcie)
3. [Architektura z lotu ptaka](#3-architektura-z-lotu-ptaka)
4. [Ważne decyzje architektoniczne   co / po co / gdzie konfiguracja / jak działa / jak pracować](#4-ważne-decyzje-architektoniczne)
   - [4.1 Monorepo (pnpm + Turborepo)](#41-monorepo-pnpm--turborepo)
   - [4.2 Backend: NestJS](#42-backend-nestjs)
   - [4.3 Baza: Prisma + PostgreSQL](#43-baza-prisma--postgresql)
   - [4.4 PgBouncer (pooling połączeń)](#44-pgbouncer-pooling-połączeń)
   - [4.5 Redis   po co nam Redis?](#45-redis--po-co-nam-redis)
   - [4.6 Logowanie: OAuth 2.0 / OIDC / PKCE + Entra ID + mock](#46-logowanie-oauth-20--oidc--pkce--entra-id--mock)
   - [4.7 Walidacja tokenów JWT (jose)](#47-walidacja-tokenów-jwt-jose)
   - [4.8 WebView + propagacja sesji (portal pacjenta)](#48-webview--propagacja-sesji-portal-pacjenta)
   - [4.9 Push: Azure Notification Hub + APNs + FCM](#49-push-azure-notification-hub--apns--fcm)
   - [4.10 Bezpieczne przechowywanie + Face ID](#410-bezpieczne-przechowywanie--face-id)
   - [4.11 Koperta odpowiedzi, correlation ID, obsługa błędów](#411-koperta-odpowiedzi-correlation-id-obsługa-błędów)
   - [4.12 Observability (pino, terminus, Sentry)](#412-observability-pino-terminus-sentry)
   - [4.13 Offline-first](#413-offline-first)
   - [4.14 Natywne widgety i Live Activity](#414-natywne-widgety-i-live-activity)
5. [Porównanie z najlepszymi praktykami (research z internetu)](#5-porównanie-z-najlepszymi-praktykami)
6. [Czym jest EAS Build / EAS Submit](#6-czym-jest-eas-build--eas-submit)
7. [Po co Maestro](#7-po-co-maestro)
8. [Jak skonfigurowałem Entra ID (od karty admina do ostatniego usera)](#8-jak-skonfigurowałem-entra-id)
9. [Opis najważniejszych plików](#9-opis-najważniejszych-plików)
10. [Jak uruchomić projekt lokalnie](#10-jak-uruchomić-projekt-lokalnie)
11. [Ściąga zmiennych środowiskowych](#11-ściąga-zmiennych-środowiskowych)
12. [Co jest prawdziwe, a co zamockowane (uczciwie)](#12-co-jest-prawdziwe-a-co-zamockowane)

---

## 1. Co to jest MedConnect (w 5 zdaniach)

MedConnect to aplikacja mobilna dla **pacjenta** (iOS + Android), zbudowana w **Expo / React Native**.
Pacjent **loguje się przez Microsoft Entra ID** (dawniej Azure AD), **przegląda i rezerwuje wizyty**, otwiera **portal pacjenta w WebView** (bez ponownego logowania), dostaje **powiadomienia push** i widzi **punkty lojalnościowe** (także jako widget na ekranie iPhone'a oraz odliczanie do wizyty jak w Uberze).
Backend to **API w NestJS** z bazą **PostgreSQL** (przez Prisma) i **Redisem**.
Całość jest w **monorepo** i buduje się przez **EAS Build**.
To projekt **portfolio** pod stanowisko „Lead Mobile Engineer" w świecie healthcare + Microsoft/.NET, więc świadomie pokazuje wzorce produkcyjne, a nie „hello world".

---

## 2. Czy oferta jest spełniona? (tabela punkt po punkcie)

Legenda: ✅ = zrobione i działa · 🟡 = zrobione jako szkielet/mock (świadomie, bo wymaga płatnych usług chmurowych) · 📁 = gdzie w kodzie.

### Responsibilities (obowiązki)

| Wymaganie z oferty | Status | Gdzie w projekcie (📁) |
|---|---|---|
| Cross-platform mobile w **React Native, Expo (SDK 50+), TypeScript, Expo Router** | ✅ | `apps/mobile` (Expo SDK **57**, RN 0.86, TS strict, Expo Router z typed routes) |
| **OAuth 2.0 / OIDC z PKCE**, zarządzanie **JWT**, **Microsoft Entra ID** | ✅ | `apps/mobile/src/features/auth/auth-context.tsx`, `apps/api/src/auth/auth.guard.ts` |
| **Bezpieczna propagacja sesji** między apką a web (WebView) | ✅ | `apps/api/src/portal/*`, `apps/mobile/app/(app)/portal.tsx` |
| **Push przez Azure Notification Hub + APNs + FCM** | 🟡 | rejestracja urządzeń ✅ (`apps/api/src/notifications/*`), realny wysył przez Hub = szkielet (SDK `@azure/notification-hubs` w zależnościach) |
| **Deep linking, nawigacja, cykl życia, SecureStore** | ✅ | scheme `medconnect://`, `expo-router`, `expo-secure-store` (`token-store.ts`) |
| **EAS Build i EAS Submit** | ✅ | `eas.json` (profile development/preview/production + submit) |
| **Publikacja / release / App Store Connect / Google Play** | 🟡 | pipeline gotowy (`eas.json`, `eas submit`), realny „live" wymaga płatnych kont sklepów |

### Skills (umiejętności)

| Wymaganie | Status | Dowód w kodzie |
|---|---|---|
| Komercyjne RN + Expo (SDK 50+) + TS, iOS i Android | ✅ | cały `apps/mobile`, build iOS zrobiony realnie na iPhone |
| OAuth 2.0, OIDC, **PKCE, JWT, Entra ID** | ✅ | `auth-context.tsx` (`usePKCE: true`, `exchangeCodeAsync`), `auth.guard.ts` (`jose`) |
| **React Native WebView**, session mgmt, **REST API** | ✅ | `react-native-webview`, tickety sesji w Redis, REST w NestJS |
| Push na **Notification Hub / APNs / FCM** | 🟡 | model `DeviceRegistration`, tagi `user:` / `platform:` |
| **EAS Build/Submit + publikacja** | ✅ | `eas.json` |
| **Bezpieczeństwo mobilne + SecureStore** | ✅ | `expo-secure-store`, `expo-local-authentication`, `jail-monkey`, single-flight refresh |
| Praca samodzielna w rozproszonym zespole (US hours) | ✅ | dokumentacja, skrypty `dev:all`, CI, devcontainer |

### Nice to have

| Wymaganie | Status | Uwaga |
|---|---|---|
| Azure AD **B2C / CIAM**, **MSAL** | 🟡 | użyliśmy `expo-auth-session` (standard OIDC) zamiast MSAL   świadomy wybór, patrz [4.6](#46-logowanie-oauth-20--oidc--pkce--entra-id--mock) |
| Branża **healthcare / regulated / patient-facing** | ✅ | to jest apka pacjenta (wizyty, portal, PII redakcja w logach) |
| **Hybryda native + WebView** | ✅ | natywna apka + portal w WebView z propagacją sesji |
| Nawigacja po **enterprise identity** | ✅ | pełna konfiguracja Entra ID (sekcja 8) |

**Wniosek:** wszystkie kluczowe punkty (`Responsibilities` + `Skills`) są pokryte kodem. Trzy rzeczy oznaczone 🟡 (realny wysył push, realny „live" w sklepach, B2C/MSAL) to elementy, które wymagają **płatnych usług** lub są **alternatywą technologiczną**   mamy pod nie gotowe miejsca zaczepienia i wiemy dokładnie, co dopiąć.

---

## 3. Architektura z lotu ptaka

```
medconnect/                      ← monorepo (pnpm workspaces + Turborepo)
├─ apps/
│  ├─ mobile/                    ← aplikacja Expo / React Native (pacjent)
│  │  ├─ app/                    ← ekrany (Expo Router: login, appointments, book, portal, settings)
│  │  └─ src/features/…          ← auth, appointments, loyalty, notifications, security
│  └─ api/                       ← backend NestJS (REST)
│     ├─ src/… (auth, appointments, doctors, portal, notifications, loyalty, redis, prisma)
│     └─ prisma/                 ← schema + migracje + seed
├─ packages/
│  ├─ shared/                    ← wspólne typy + schematy Zod (kontrakt API)
│  └─ mock-identity/             ← lokalny wystawca tokenów (zamiast Entra w dev)
├─ docker-compose.yml            ← Postgres + Redis + PgBouncer
├─ eas.json                      ← profile buildów EAS
└─ scripts/dev-all.mjs           ← jedno polecenie startu całości
```

Przepływ danych (skrót):

```
[iPhone/Android]  --OAuth PKCE-->  [Entra ID]  --tokeny JWT-->  [apka]
      |                                                            |
      |  Bearer JWT (Authorization)                                |
      v                                                            v
[NestJS API]  --Prisma-->  [PgBouncer]  -->  [PostgreSQL]
      |  \--> [Redis]  (idempotencja, rate-limit, tickety portalu)
      |
      \--> [Azure Notification Hub] --> APNs / FCM --> push na urządzenie
```

---

## 4. Ważne decyzje architektoniczne

Dla każdej rzeczy odpowiadam na 5 pytań: **co to**, **po co**, **gdzie konfiguracja**, **jak działa w szczegółach**, **jak z tym pracować**.

### 4.1 Monorepo (pnpm + Turborepo)

- **Co to:** jedno repo, w którym siedzi apka mobilna, backend i wspólne paczki.
- **Po co:** apka i backend **współdzielą typy i schematy** (`packages/shared`), więc kontrakt API jest jeden i nie „rozjeżdża się". `pnpm` oszczędza miejsce (jeden magazyn paczek), `Turborepo` cache'uje zadania (`lint`, `build`, `test`)   drugi raz idzie w sekundy.
- **Gdzie konfiguracja:** `package.json` (root, skrypty `turbo …`), `pnpm-workspace.yaml`, `turbo.json`.
- **Jak działa:** `pnpm --filter @medconnect/api …` odpala komendę tylko w wybranej paczce. Turborepo buduje graf zależności i uruchamia równolegle to, co można.
- **Jak pracować:**
  ```bash
  pnpm install            # instaluje wszystko naraz
  pnpm --filter @medconnect/api start:dev
  pnpm --filter @medconnect/mobile start
  ```

### 4.2 Backend: NestJS

- **Co to:** framework Node.js do API, mocno „opinionated" (moduły, kontrolery, serwisy, DI).
- **Po co:** stanowisko jest w świecie **.NET/enterprise**   NestJS jest najbliższy filozofii ASP.NET (dekoratory, dependency injection, guardy, interceptory, filtry). Łatwo pokazać wzorce, których oczekuje enterprise.
- **Gdzie konfiguracja:** `apps/api/src/main.ts` (bootstrap: CORS, Helmet, walidacja, Swagger), `app.module.ts` (spięcie modułów).
- **Jak działa:** request przechodzi przez łańcuch: **middleware → guard (auth, rate-limit) → pipe (walidacja DTO) → kontroler → serwis → interceptor (koperta) → filter (błędy)**.
- **Jak pracować:** nowy zasób = nowy folder `xyz/` z `xyz.module.ts`, `xyz.controller.ts`, `xyz.service.ts`. Swagger dostępny pod `http://localhost:4000/docs`.

### 4.3 Baza: Prisma + PostgreSQL

- **Co to:** PostgreSQL to relacyjna baza; Prisma to ORM (piszesz typowany TypeScript, nie surowy SQL).
- **Po co:** dane wizyt są **relacyjne** (lekarz → sloty → wizyta → pacjent) i wymagają **spójności** (nie da się zarezerwować zajętego slotu). Prisma daje typy end-to-end i migracje.
- **Gdzie konfiguracja:** `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, migracje w `prisma/migrations/`.
- **Jak działa (najważniejszy trik na podwójną rezerwację):** w `Slot` jest `@@unique([doctorId, startTime])`, a w `Appointment` pole `slotId String @unique`. Dzięki temu **jeden slot = najwyżej jedna wizyta**   baza fizycznie nie pozwoli dwóm pacjentom wziąć tego samego terminu, nawet przy wyścigu.
- **Jak pracować:**
  ```bash
  pnpm db:migrate     # zastosuj migracje (prisma migrate deploy)
  pnpm db:seed        # napełnij danymi demo (lekarze + sloty na dziś i najbliższe dni)
  pnpm --filter @medconnect/api prisma:dev   # nowa migracja w trakcie developmentu
  ```
- **Ciekawostka:** w schemacie jest też model `IdempotencyRecord` (backup w bazie), ale realnie idempotencję obsługuje szybszy Redis   patrz [4.5](#45-redis--po-co-nam-redis).

### 4.4 PgBouncer (pooling połączeń)

- **Co to:** „recepcjonista" przed bazą   trzyma pulę gotowych połączeń i rozdaje je aplikacji.
- **Po co:** PostgreSQL nie lubi tysięcy krótkich połączeń (każde kosztuje pamięć). Pod dużym ruchem apka otwierałaby ich mnóstwo. PgBouncer w trybie `transaction` multiplexuje wiele klientów na kilka realnych połączeń → **skalowanie**.
- **Gdzie konfiguracja:** `docker-compose.yml` usługa `pgbouncer` (`POOL_MODE=transaction`, `MAX_CLIENT_CONN=200`, `DEFAULT_POOL_SIZE=20`, `AUTH_TYPE=scram-sha-256`).
- **Jak działa:** aplikacja łączy się z PgBouncerem na porcie **6432** (`DATABASE_URL`), a **migracje** idą bezpośrednio do Postgresa na **5432** (`DIRECT_DATABASE_URL`), bo migracje potrzebują „prawdziwej" sesji.
- **Ważny szczegół (rozwiązany błąd):** Postgres 18 trzyma hasła jako `scram-sha-256`, więc PgBouncer **musi** mieć `AUTH_TYPE=scram-sha-256`, inaczej rzuca `wrong password type`.

### 4.5 Redis   po co nam Redis?

To najczęstsze pytanie na rozmowie, więc opisuję dokładnie. **Redis to bardzo szybka baza „klucz–wartość" w pamięci.** Używamy go do **trzech** rzeczy, których nie chcemy trzymać w Postgresie, bo są krótkotrwałe i muszą być błyskawiczne:

**Gdzie konfiguracja:**
- `docker-compose.yml` → usługa `redis` (obraz `redis:8-alpine`, port 6379, `--appendonly yes` = zapis na dysk).
- `apps/api/src/redis/redis.service.ts` → tworzy klienta `ioredis` z `REDIS_URL` (`lazyConnect`, `maxRetriesPerRequest: 2`).
- `apps/api/src/redis/redis.module.ts` → udostępnia `RedisService` innym modułom.

**Zastosowanie 1   Idempotencja (żeby nie zarezerwować wizyty dwa razy przy podwójnym kliknięciu / retry sieci):**
- 📁 `apps/api/src/idempotency/idempotency.service.ts`
- Jak działa: klient wysyła nagłówek `Idempotency-Key`. Serwis liczy **hash SHA-256 z ciała żądania** i zapisuje w Redis pod `idempotency:<key>` na **24h**. Jeśli przyjdzie drugie żądanie z tym samym kluczem:
  - ten sam payload → oddajemy **zapisaną odpowiedź** (nie wykonujemy operacji ponownie),
  - inny payload → błąd `IDEMPOTENCY_CONFLICT` (ktoś użył tego samego klucza do czegoś innego).
- Po co: przy słabej sieci telefon lubi ponowić request. Bez tego pacjent miałby 2 wizyty.

**Zastosowanie 2   Rate limiting (ochrona API przed zalewem żądań):**
- 📁 `apps/api/src/common/redis-rate-limit.guard.ts`
- Jak działa: klucz `rate-limit:<hash(token/IP)>:<numer minuty>`. Robimy `INCR` (atomowo tworzy i zwiększa licznik), przy pierwszym trafieniu ustawiamy `EXPIRE 60`. Powyżej **120 żądań/min** → `429 Too Many Requests`.
- Dlaczego `INCR + EXPIRE`, a nie `SETEX`: `INCR` atomowo zakłada klucz i zlicza; `SETEX` resetowałby licznik przy każdym wywołaniu.

**Zastosowanie 3   Tickety sesji do WebView (portal pacjenta):**
- 📁 `apps/api/src/portal/portal.service.ts`
- Jak działa: gdy apka chce otworzyć portal, backend generuje losowy `ticket` (UUID), zapisuje w Redis `portal-ticket:<uuid>` z danymi usera na **60 sekund** i zwraca URL `…/portal/page?ticket=…`. WebView otwiera ten URL, backend wymienia ticket na sesję i go kasuje. Ticket jest **jednorazowy i krótkotrwały** → nawet gdyby wyciekł z logów, jest bezużyteczny po minucie.

**Dlaczego Redis, a nie Postgres do tych trzech rzeczy?** Bo to dane **ulotne** z **TTL** (samo-wygasają), pod **ogromnym ruchem** i wymagają **operacji atomowych** (`INCR`, `SET NX`). Postgres by to udźwignął, ale byłby wolniejszy i zaśmiecony krótkotrwałymi rekordami.

**Jak pracować / debug:**
```bash
docker compose up -d redis
docker exec -it <redis_container> redis-cli
> KEYS idempotency:*
> TTL portal-ticket:<uuid>
> GET rate-limit:<hash>:<minuta>
```

### 4.6 Logowanie: OAuth 2.0 / OIDC / PKCE + Entra ID + mock

- **Co to:** standard logowania, w którym apka **nie widzi hasła** użytkownika. Otwiera się przeglądarka Microsoftu, user się loguje, a apka dostaje **tokeny** (access + refresh + id).
- **PKCE (Proof Key for Code Exchange):** apka losuje sekret (`code_verifier`), wysyła jego skrót (`code_challenge`). Przy wymianie kodu na token pokazuje oryginalny `code_verifier`. Dzięki temu, nawet jeśli ktoś przechwyci kod autoryzacyjny, **nie wymieni go na token** bez sekretu. To **obowiązkowy** wzorzec dla apek mobilnych (public client   nie mają bezpiecznego miejsca na client secret).
- **Gdzie konfiguracja:**
  - Mobile: `apps/mobile/src/features/auth/auth-context.tsx`
    ```ts
    const [request, , promptAsync] = useAuthRequest(
      { clientId, scopes: ["openid","profile","email","offline_access", apiScope],
        redirectUri: makeRedirectUri({ scheme: "medconnect", path: "auth" }),
        usePKCE: true },
      discovery
    );
    // po sukcesie:
    exchangeCodeAsync({ clientId, code, redirectUri,
      extraParams: { code_verifier: request.codeVerifier } }, discovery);
    ```
  - Przełącznik trybu `mock`/`entra`: `apps/mobile/src/lib/env.ts` (front) i `apps/api/src/config/env.ts` (backend).
- **Jak działa refresh (świeżość sesji):** `token-store.ts` trzyma `expiresAt`. Gdy token wygasa, `refreshSingleFlight` odświeża go **jednym żądaniem naraz** (mutex single-flight), żeby 5 równoległych zapytań nie wywołało 5 refreshów.
- **Dwa tryby uwierzytelniania:**
  - `entra` → prawdziwy Microsoft Entra ID (sekcja 8).
  - `mock` → lokalny wystawca tokenów `packages/mock-identity` + endpoint `/mock-identity/token`. Pozwala rozwijać apkę **bez internetu i bez konta Azure**. Backend w trybie mock ufa `MOCK_ISSUER`/`MOCK_JWKS_URI`.
- **Dlaczego `expo-auth-session`, a nie MSAL?** MSAL dla RN wymaga natywnego brokera i cięższej integracji. `expo-auth-session` to **czysty, standardowy OIDC**   działa z Expo Router, jest lżejszy i wystarcza do authorization code + PKCE z Entra. Zapisaliśmy to jako świadomy wybór; MSAL to opcja „nice to have", nie konieczność.

### 4.7 Walidacja tokenów JWT (jose)

- **Co to:** backend **nie ufa** tokenowi tylko dlatego, że wygląda dobrze   sprawdza jego **podpis** kluczem publicznym Microsoftu.
- **Gdzie:** `apps/api/src/auth/auth.guard.ts`.
- **Jak działa:**
  1. `createRemoteJWKSet(jwksUri)`   pobiera i cache'uje klucze publiczne (z Entra lub z mocka).
  2. `jwtVerify(token, jwks, { issuer, audience, algorithms: ["RS256"] })`   weryfikuje podpis, wystawcę (`issuer`) i odbiorcę (`audience`).
  3. Z payloadu budujemy `AuthenticatedUser` (`oid`/`sub`, email z `preferred_username`/`upn` jako fallback, `scp` → lista scope'ów).
- **Sprytny detal:** Entra v1 daje `aud = api://<clientId>`, a v2 daje samo `<clientId>`. Guard **akceptuje obie formy**, więc działa niezależnie od wersji tokenu. Błędy `jose` mapujemy na czyste `401`.

### 4.8 WebView + propagacja sesji (portal pacjenta)

- **Problem:** pacjent jest zalogowany w apce, ale portal to osobna strona web. Nie chcemy, żeby logował się drugi raz i nie chcemy wrzucać tokenu Entra do WebView (byłby widoczny/kradliwy).
- **Rozwiązanie (bezpieczne):** backend wystawia **jednorazowy, 60-sekundowy ticket** (patrz Redis, [4.5](#45-redis--po-co-nam-redis)). Apka otwiera `…/portal/page?ticket=…`, a strona sama wymienia ticket na sesję po stronie serwera.
- **Gdzie:** `apps/api/src/portal/portal.service.ts` (ticket), `portal-page.controller.ts` (serwuje HTML **z pominięciem koperty API** i bez nagłówków CSP/HSTS, żeby WebView się wyrenderował), `apps/mobile/app/(app)/portal.tsx` (`originWhitelist` ograniczony do origin API).
- **Trade-offy:** alternatywą byłby cookie/token w WebView, ale to większe ryzyko wycieku. Krótki ticket = mały „blast radius" gdyby wyciekł.

### 4.9 Push: Azure Notification Hub + APNs + FCM

- **Co to:** Notification Hub to „hurtownia" pushy   backend wysyła jeden request do Huba, a Hub rozsyła do **APNs** (Apple) i **FCM v1** (Google).
- **Gdzie:** `apps/api/src/notifications/notifications.service.ts` (rejestracja urządzenia), model `DeviceRegistration` (Prisma), zależność `@azure/notification-hubs`. Env: `AZURE_NOTIFICATION_HUB_CONNECTION_STRING`, `AZURE_NOTIFICATION_HUB_NAME`.
- **Jak działa dziś:** apka pobiera natywny token urządzenia i rejestruje `installationId` + `platform` + tagi (`user:<id>`, `platform:ios|android`). Tagi pozwalają targetować konkretnego pacjenta.
- **Stan:** 🟡 rejestracja gotowa; **realny wysył** przez Hub to szkielet (wymaga płatnego Huba, certyfikatu APNs `.p8` i konta serwisowego FCM v1). Lokalnie pokazujemy natomiast **powiadomienie lokalne** 5 s po rezerwacji (`expo-notifications`), żeby zademonstrować UX bez chmury.
- **Dobre praktyki (z Microsoft Learn), które zakładamy:** osobne huby dev/prod (APNs sandbox ≠ prod), APNs **token-based** (`.p8`, nie wygasa co rok), least-privilege (apka = `Listen`, backend = `Send`), sekrety w **Key Vault**, Android wyłącznie **FCM v1** (legacy FCM wyłączony w 2024).

### 4.10 Bezpieczne przechowywanie + Face ID

- **SecureStore:** tokeny trzymamy w `expo-secure-store` (Keychain iOS / Keystore Android), **nigdy** w zwykłym `AsyncStorage`. 📁 `apps/mobile/src/features/auth/token-store.ts`.
- **Face ID / Touch ID (brama biometryczna):** `expo-local-authentication`. 📁 `apps/mobile/src/features/security/biometric-gate.tsx`   blokuje apkę przy wejściu i po powrocie z tła. Świeżo dodaliśmy **przełącznik w Ustawieniach** (`biometric-preference.ts` + `settings.tsx`), żeby użytkownik mógł włączyć/wyłączyć blokadę.
- **Wykrywanie zrootowanych/jailbreak urządzeń:** `jail-monkey` (📁 `security/device-integrity.tsx`)   na skompromitowanym urządzeniu blokujemy dostęp do danych pacjenta.

### 4.11 Koperta odpowiedzi, correlation ID, obsługa błędów

- **Koperta:** każda odpowiedź API ma jednolity kształt `{ data, error, meta }`. 📁 `apps/api/src/common/response-envelope.interceptor.ts`. Front parsuje to w `apps/mobile/src/lib/api-client.ts` i zwraca **dyskryminowaną unię** `{ ok: true, data } | { ok: false, error }` (zgodnie z regułą „typed errors, no raw try/catch w UI").
- **Correlation ID:** apka generuje `X-Correlation-Id` na każde żądanie (`Crypto.randomUUID`), backend go propaguje (📁 `common/correlation.middleware.ts`) → łatwe śledzenie jednego żądania w logach.
- **Błędy:** `AllExceptionsFilter` (📁 `common/all-exceptions.filter.ts`) zamienia wyjątki na spójne kody (`IDEMPOTENCY_CONFLICT`, `INTERNAL_ERROR`, itd.).

### 4.12 Observability (pino, terminus, Sentry)

- **Logi:** `nestjs-pino`   szybkie logi JSON z **redakcją PII** (nie logujemy tokenów/maili w całości).
- **Health checks:** `@nestjs/terminus`   `GET /health` i `/health/db` (żywotność + baza) do monitoringu/orchestratora.
- **Błędy runtime:** `@sentry/nestjs` (backend) i `@sentry/react-native` (apka)   włączają się, gdy podasz `SENTRY_DSN`.

### 4.13 Offline-first

- **Co:** apka działa mimo słabej sieci. React Query z `networkMode: "offlineFirst"` + `onlineManager` spięty z `@react-native-community/netinfo`.
- **Gdzie:** `apps/mobile/src/lib/query-client.ts`, baner offline `apps/mobile/src/lib/offline-banner.tsx`.
- **Efekt:** dane z cache widać od razu, a mutacje kolejkują się do powrotu sieci.

### 4.14 Natywne widgety i Live Activity

- **Co:** widget na ekranie iPhone'a z **punktami lojalnościowymi** oraz **Live Activity** (odliczanie do wizyty na Lock Screen / Dynamic Island, jak kierowca w Uberze).
- **Jak zbudowane:** oficjalny moduł `expo-widgets` + `@expo/ui/swift-ui`   widgety pisze się w **TypeScript/SwiftUI-like** (bez ręcznego Xcode). 📁 `apps/mobile/src/widgets/loyalty-widget.tsx`, `appointment-activity.tsx`.
- **App Group:** `group.com.medconnect.patient` (w `app.json`)   pozwala apce i widgetowi dzielić dane.
- **Ważna pułapka (rozwiązana):** dyrektywa `"widget"` serializuje **tylko ciało funkcji** do osobnego runtime'u, więc stałe modułowe (np. `const BRAND`) muszą być **wewnątrz** funkcji; dodatkowo wyłączyliśmy `reactCompiler` (wstrzykiwał `_c`, którego runtime widgetu nie zna).

---

## 5. Porównanie z najlepszymi praktykami

Przeszukałem aktualne źródła (Expo docs, Microsoft Learn, artykuły o idempotencji w NestJS, docs Maestro) i zestawiłem z tym, co mamy.

| Obszar | Rekomendacja z internetu | Co mamy | Werdykt |
|---|---|---|---|
| **PKCE / OIDC** | `usePKCE: true`, `exchangeCodeAsync` z `code_verifier`, redirect URI zarejestrowany i dokładnie zmatchowany, **żadnego client secret na urządzeniu** | dokładnie tak (`auth-context.tsx`) | ✅ zgodne |
| **Weryfikacja JWT** | sprawdzaj podpis (JWKS), `issuer`, `audience`, algorytm | `jose` + JWKS + issuer/aud (v1 i v2) + RS256 | ✅ zgodne, nawet solidniej (obie wersje aud) |
| **Idempotencja** | `Idempotency-Key`, **fingerprint ciała**, TTL 24–48h, **lock `SET NX`** na współbieżne duplikaty, **fail-open** gdy Redis padnie, nie licz replayów do rate-limitu, DB unique jako backstop | mamy hash ciała + TTL 24h + konflikt na niezgodność; **brak** rozproszonego locka `SET NX` i **brak** fail-open | 🟡 dobre, do dopięcia: lock + fail-open |
| **Rate limiting** | `INCR + EXPIRE`, TTL = 2× okno, per-user, fail-open | `INCR + EXPIRE`, 120/min, klucz per token/IP | ✅ zgodne (można dodać fail-open) |
| **Klucz idempotencji** | stabilny **biznesowy** klucz, ten sam przy retry | ⚠️ potwierdzone: rezerwacja wysyła `idempotencyKey: Crypto.randomUUID()` **za każdym razem** (`appointments/api.ts:93`), więc retry ma **inny** klucz → idempotencja nie chroni retry. Ratuje nas unique `slotId` w bazie, ale klucz trzeba ustabilizować (losować raz na ekran/próbę rezerwacji) | 🟡 do poprawy |
| **Push (Notification Hub)** | FCM v1 + APNs token-based `.p8`, osobne huby dev/prod, least-privilege, sekrety w Key Vault | model + tagi + SDK; realny wysył = szkielet | 🟡 architektura zgodna, wysył do dopięcia |
| **Secure storage** | Keychain/Keystore, nie plain storage | `expo-secure-store` | ✅ zgodne |
| **E2E testy** | Maestro dla RN/Expo (black-box, YAML) | mamy flow `.maestro/*.yaml` | ✅ zgodne |

**Czy wszystko, czego używamy, jest potrzebne?** Tak   i świadomie **nie** dokładaliśmy rzeczy na siłę:
- Redis jest uzasadniony **trzema** realnymi zastosowaniami (nie „bo tak").
- PgBouncer ma sens dopiero pod ruchem   zostawiamy, bo projekt ma pokazywać myślenie o skali.
- Nie dodaliśmy Kafki/kolejek/microservices   dla apki pacjenta to **overkill**. To też jest dobra praktyka: nie przeinżynierować.

**Najkrótsza lista „co bym dopiął produkcyjnie":** (1) `SET NX` lock + fail-open w idempotencji, (2) realny wysył push przez Hub z sekretami w Key Vault, (3) potwierdzić stabilny klucz idempotencji w UI rezerwacji.

---

## 6. Czym jest EAS Build / EAS Submit

> Uwaga: w pytaniu padło „aes builds"   chodzi o **EAS** (Expo Application Services).

- **EAS Build** = **chmura Expo, która buduje natywną apkę** (plik `.ipa` dla iOS, `.aab/.apk` dla Androida). Nie potrzebujesz własnego Maca z Xcode   Expo robi to na swoich maszynach, zarządza certyfikatami Apple i profilami provisioningu.
- **EAS Submit** = **wysyłka gotowego builda do sklepu** (App Store Connect / Google Play) jednym poleceniem.
- **Po co nam to:** apka używa **natywnych modułów** (SecureStore, Local Authentication, Notifications, Widgets) i **customowego schematu** `medconnect://` do logowania Entra. Tego **nie da się** uruchomić w Expo Go   trzeba mieć **development build** (własny natywny klient). Stąd EAS.
- **Profile w `eas.json`:**
  - `development` → `developmentClient: true`, `distribution: internal`   build do codziennej pracy z Metro/hot-reload na fizycznym telefonie.
  - `preview` → `distribution: internal`   wersja „jak produkcja", do testów wewnętrznych (TestFlight/APK), bez dev-menu.
  - `production` → `autoIncrement: true`   wersja do sklepu, automatycznie podbija numer buildu.
  - `submit.production` → konfiguracja `eas submit` do sklepów.
- **Jak pracować:**
  ```bash
  eas build --profile development --platform ios      # build deweloperski
  eas build --profile production --platform ios       # build do sklepu
  eas submit --profile production --platform ios       # wyślij do App Store Connect
  eas device:create                                    # zarejestruj iPhone (development)
  ```

---

## 7. Po co Maestro

- **Co to:** **Maestro** to open-source framework do testów **E2E (end-to-end)** aplikacji mobilnych. Testy pisze się w **czytelnym YAML** (`launchApp`, `tapOn`, `assertVisible`).
- **Dlaczego akurat to (a nie Appium/Detox):** działa na **warstwie dostępności** (accessibility), jak prawdziwy palec na ekranie   **zero instrumentacji**, żadnych paczek npm w apce, brak „sleep hell" (samo czeka aż UI się ustabilizuje). Pełne wsparcie **React Native + Expo + EAS**.
- **Po co w tym projekcie:** żeby zautomatycznie sprawdzać krytyczne ścieżki: **logowanie** i **rezerwację wizyty**   czyli to, co najłatwiej zepsuć zmianą kodu.
- **Gdzie:** `.maestro/login.yaml`, `.maestro/book-appointment.yaml`.
- **Jak pracować:**
  ```bash
  curl -fsSL "https://get.maestro.mobile.dev" | bash   # instalacja CLI
  maestro test .maestro/login.yaml
  ```
- **Dokumentacja:** https://docs.maestro.dev/ oraz https://docs.maestro.dev/get-started/supported-platform/react-native

---

## 8. Jak skonfigurowałem Entra ID

Sekcja „krok po kroku, jak do dziecka"   od zera do działającego logowania. Wszystko robimy w **Microsoft Entra admin center** (https://entra.microsoft.com) lub w portalu Azure.

### Etap 0   Konto admina i (opcjonalnie) karta

1. Załóż **nową dzierżawę (tenant)** Microsoft 365 / Entra na koncie służbowym (nie osobistym `live.com`/`outlook.com`   te nie wejdą do panelu Azure). Najprościej: trial **Microsoft 365 Business Basic** → dostajesz domenę typu `TwojaNazwa.onmicrosoft.com` i konto **admina** (np. `admin@…onmicrosoft.com`).
2. **Karta płatnicza** nie jest potrzebna do samego Entra ID (rejestracje aplikacji i logowanie są darmowe). Kartę podpina się dopiero, gdy chcesz **płatne usługi** (np. Azure Notification Hub, Key Vault). Wtedy: portal Azure → **Cost Management + Billing** → **Payment methods** → dodaj kartę → przypnij do subskrypcji.
3. Zaloguj się do https://entra.microsoft.com jako **admin** (najlepiej w oknie InPrivate, żeby nie mieszać z kontem prywatnym).

### Etap 1   Rejestracja aplikacji **API** (`medconnect-api`)

1. Entra admin center → **Applications → App registrations → + New registration**.
2. Nazwa: `medconnect-api`. Supported account types: **Accounts in this organizational directory only** (Single tenant). **Register**.
3. Zapisz z **Overview**: `Application (client) ID` → to będzie **API_CLIENT_ID**, oraz `Directory (tenant) ID` → to **TENANT_ID**.

### Etap 2   Wystaw API (scope `access_as_user`)

1. W `medconnect-api` → **Expose an API**.
2. Przy `Application ID URI` kliknij **Add** → zaakceptuj domyślne `api://<API_CLIENT_ID>` → **Save**. (To jest „adres" Twojego API, którego apka zażąda w scope.)
3. **+ Add a scope**:
   - Scope name: `access_as_user`
   - Who can consent: **Admins and users**
   - Admin consent display name/description: „Access MedConnect API"
   - State: **Enabled** → **Add scope**.
4. Efekt: masz scope `api://<API_CLIENT_ID>/access_as_user` → to **EXPO_PUBLIC_ENTRA_API_SCOPE**.

### Etap 3   Ustaw wersję tokenów na v2 (manifest)

1. `medconnect-api` → **Manifest**.
2. Znajdź (w sekcji `api`) pole **`requestedAccessTokenVersion`** i zmień `null` → `2`. **Save**.
   - Po co: żeby Entra wystawiał tokeny **v2** (spójne `issuer`/`audience`), które weryfikuje nasz backend.

### Etap 4   Rejestracja aplikacji **mobilnej** (`medconnect-mobile`)

1. **App registrations → + New registration**. Nazwa: `medconnect-mobile`, single tenant. **Register**.
2. Zapisz `Application (client) ID` → to **MOBILE_APP_CLIENT_ID** (`EXPO_PUBLIC_ENTRA_CLIENT_ID`).
3. **Authentication → + Add a platform → Mobile and desktop applications**.
   - W polu Custom redirect URI wpisz dokładnie: **`medconnect://auth`** → **Configure**.
   - (Uwaga: sam `medconnect://` bywa odrzucany   użyj `medconnect://auth`, dokładnie jak w `makeRedirectUri`.)
4. **Authentication** → włącz **Allow public client flows = Yes** (apka mobilna to public client, bez sekretu).

### Etap 5   Uprawnienia mobile → API

1. `medconnect-mobile` → **API permissions → + Add a permission**.
2. Zakładka **My APIs** (jeśli pusto, sprawdź **APIs my organization uses**) → wybierz `medconnect-api`.
3. **Delegated permissions** → zaznacz **`access_as_user`** → **Add permissions**.
4. Kliknij **Grant admin consent for <Twoja dzierżawa>** → **Yes**. Stan scope musi być zielony: **Granted**.

### Etap 6   Utwórz użytkownika-pacjenta do testów

1. Entra admin center → **Users → All users → + New user → Create new user**.
2. User principal name: np. `patient@<Twoja>.onmicrosoft.com`, wyświetlana nazwa: „Demo Patient".
3. Ustaw hasło (zapisz je!) i **Create**.
4. Przy pierwszym logowaniu Entra poprosi o **zmianę hasła**   zmień je na telefonie/przeglądarce, inaczej „stare" hasło będzie odrzucane (to był jeden z naszych błędów: aplikacja widziała domenę, ale hasło „nie pasowało", bo wymagało zmiany).

### Etap 7   Wpisz zmienne do `.env` i przełącz tryb

Front (`apps/mobile/.env`):
```env
EXPO_PUBLIC_AUTH_MODE=entra
EXPO_PUBLIC_API_URL=http://<TWÓJ_LAN_IP>:4000
EXPO_PUBLIC_ENTRA_TENANT_ID=<TENANT_ID>
EXPO_PUBLIC_ENTRA_CLIENT_ID=<MOBILE_APP_CLIENT_ID>
EXPO_PUBLIC_ENTRA_API_SCOPE=api://<API_CLIENT_ID>/access_as_user
EXPO_PUBLIC_PORTAL_URL=https://portal.example.com
```
Backend (`apps/api/.env`):
```env
AUTH_MODE=entra
ENTRA_TENANT_ID=<TENANT_ID>
ENTRA_ISSUER=https://login.microsoftonline.com/<TENANT_ID>/v2.0
ENTRA_AUDIENCE=api://<API_CLIENT_ID>
ENTRA_JWKS_URI=https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys
```

### Etap 8   Weryfikacja, że działa

- Szybki test backendu bez telefonu: `node scripts/verify-entra.mjs` (device code flow → pobiera token i uderza w `/doctors`).
- Test na telefonie: build development (`eas build --profile development`), instalacja na iPhone, logowanie kontem pacjenta.
- Częste błędy i lekcje z naszej konfiguracji:
  - `AADSTS16000 … live.com` → logujesz się kontem prywatnym zamiast służbowego z dzierżawy.
  - `redirect_uri is not valid` → w Entra brak dokładnie `medconnect://auth`.
  - API zwraca 401/500 → niezgodny `audience`/`issuer` (upewnij się co do v2 i `api://<clientId>`), backend akceptuje obie formy `aud`.

**Tryb bez Azure (mock):** ustaw `AUTH_MODE=mock` i `EXPO_PUBLIC_AUTH_MODE=mock`   logujesz się przez lokalny `mock-identity`, bez żadnego konta Microsoft. Idealne do developmentu i demo.

---

## 9. Opis najważniejszych plików

| Plik | Po co / co robi |
|---|---|
| `eas.json` | Definiuje **profile buildów** EAS (development/preview/production) i `eas submit`. Sterownik całego procesu „kod → apka → sklep". |
| `apps/mobile/app.json` | Konfiguracja Expo: `scheme: medconnect` (deep link/redirect), `bundleIdentifier`, pluginy (`expo-router`, `secure-store`, `local-authentication`, `notifications`, `widgets`), App Group, `NSSupportsLiveActivities`, ikona. |
| `docker-compose.yml` | Lokalna infrastruktura: **Postgres 18**, **Redis 8**, **PgBouncer**. Jedno `docker compose up -d` i masz bazę + cache. |
| `.env.example` | Wzór wszystkich zmiennych (bez sekretów). Kopiujesz do `.env`. |
| `apps/api/src/main.ts` | Bootstrap API: CORS, Helmet, walidacja, koperta, filtr błędów, Swagger (`/docs`). |
| `apps/api/prisma/schema.prisma` | Model danych (User, Doctor, Slot, Appointment, DeviceRegistration, IdempotencyRecord, AuditLog) + kluczowe **unique** chroniące przed podwójną rezerwacją. |
| `apps/api/src/auth/auth.guard.ts` | Weryfikacja JWT (`jose`, JWKS, issuer/audience)   brama do chronionych endpointów. |
| `apps/api/src/redis/redis.service.ts` | Klient Redis (idempotencja, rate-limit, tickety portalu). |
| `apps/mobile/src/features/auth/auth-context.tsx` | Cały flow logowania: PKCE, wymiana kodu, refresh, logout, tryb mock/entra. |
| `apps/mobile/src/lib/api-client.ts` | Typowany klient REST: dokłada `Authorization`, `Idempotency-Key`, `X-Correlation-Id`, parsuje kopertę do `{ ok, data | error }`. |
| `scripts/dev-all.mjs` | Jedno polecenie: infra + migracje + seed + API + Metro, z czekaniem na gotowość usług. |
| `.maestro/*.yaml` | Testy E2E (logowanie, rezerwacja). |
| `.github/workflows/ci.yml` | CI: lint, typecheck, test, build. |

---

## 10. Jak uruchomić projekt lokalnie

```bash
# 1. Zależności
pnpm install

# 2. Skopiuj env (root, api, mobile) i uzupełnij
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/mobile/.env

# 3. Wszystko naraz (infra + migracje + seed + API + Metro)
pnpm dev:all

# …albo ręcznie, po kolei:
pnpm dev:infra                 # Postgres + Redis + PgBouncer
pnpm db:migrate && pnpm db:seed
pnpm api                       # NestJS na :4000  (Swagger: /docs)
pnpm mobile                    # Metro / Expo

# 4. Build na telefon (iOS development):
eas build --profile development --platform ios
```

Domyślnie apka startuje w trybie **mock** (bez Azure). Aby użyć prawdziwego Entra   sekcja [8](#8-jak-skonfigurowałem-entra-id).

---

## 11. Ściąga zmiennych środowiskowych

> Wszystkie `.env` są w `.gitignore` (śledzimy tylko `.env.example`). **Nigdy nie commituj sekretów.**

### Backend (`apps/api/.env`)
| Zmienna | Znaczenie |
|---|---|
| `AUTH_MODE` | `mock` albo `entra`   przełącznik uwierzytelniania |
| `PORT` | port API (domyślnie 4000) |
| `DATABASE_URL` | połączenie do **PgBouncera** (`…:6432/…`)   używane przez apkę |
| `DIRECT_DATABASE_URL` | bezpośrednie połączenie do **Postgresa** (`…:5432/…`)   używane przez migracje |
| `REDIS_URL` | `redis://localhost:6379` |
| `ENTRA_ISSUER` / `ENTRA_AUDIENCE` / `ENTRA_JWKS_URI` | dane Entra do weryfikacji JWT (tryb `entra`) |
| `MOCK_ISSUER` / `MOCK_AUDIENCE` / `MOCK_JWKS_URI` | odpowiedniki dla trybu `mock` |
| `AZURE_NOTIFICATION_HUB_CONNECTION_STRING` / `_NAME` | Azure Notification Hub |
| `SENTRY_DSN` | opcjonalny monitoring błędów |

### Mobile (`apps/mobile/.env`)   prefiks `EXPO_PUBLIC_` = trafia do bundla (bez sekretów!)
| Zmienna | Znaczenie |
|---|---|
| `EXPO_PUBLIC_AUTH_MODE` | `mock`/`entra` |
| `EXPO_PUBLIC_API_URL` | adres API (na telefonie: IP w LAN, nie `localhost`) |
| `EXPO_PUBLIC_ENTRA_TENANT_ID` | ID dzierżawy |
| `EXPO_PUBLIC_ENTRA_CLIENT_ID` | client ID apki mobilnej |
| `EXPO_PUBLIC_ENTRA_API_SCOPE` | `api://<API_CLIENT_ID>/access_as_user` |
| `EXPO_PUBLIC_PORTAL_URL` | adres portalu pacjenta |
| `EXPO_PUBLIC_SENTRY_DSN` | opcjonalny |

---

## 12. Co jest prawdziwe, a co zamockowane (uczciwie)

Żeby dokument był wiarygodny na rozmowie   jasny podział:

**Działa naprawdę (end-to-end):**
- Logowanie **Entra ID** z PKCE na fizycznym iPhone (build development).
- Rezerwacja/anulowanie wizyt z ochroną przed podwójną rezerwacją (unique w bazie + idempotencja w Redis).
- Portal w WebView z jednorazowym ticketem sesji.
- Powiadomienie lokalne 5 s po rezerwacji.
- Face ID (z przełącznikiem w Ustawieniach), SecureStore, wykrywanie jailbreak.
- Widget punktów + Live Activity (odliczanie) na iOS.
- Offline-first, dark mode, koperta API, correlation ID, health checks, Swagger.

**Świadomie zamockowane / szkielet (bo wymaga płatnej chmury):**
- **Realny wysył push** przez Azure Notification Hub (mamy rejestrację + SDK + tagi; brakuje płatnego Huba, `.p8` APNs, konta serwisowego FCM v1).
- **Publikacja „live"** w App Store / Google Play (mamy `eas submit`; brakuje płatnych kont sklepów i procesu review).
- **B2C/MSAL**   użyliśmy standardowego OIDC (`expo-auth-session`); MSAL to alternatywa „nice to have".

**Krótka lista TODO do 100% produkcji:** (1) **stabilny klucz idempotencji** w UI rezerwacji (dziś losowany per wywołanie   `appointments/api.ts:93`), (2) `SET NX` lock + fail-open w idempotencji, (3) realny wysył push z sekretami w Key Vault, (4) konta sklepów + `eas submit` na produkcję.

---

*Koniec dokumentu. Pytania i sekcje można rozwijać   struktura jest modułowa, więc każdą część da się pogłębić bez ruszania reszty.*
