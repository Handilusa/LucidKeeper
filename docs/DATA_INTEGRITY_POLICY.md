# LucidKeeper Data Integrity & Zero-Mock Policy

> **MANDATO FUNDAMENTAL DEL PROYECTO (GRABADO CON SANGRE)**
> Queda terminantemente prohibido el uso de valores hardcodeados, mocks, precios ficticios, hashes de transacción inventados, balances inventados o beneficios simulados en la interfaz y en el código de LucidKeeper.
> Todo dato mostrado debe provenir de llamadas on-chain verificadas (RPC Somnia Tokyo 50383) o de indexadores oficiales. Ante la falta o carga de datos, se debe mostrar explícitamente la ausencia de datos (`"--"`, `"0.00"` o estados vacíos), nunca un número ficticio.

---

## 1. Principios Inviolables

1. **Cero Mocks y Cero Fallbacks Hardcodeados:**
   - Prohibido inicializar estados de precios con valores fijos (como `$80,264.9` o `$80,000`). El estado inicial debe ser `0` y mostrar `"--"` hasta que el contrato on-chain `tryGetMarkPrice()` responda.
   - Prohibido suponer balances de gas STT (como `89.96`) o balances de USDso (como `198.0`). Si no hay datos leídos, se muestra `"--"`.
   - Prohibido simular margen desbloqueado (como `2.0`). Si la cuenta no tiene colateral en `MarginBank`, el margen disponible es estrictamente `0.00 USDso`.
   - Prohibido hardcodear hashes de transacción de ejemplo (como `0x8e5f...`) en tarjetas de trade, historial o posiciones. Los hashes deben pertenecer a transacciones reales ejecutadas y confirmadas en Somnia Tokyo.

2. **Visualización de Ausencia de Datos:**
   - Si no hay datos de ticker 24h (`priceChange24h`), se muestra `"--"`. No se inventa `+0.85%`.
   - Si no hay tasa de fondeo calculada (`fundingRate8h`), se muestra `"--"`. No se inventa `0.01%`.
   - Si el usuario no tiene posiciones abiertas, la tabla indica claramente: *"No open positions. Use the terminal above to execute an on-chain trade."*
   - Si la cuenta no tiene historial de transacciones registrado, se indica: *"No recorded transactions for this account yet."*

3. **Multi-Posición Concurrente y Dinámica:**
   - Las posiciones abiertas se leen en paralelo desde `MarginBank.getAccountState().activePerpPools` para todos los mercados activos (BTC, BNB, DOGE, etc.).
   - No se limita el portafolio a una sola posición fija.
   - Cada posición calcula su PnL no realizado, precio de liquidación estimado y orden de cierre IOC con el mark price y los decimales específicos de su propio pool.

4. **Apalancamiento y Margen 100% Configurables por el Usuario:**
   - Prohibido fijar el apalancamiento a un valor estático (como `5.2x`).
   - El apalancamiento es interactivo (1x a 20x, acotado por `initialMarginBps` del pool).
   - El margen por trade es totalmente configurable por el usuario (mediante input directo en USDso o presets `$2`, `$5`, `$10`, `25%`, `50%`, `Max`), recalculando el tamaño de orden real en unidades base.

5. **Historial de Transacciones Basado en la Cuenta Conectada:**
   - La EOA autorizada del bounty (`0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`) carga sus transacciones reales verificadas en Somnia Tokyo testnet con sus respectivos números de bloque y enlaces al explorador.
   - Toda nueva transacción ejecutada a través de la interfaz (órdenes, depósitos, retiros, cierres IOC) se persiste dinámicamente con su hash real confirmado por wagmi/viem.
   - Si se conecta otra billetera, su historial refleja exclusivamente sus propias operaciones reales.

6. **Integridad de Red y Contratos Oficiales:**
   - Red obligatoria: Somnia Tokyo Testnet (Chain ID 50383).
   - Contratos allowlisteados:
     - MarginBank: `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`
     - USDso Collateral: `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`
     - 21 PerpPools oficiales verificados.

---

## 2. Checklist de Auditoría Permanente

Antes de cada commit, build o entrega, se debe verificar:
- [x] ¿Existe algún `80264.9`, `80000`, `198.0`, `89.96`, `5.2x` o `0x8e5f...` hardcodeado en `src/`? -> **ELIMINADO / DINÁMICO**.
- [x] ¿Se muestran guiones `"--"` cuando los datos on-chain aún no han cargado? -> **SÍ**.
- [x] ¿El apalancamiento y el margen responden a la interacción del usuario? -> **SÍ**.
- [x] ¿Se sincronizan múltiples posiciones simultáneamente? -> **SÍ**.
- [x] ¿Las pruebas automatizadas pasan al 100% (53/53)? -> **SÍ**.
- [x] ¿El build de producción compila sin errores? -> **SÍ**.
- [x] ¿El escáner de secretos confirma cero claves privadas o secretos? -> **SÍ**.
