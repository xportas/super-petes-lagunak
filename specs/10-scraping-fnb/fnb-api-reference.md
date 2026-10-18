# Referencia técnica verificada — API FNB / Optimal Way Consulting (OWC)

> **Verificado el `2026-10-16` contra los servidores reales de la FNB.**
> Fuente de comportamiento: `specs/10-scraping-fnb/spec.md`. Este fichero es solo referencia técnica.
> Si la FNB cambia endpoints, claves o formatos, se actualiza este fichero en el mismo cambio (nunca se improvisa en código).

Equipo: **LAGUNAK A** (`idTeam = "11659"`, Senior Masculino 1ª Aut, Fase Previa Grupo 2).
Partido ejemplo: **`idMatch = "55488"`** (J2, `2026-10-11 18:00:00`, LAGUNAK A 67 - 42 PAYVI TABERNA SANDUZELAI).
Contraejemplo sin acta digital: **`idMatch = "55483"`** (J1, BERRIOZAR MKE 64 - 58 LAGUNAK A).

---

## 1. Por qué no se parsea el HTML de `fnbaloncesto.com`

Las URLs públicas:

- `https://www.fnbaloncesto.com/pagina-partido/?id=55488&tab=1`
- `https://www.fnbaloncesto.com/pagina-equipo/?id=11659`

devuelven solo un contenedor React vacío del plugin `owc-open-dmr-wordpress` (`build/index.js?ver=4.0.34`):

```html
<div class='owbasket-shortcode-root owbasket-root' data-args='{"id":"55488","tab":"1"}' data-name='Match' data-props='{"standing":"1","groups":"1","refereeteam":"1"}'></div>
<div class='owbasket-shortcode-root owbasket-root' data-args='{"id":"11659"}' data-name='Team' data-props='{"players":"1","standing":"1","groups":"1","globalInfo":"1","stats":"1"}'></div>
```

Los datos reales vienen de dos APIs JSON de **Optimal Way Consulting**:

## 2. Constantes de conexión

- `idTeam / idSignedTeam = "11659"` — LAGUNAK A
- `teamUuid = "677d8f98-0cb0-4067-b004-2dc69d7573f7"`
- `idClub = "90"` — CLUB DEPORTIVO SOCIEDAD LAGUNAK (código `"310054"`)
- `idGroup = "1686"` — Fase Previa, Grupo 2 (`idCompetition = "946"`, `idCategorySigned = "490"`, `season = "2026"`)

### 2.1. ESB API (calendario, ficha de equipo, ficha de partido)

- `ESB_BASE = "https://esb.optimalwayconsulting.com/fnb/1/k1tEpEWUQKXh9qMvJVS2sWofAvrICVb1"`
- Header: `{ "federation": "fnb" }`
- El cuerpo HTTP es un **string en Base64** (no JSON directo). Al decodificar en UTF-8 se obtiene:

```json
{ "result": "OK", "errorCode": 0, "message": "", "messageData": { "...": "..." } }
```

Decodificación en servidor (Next.js / Node, `src/lib/fnb/`):

```ts
async function fetchEsb<T>(path: string): Promise<T> {
  const res = await fetch(`${ESB_BASE}${path}`, { headers: { federation: 'fnb' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const b64 = (await res.text()).trim();
  const jsonText = Buffer.from(b64, 'base64').toString('utf-8');
  const parsed = JSON.parse(jsonText) as {
    result: 'OK' | 'ERROR';
    errorCode: number;
    message: string;
    messageData: T;
  };
  if (parsed.result !== 'OK') throw new Error(parsed.message || `ESB Error ${parsed.errorCode}`);
  return parsed.messageData;
}
```

> Resiliencia: si la API key pública rotara en una futura temporada, extraerla de la variable global `var owbasket = ...` del HTML de `pagina-equipo/?id=11659`.

### 2.2. MSSTATS API (estadísticas de partido y acumulados)

- `MSSTATS_BASE = "https://msstats.optimalwayconsulting.com/v1/fnb"`
- Header: `{ "federation": "fnb" }`
- Respuesta JSON directa (HTTP 200). Los endpoints usados no exigen JWT.

## 3. Endpoints verificados

### 3.1. `GET ${ESB_BASE}/Match/getByTeamAllSeason/11659` — calendario completo

Devuelve array en `messageData` (14 jornadas en Fase Previa 2026). Ejemplo real (J2):

```json
{
  "idMatch": "55488",
  "universallyid": "6acbcc7bd75749bb61a786f8",
  "idMatchCall": "95349",
  "matchCallUuid": "191dec37-3a64-4f5e-8ce7-693b76b229d8",
  "adGameId": "19523",
  "season": "2026",
  "nameCategory": "Senior Masculino 1ª Aut",
  "nameCompetition": "Fase Previa",
  "nameGroup": "Grupo 2",
  "numMatchDay": "2",
  "matchDay": "2026-10-11 18:00:00",
  "state": "1",
  "nameLocalTeam": "LAGUNAK A",
  "idLocalTeam": "11659",
  "nameVisitorTeam": "PAYVI TABERNA SANDUZELAI",
  "idVisitorTeam": "11763",
  "nameField": "PDVO. LAGUNAK",
  "adressField": "Ronda Barañain s/n",
  "nameTown": "Barañáin",
  "localScore": "67",
  "visitorScore": "42",
  "resultsVisibles": true
}
```

Campos para `jornadas`:

| Campo FNB | Uso en nuestra BD |
|---|---|
| `numMatchDay` | Número de jornada (`1..14`) |
| `idMatch` | `fnb_match_id` (el `?id=` de la URL) |
| `universallyid` | `fnb_universally_id` (nullable; `null` = sin acta digital) |
| `matchDay` (`"YYYY-MM-DD HH:mm:ss"`, hora local `Europe/Madrid`) | `hora_partido` → `cierre = hora − 3h` |
| `idLocalTeam === "11659"` | local / visitante + rival |
| `nameField`, `nameTown` | bloque "Próximo partido" del Home |
| `state === "1"` + `localScore !== null` | partido finalizado con marcador oficial |

Calendario real extraído el `2026-10-16` (resumen):

| J | `idMatch` | Fecha | Partido | Resultado | Acta digital |
|---|---|---|---|---|---|
| 1 | `55483` | `2026-10-03 18:00:00` | BERRIOZAR MKE – LAGUNAK A | 64 - 58 | ❌ `null` (solo foto de acta) |
| 2 | `55488` | `2026-10-11 18:00:00` | LAGUNAK A – PAYVI TABERNA SANDUZELAI | 67 - 42 | ✅ `6acbcc7bd75749bb61a786f8` |
| 3 | `55492` | `2026-10-17 20:00:00` | LARRAONA CLARET – LAGUNAK A | Pendiente | Pendiente |
| 4 | `55495` | `2026-10-25 18:00:00` | LAGUNAK A – CBSA EL NAVARRICO | Pendiente | Pendiente |
| 5 | `55501` | `2026-11-01 12:15:00` | MEGACALZADO ARDOI – LAGUNAK A | Pendiente | Pendiente |
| … | … | …hasta J14 `2027-01-24 12:00:00`… | … | … | … |

### 3.2. `GET ${ESB_BASE}/FCBQWeb/fitxaPartit/{idMatch}` — ficha de un partido

Para el flujo "pegar URL": se extrae `id=55488` de `pagina-partido/?id=55488&tab=1` (o `uuid=` si es `?uuid=...`) y se llama a `/FCBQWeb/fitxaPartit/55488` para obtener `messageData.match.universallyid`.

### 3.3. `GET ${MSSTATS_BASE}/getJsonWithMatchStats/{universallyid}?currentSeason=true` — acta digital

Ejemplo: `/getJsonWithMatchStats/6acbcc7bd75749bb61a786f8?currentSeason=true`.
Filtrar `teams[]` por `teamIdExtern === 11659`. Cada `players[]` (ejemplo real):

```json
{
  "actorId": 578462,
  "uuid": "c66df5a9-eb38-11e9-83ca-0216824770c2",
  "teamId": 11659,
  "name": "IKER BALDA AFONSO",
  "dorsal": "12",
  "starting": false,
  "captain": false,
  "timePlayed": 21,
  "gamePlayed": 1,
  "teamScore": 67,
  "oppScore": 42,
  "data": {
    "score": 12,
    "valoration": 12,
    "shot": 13,
    "shotsOfOneAttempted": 2,
    "shotsOfOneSuccessful": 2,
    "shotsOfTwoAttempted": 7,
    "shotsOfTwoSuccessful": 5,
    "shotsOfThreeAttempted": 4,
    "shotsOfThreeSuccessful": 0,
    "rebounds": 7,
    "offensiveRebound": 1,
    "defensiveRebound": 6,
    "assists": 2,
    "steals": 1,
    "lost": 4,
    "block": 0,
    "faults": 2,
    "faultReceived": 2,
    "personal": 2,
    "attackFoul": 1,
    "unsportsmanslike": 0,
    "disqualification": 0,
    "technique": 0,
    "scuffle": 0,
    "coachTechnical": 0,
    "benchTechnical": 0
  }
}
```

Valoraciones reales J2 para LAGUNAK A (`dorsal — name — valoration`):

- 8 — MARIO SARASA GIL — **1**
- 10 — INARI ITURRI CILVETI (C) — **6**
- 12 — IKER BALDA AFONSO — **12**
- 14 — IÑIGO ORTEGA CARCAMO — **7**
- 15 — XABIER PORTAS GONZALEZ — **2**
- 16 — MARCOS GOMEZ ARNEDO — **0** (5 faltas, expulsado con `−5` y BASE intacta por decisión de sesión)
- 17 — ANDONI ESTIRADO GAISAN — **8**
- 21 — JAVIER BRINGAS BASTERRA — **1**
- 22 — OSKAR ZURDO FERNANDEZ — **-1**
- 23 — ASIER VALENCIA ARBIZU — **13** (máxima BASE → MVP)
- 30 — MARC CATALAN FEIJOO — **-1**

Reglas de mapeo (detalle en `spec.md RF-05–RF-08`, la expulsión la define `spec-02 RF-11`):

- `BASE = trunc(data.valoration)`; `timePlayed > 0` = jugó; ausente del acta = `no_convocado` (`BASE 0`); presente con cero minutos = `dnp` (`BASE 0`); `lesionado` previo del Admin se respeta con cero minutos o ausencia, pero con minutos pasa a `jugo`. El dorsal nunca se usa para mapear.
- Expulsado si `disqualification > 0` o `scuffle > 0` o `(unsportsmanslike + technique + coachTechnical) >= 2` o `personal >= 5` (5 faltas es expulsión por decisión de sesión).
- MVP: solo motor §0 sobre máxima `BASE` habiendo jugado; ignorar flags externos.

### 3.4. `GET ${ESB_BASE}/FCBQWeb/getTeamCard/11659` — club, equipo, clasificación y licencias

Devuelve `club`, `team` (con `groups[0].standing` de 8 equipos, LAGUNAK A 4º con 1V-1D el `2026-10-16`) y `players[]` con licencias (`licenseTypeId "1"` = jugador, `"2"` = entrenador).

`uuid` permanentes verificados (usar como `fnb_uuid` en el seed de la spec-03):

**Entrenadores (nunca se sincronizan; solo referencia para semilla):**

- MAIDER VICENTE LIRAS → `c663ff92-eb38-11e9-83ca-0216824770c2` (`idLicense 69673`)
- IGNACIO JAVIER PATERNAIN FRIAS (Páter) → `c66dca7c-eb38-11e9-83ca-0216824770c2` (`idLicense 69671`)

**Jugadores:**

- 8 — MARIO SARASA GIL → `c66dee66-eb38-11e9-83ca-0216824770c2`
- 10 — INARI ITURRI CILVETI → `c663ea09-eb38-11e9-83ca-0216824770c2`
- 12 — IKER BALDA AFONSO → `c66df5a9-eb38-11e9-83ca-0216824770c2`
- 14 — IÑIGO ORTEGA CARCAMO → `c67324d5-eb38-11e9-83ca-0216824770c2` (vinculado, jugó J2)
- 15 — XABIER PORTAS GONZALEZ → `9fb20b1e-9742-43fc-9ea2-ddeef9fbeae5`
- 16 — MARCOS GOMEZ ARNEDO → `d441b014-9ee3-49e8-a1d0-b4b561dbf362` (vinculado, jugó J2)
- 17 — ANDONI ESTIRADO GAISAN → `6d3c74db-5426-42ad-8c5c-cc276a0489a4`
- 21 — JAVIER BRINGAS BASTERRA → `c66df169-eb38-11e9-83ca-0216824770c2`
- 22 — OSKAR ZURDO FERNANDEZ → `579eb47a-d2f5-4125-81ec-2bdf9d050bd6` (vinculado, jugó J2)
- 23 — ASIER VALENCIA ARBIZU → `c66df3c0-eb38-11e9-83ca-0216824770c2`
- 30 — MARC CATALAN FEIJOO → `c6684685-eb38-11e9-83ca-0216824770c2`
- DAVID VITAL PAGOLA → `c668475e-eb38-11e9-83ca-0216824770c2` (`idLicense 69674`, en plantilla, no convocado J2)

### 3.5. Endpoint auxiliar verificado (fuera de uso)

- `GET ${MSSTATS_BASE}/team-stats/team/11659/season/2026` — acumulados de equipo/jugadores (200 OK, pero fuera de uso: las medias de Ficha se derivan solo del motor al leer).
