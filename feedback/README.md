# Feedback del Builder Bounty

Actualizado: **30 de octubre de 2026**. Un Markdown por incidencia; distinguir defecto reproducido, diagnóstico y verificación pendiente. Los tres informes originales siguen preparados sin envío; resolver un defecto local no prueba entrega, aceptación ni ausencia de duplicados. La falta de fondos no es un bug del protocolo.

## Informes

| Informe | Estado |
| --- | --- |
| [Unsigned perp builder requires a signer](unsigned-perp-builder-requires-signer.md) | Fricción SDK reproducida; sin envío |
| [Hideki explorer missing from chain metadata](hideki-explorer-missing.md) | Inconsistencia documental/configuración reproducida; sin envío |
| [Intermittent read connectivity](intermittent-read-connectivity.md) | Diagnóstico intermitente; causa no confirmada, posible red local |
| [004 — Mixed candle intervals](004-mixed-candle-intervals.md) | Resuelto: intervalos nativos, OHLC/unidades validados; evidencia en auditoría/validación |
| [005 — Reown production allowlist](005-production-reown-origin-allowlist.md) | Configuración resuelta en producción el 29 de octubre: HTTP200/202, 5/5; conexión/relay/firma real pendientes |
| [006 — Accessible group semantics](006-generic-container-accessible-labels.md) | Fix local y producción verificados el 30 de octubre; seis grupos AX en escritorio/móvil; lector de pantalla pendiente |

**Bloqueo operativo vigente para este trabajo:** instrucciones/signing docs mantienen HOLD, pero `src/lib/operating-policy.mjs` lo declara inactivo. El usuario debe resolver por escrito permiso de margen y modelo de firma; no preparar, firmar ni transmitir para reproducir incidencias antes de esa resolución. Usar lecturas o fixtures aislados; estos no son evidencia on-chain. No se cambió la política. Borradores y raw firmados permanecen fuera de Git. La entrega de feedback es del usuario.

## Formato

```markdown
# Título específico

Severity: <severidad y justificación>
Area: <SDK / API / docs / app>

## Steps to reproduce
1. <Pasos y parámetros exactos; sin secretos>

## Expected
<Resultado esperado>

## Actual
<Resultado observado>

## Evidence
<Fecha UTC, comando o request/response, error, bloque y archivo de evidencia>
<Tx hash y enlace Tokyo si hubo transacción; de lo contrario, indicar que no hubo envío>

## Environment
- SDK: @somnia-chain/markets-sdk <versión realmente usada>
- Network: Somnia Tokyo / Hideki v2 testnet, chain ID 50383
- Wallet: 0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA
- Runtime / OS: <versiones realmente usadas>
- Status: preparado localmente / enviado <referencia>
```

Si la reproducción no usa wallet, indicarlo expresamente en el entorno. No convertir un fixture local en evidencia de una operación on-chain ni publicar claves, tokens de acceso o firmas reutilizables. Las vulnerabilidades deben remitirse por el canal privado del programa.
