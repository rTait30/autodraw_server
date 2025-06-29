// DiscrepancyStep.js (or inside Discrepancy.jsx)
export const zeroDiscrepancy = {
  id: 'discrepancy',
  title: 'Discrepancy Calculation',
  calcFunction: (data) => {
    const { AB, BC, CD, DA, HA, HB, HC, HD, AC, BD, fabricType } = data;
    if (
      [AB, BC, CD, DA, HA, HB, HC, HD, AC, BD].some(
        (v) => typeof v !== 'number' || isNaN(v)
      )
    ) {
      data.result = {
        discrepancy: '',
        errorBD: '',
        message: 'Please enter a value in each input.',
      };
      return;
    }

    const ABxy = Math.sqrt(AB ** 2 - (HB - HA) ** 2);
    const BCxy = Math.sqrt(BC ** 2 - (HC - HB) ** 2);
    const CDxy = Math.sqrt(CD ** 2 - (HD - HC) ** 2);
    const DAxy = Math.sqrt(DA ** 2 - (HA - HD) ** 2);
    const BDxy = Math.sqrt(BD ** 2 - (HD - HB) ** 2);
    const ACxy = Math.sqrt(AC ** 2 - (HA - HC) ** 2);

    const angleABC = Math.acos((ACxy ** 2 + ABxy ** 2 - BCxy ** 2) / (2 * ACxy * ABxy));
    const angleACD = Math.acos((ACxy ** 2 + DAxy ** 2 - CDxy ** 2) / (2 * ACxy * DAxy));

    const Bx = ABxy * Math.cos(angleABC);
    const By = ABxy * Math.sin(angleABC);
    const Dx = DAxy * Math.cos(angleACD);
    const Dy = -DAxy * Math.sin(angleACD);

    const BDTeoricXYZ = Math.sqrt((Bx - Dx) ** 2 + (By - Dy) ** 2 + (HB - HD) ** 2);
    const discrepancy = BDTeoricXYZ - BD;
    const errorBD = (discrepancy / BDTeoricXYZ) * 100;

    const threshold = fabricType === 'PVC' ? 40 : 80;
    const message = Math.abs(discrepancy) <= threshold
      ? 'Your dimensions are suitable for Four points'
      : 'Your dimensions are NOT suitable for Four points. Please recheck dimensions';

    data.result = {
      discrepancy: `${message}\nDiscrepancy: ${discrepancy.toFixed(2)} mm`,
      errorBD: `Error: ${errorBD.toFixed(2)}%`
    };
  },
  drawFunction: () => {}, // No drawing needed
};