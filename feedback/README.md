# Feedback del Builder Bounty

Un archivo Markdown por bug, problema de SDK/API o carencia documental reproducida. Los informes actuales están preparados localmente; no se han enviado ni se ha comprobado su aceptación o si son duplicados. La falta de fondos en la EOA es un bloqueo del proyecto, no un bug del protocolo.

## Informes

| Informe | Estado |
| --- | --- |
| [Unsigned perp builder requires a signer](unsigned-perp-builder-requires-signer.md) | Fricción SDK reproducida; sin envío |
| [Hideki explorer missing from chain metadata](hideki-explorer-missing.md) | Inconsistencia documental/configuración reproducida; sin envío |
| [Intermittent read connectivity](intermittent-read-connectivity.md) | Diagnóstico intermitente; causa no confirmada, posible red local |

**HOLD:** no repetir preparaciones de approve/depósito ni generar órdenes para reproducir incidencias mientras esté vigente. Usar lecturas aisladas. Los borradores sin firma y los raw firmados no se publican con los informes.

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
