// Inputs must be successful, fresh reads. Unknown is never a zero balance.
export function fundingState({ gas, wallet, deposited, margin, hasPositions }: {
  gas: bigint | undefined;
  wallet: bigint | undefined;
  deposited: bigint | undefined;
  margin: number | null;
  hasPositions: boolean | undefined;
}) {
  const missingGas = gas === 0n;
  const missingCollateral = wallet === 0n && deposited === 0n && margin === 0 && hasPositions === false;
  const notice = missingGas && missingCollateral
    ? 'Read-only — STT and USDso collateral needed'
    : missingGas
      ? 'Read-only — STT needed for gas'
      : missingCollateral
        ? 'Read-only — USDso collateral needed'
        : null;
  return { missingGas, missingCollateral, notice };
}
