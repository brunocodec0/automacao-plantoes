// Testes de propriedades do algoritmo de alocação.
// Roda em Node puro (sem Google Sheets): node tests/run-tests.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');
const code = ['Config.gs', 'Code.gs', 'Algoritmo.gs']
  .map(f => fs.readFileSync(path.join(SRC, f), 'utf8'))
  .join('\n') + `
function lerConfig() {
  return Object.assign({}, CONFIG_DEFAULTS, { MEMBROS_POR_DIA: globalThis.__META, ROTACAO_ATIVA: globalThis.__ROT });
}
globalThis.__api = { gerarEscalaBase, DIAS_SEMANA };
`;
const ctx = vm.createContext({ console: { log() {} }, SpreadsheetApp: {}, globalThis: null });
ctx.globalThis = ctx;
vm.runInContext(code, ctx);
const { gerarEscalaBase, DIAS_SEMANA } = ctx.__api;

// PRNG determinístico (mulberry32) para cenários reproduzíveis
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cenario(seed) {
  const r = rng(seed);
  const n = (seed % 3 === 0) ? 3 + Math.floor(r() * 5) : 8 + Math.floor(r() * 25); // inclui cenários com poucos membros
  const disp = [], membros = {};
  for (let i = 0; i < n; i++) {
    const nome = 'Membro ' + String(i + 1).padStart(2, '0');
    const divide = r() < 0.2;
    const disponivel = {};
    DIAS_SEMANA.forEach(d => { disponivel[d] = r() < 0.5; });
    disp.push({ nome, fazPlantao: true, dividePlantao: divide, disponivel, horarios: {} });
    const fixo = (!divide && r() < 0.15) ? [DIAS_SEMANA[Math.floor(r() * 5)]] : [];
    membros[nome] = { nome, maxPlantoes: divide ? 2 + Math.floor(r() * 2) : 1, podeDividir: divide, ativo: r() > 0.1, diasFixos: fixo };
  }
  const dir = {}; DIAS_SEMANA.forEach(d => { dir[d] = 'Diretor ' + d; });
  return { disp, membros, dir };
}

let falhas = 0, cenarios = 0;
const violacoes = { duplicataNoDia: 0, naoDivideEmVariosDias: 0, foraDaDisponibilidade: 0, inativoAlocado: 0 };

for (const meta of [3, 5]) {
  for (const rot of [false, true]) {
    for (let seed = 1; seed <= 150; seed++) {
      ctx.__META = meta; ctx.__ROT = rot;
      const { disp, membros, dir } = cenario(seed);
      const out = gerarEscalaBase(disp, membros, dir, {}, 33, 2026);
      cenarios++;

      const porDia = {}, porMembro = {};
      out.forEach(e => {
        if (e.membro.startsWith('(sem')) return;
        (porDia[e.dia] = porDia[e.dia] || []).push(e.membro);
        (porMembro[e.membro] = porMembro[e.membro] || []).push(e.dia);
      });
      Object.values(porDia).forEach(l => { if (new Set(l).size !== l.length) violacoes.duplicataNoDia++; });
      Object.entries(porMembro).forEach(([nome, dias]) => {
        const m = disp.find(x => x.nome === nome);
        if (!m.dividePlantao && dias.length > 1) violacoes.naoDivideEmVariosDias++;
        dias.forEach(d => { if (!m.disponivel[d]) violacoes.foraDaDisponibilidade++; });
        if (membros[nome].ativo === false) violacoes.inativoAlocado++;
      });
    }
  }
}

Object.entries(violacoes).forEach(([k, v]) => {
  const ok = v === 0; if (!ok) falhas++;
  console.log((ok ? '✅' : '❌') + ' ' + k + ': ' + v + ' violações');
});
console.log('\n' + cenarios + ' cenários simulados.');
process.exit(falhas ? 1 : 0);
