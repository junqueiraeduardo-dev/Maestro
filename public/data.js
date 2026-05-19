// data.js — apenas helpers de formatação (sem nenhum dado fictício).
// Todo o conteúdo do app vem do backend; o cliente cadastra o dele.

const brl = (n) =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const brlK = (n) =>
  Number(n) >= 1000
    ? 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
    : brl(n);

Object.assign(window, { brl, brlK });
