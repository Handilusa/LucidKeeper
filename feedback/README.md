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
| [007 — Absolute zero-mocks](007-absolute-zero-mock-noncompliance.md) | Corregido localmente en `3813647`: lecturas/capturas reales; casos controlados conservados como skips, no como pruebas aprobadas |
| [008 — Compatibility finances](008-compatibility-terminal-fabricated-finances.md) | Corregido localmente en `b187b28`: datos reales o loading/unavailable; no se certifica despliegue |
| [009 — IOC price precision](009-ioc-price-precision-loss.md) | Corregido localmente en `613940d`: bigint raw, regresión 1000PEPE y 21 mercados; ninguna orden enviada |
| [010 — Stale partial-close snapshot](010-stale-partial-close-snapshot-risk.md) | Mitigado localmente en `baeeda5`: snapshot actual, preflight pinned y revalidación; no equivale a reduce-only del protocolo |
| [011 — Operating policy divergence](011-operating-policy-runtime-divergence.md) | Corregido runtime en `c05b495`; HOLD activo e integración completa del envelope CLI aún pendiente |

**007–011 son hallazgos de la aplicación LucidKeeper, no bugs acreditados de dreamDEX ni entregas del bounty.** [Triage de dependencias](../docs/DEPENDENCY_TRIAGE.md): 27 entradas runtime afectadas, 0 dev-only, tres advisories; sin solución compatible no forzada ni explotabilidad confirmada. Alcance de entradas wallet/Zod sin resolver; JSON completo local, no publicar payloads de explotación.

**Bloqueo operativo vigente:** instrucciones y runtime aplican HOLD activo. Falta confirmación escrita del permiso dreamDEX para usar los fondos como margen; no preparar, firmar ni transmitir. Lecturas reales o capturas públicas con procedencia, nunca respuestas fabricadas. Último QA local: 56 unit/integration pass / 21 skips; 14 Chromium pass / 16 skips; cero fallos. Despliegue de fixes y ciclo real de ejecución no certificados. Borradores y raw firmados fuera de Git; publicación/entrega del usuario.

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
