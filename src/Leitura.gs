// ============================================================
// LEITURA DE DADOS
// Arquivo: Leitura.gs
// ============================================================

// ──────────────────────────────────────────────
// MAPEAMENTO EXATO DO FORMULÁRIO DA INICIATIVA
// Baseado no cabeçalho real da planilha de respostas
// ──────────────────────────────────────────────
const CABECALHO_FORMS = {
  TIMESTAMP     : 'Carimbo de data/hora',
  EMAIL         : 'Endereço de e-mail',
  NOME          : 'Digite seu nome',
  GRADE         : 'Insira a sua grade curricular desse semestre:',
  FAZ_PLANTAO   : 'Você faz plantão?',
  DIVIDE_PLANTAO: 'Você precisará dividir plantão?',
  SEGUNDA       : 'Você pode fazer plantão às segundas-feiras?',
  TERCA         : 'Você pode fazer plantão às terças-feiras?',
  QUARTA        : 'Você pode fazer plantão às quartas-feiras?',
  QUINTA        : 'Você pode fazer plantão às quintas-feiras?',
  SEXTA         : 'Você pode fazer plantão às sextas-feiras?',
  MOTIVO_NAO    : 'Se você selecionou "Não" em algum momento, apresente o(s) motivo(s) pelo(s) qual(is) você não pode fazer plantão.',
  MOTIVO_DIVIDE : 'Qual é o motivo pelo qual você precisa dividir plantão? ',
  HORARIO_SEG   : 'Segunda-feira',
  HORARIO_TER   : 'Terça-feira',
  HORARIO_QUA   : 'Quarta-feira',
  HORARIO_QUI   : 'Quinta-feira',
  HORARIO_SEX   : 'Sexta-feira',
};

// Mapeamento dia → chave do cabeçalho
const DIA_PARA_CABECALHO = {
  'Segunda' : CABECALHO_FORMS.SEGUNDA,
  'Terça'   : CABECALHO_FORMS.TERCA,
  'Quarta'  : CABECALHO_FORMS.QUARTA,
  'Quinta'  : CABECALHO_FORMS.QUINTA,
  'Sexta'   : CABECALHO_FORMS.SEXTA,
};

// Mapeamento dia → chave de horário (para divisão de plantão)
const DIA_PARA_HORARIO = {
  'Segunda' : CABECALHO_FORMS.HORARIO_SEG,
  'Terça'   : CABECALHO_FORMS.HORARIO_TER,
  'Quarta'  : CABECALHO_FORMS.HORARIO_QUA,
  'Quinta'  : CABECALHO_FORMS.HORARIO_QUI,
  'Sexta'   : CABECALHO_FORMS.HORARIO_SEX,
};

// ──────────────────────────────────────────────
// LER DISPONIBILIDADE
// Retorna: [{
//   nome, 
//   fazPlantao,
//   dividePlantao,
//   disponivel: { Segunda: true, Terça: false, ... },
//   horarios:   { Segunda: '13h às 15h', ... }
// }]
// ──────────────────────────────────────────────
function lerDisponibilidade() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABAS.DISPONIBILIDADE);

  if (!aba) throw new Error(`Aba "${ABAS.DISPONIBILIDADE}" não encontrada.`);

  const dados = aba.getDataRange().getValues();
  if (dados.length <= 1) return [];

  // Mapear índice de cada coluna pelo cabeçalho real
  const header = dados[0].map(h => String(h).trim());
  const idxPorNome = {};
  header.forEach((h, i) => { idxPorNome[h] = i; });

  // Função auxiliar: busca coluna por texto exato ou parcial
  function acharColuna(textoAlvo) {
    // 1. Tentativa: match exato
    if (idxPorNome[textoAlvo] !== undefined) return idxPorNome[textoAlvo];

    // 2. Tentativa: match parcial normalizado
    const alvoNorm = normalizarTexto(textoAlvo);
    const idx = header.findIndex(h => normalizarTexto(h).includes(alvoNorm) || alvoNorm.includes(normalizarTexto(h)));
    return idx !== -1 ? idx : -1;
  }

  // Resolver índices de todas as colunas relevantes
  const idxNome         = acharColuna(CABECALHO_FORMS.NOME);
  const idxFazPlantao   = acharColuna(CABECALHO_FORMS.FAZ_PLANTAO);
  const idxDividePlantao= acharColuna(CABECALHO_FORMS.DIVIDE_PLANTAO);

  const idxDias = {};
  DIAS_SEMANA.forEach(dia => {
    idxDias[dia] = acharColuna(DIA_PARA_CABECALHO[dia]);
  });

  const idxHorarios = {};
  DIAS_SEMANA.forEach(dia => {
    idxHorarios[dia] = acharColuna(DIA_PARA_HORARIO[dia]);
  });

  // Logar mapeamento no console para debug (visível no Apps Script > Execuções)
  console.log('=== MAPEAMENTO DE COLUNAS ===');
  console.log('Nome:', idxNome, '| Faz plantão:', idxFazPlantao, '| Divide:', idxDividePlantao);
  DIAS_SEMANA.forEach(dia => {
    console.log(`${dia}: col ${idxDias[dia]} | horário: col ${idxHorarios[dia]}`);
  });

  if (idxNome === -1) {
    throw new Error('Coluna "Digite seu nome" não encontrada na aba Disponibilidade. Verifique o cabeçalho da linha 1.');
  }

  // Processar respostas — guardar apenas a mais recente por membro
  const respostasPorMembro = {};

  for (let i = 1; i < dados.length; i++) {
    const row  = dados[i];
    const nome = String(row[idxNome] || '').trim();
    if (!nome) continue;

    // "Você faz plantão?" — se resposta for "Não", pular alocação
    const fazPlantaoVal = idxFazPlantao !== -1 ? String(row[idxFazPlantao] || '').trim() : 'Sim';
    const fazPlantao    = !['não', 'nao', 'no', 'false'].includes(fazPlantaoVal.toLowerCase());

    // "Você precisará dividir plantão?"
    const divideVal    = idxDividePlantao !== -1 ? String(row[idxDividePlantao] || '').trim() : 'Não';
    const dividePlantao = ['sim', 'yes', 'true'].includes(divideVal.toLowerCase());

    // Horários de divisão (colunas "Segunda-feira", "Terça-feira" etc.)
    // Quem divide plantão informa disponibilidade AQUI, por escrito
    const horarios = {};
    DIAS_SEMANA.forEach(dia => {
      const idx = idxHorarios[dia];
      if (idx !== -1 && idx !== undefined) {
        const val = String(row[idx] || '').trim();
        if (val) horarios[dia] = val;
      }
    });

    // Disponibilidade por dia
    // - Quem NAO divide: lê das colunas Sim/Não
    // - Quem DIVIDE: disponível nos dias em que preencheu horário por escrito
    const disponivel = {};
    DIAS_SEMANA.forEach(dia => {
      if (dividePlantao) {
        disponivel[dia] = !!horarios[dia]; // disponível se escreveu o horário
      } else {
        const idx = idxDias[dia];
        if (idx === -1 || idx === undefined) {
          disponivel[dia] = false;
          return;
        }
        const val = String(row[idx] || '').trim().toLowerCase();
        disponivel[dia] = ['sim', 'yes', 'true', '1', 'x'].includes(val);
      }
    });

    // Guardar sempre a resposta mais recente (sobrescreve)
    respostasPorMembro[nome] = {
      nome,
      fazPlantao,
      dividePlantao,
      disponivel,
      horarios,
    };
  }

  // Filtrar apenas quem faz plantão
  return Object.values(respostasPorMembro).filter(m => m.fazPlantao);
}

// ──────────────────────────────────────────────
// LER MEMBROS
// Retorna: { nome: { maxPlantoes, podeDividir, ativo } }
// Se o membro respondeu o Forms, pode_dividir vem de lá automaticamente
// ──────────────────────────────────────────────
function lerMembros() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABAS.MEMBROS);
  const config = lerConfig();

  if (!aba) return {};

  const dados  = aba.getDataRange().getValues();
  const membros = {};

  for (let i = 1; i < dados.length; i++) {
    const row  = dados[i];
    const nome = String(row[COL_MEMBROS.NOME] || '').trim();
    if (!nome) continue;

    const maxPlantoes = parseInt(row[COL_MEMBROS.MAX_PLANTOES]) || config.MAX_PLANTOES_SEMANA;
    const podeDividir = String(row[COL_MEMBROS.PODE_DIVIDIR] || '').toUpperCase() === 'TRUE';
    const ativo       = String(row[COL_MEMBROS.ATIVO] || 'TRUE').toUpperCase() !== 'FALSE';

    // Dia(s) fixo(s) — ex: "Quarta" ou "Segunda,Sexta"
    const diaFixoRaw = String(row[COL_MEMBROS.DIA_FIXO] || '').trim();
    const diasFixos  = diaFixoRaw
      ? diaFixoRaw.split(',').map(d => d.trim()).filter(d => DIAS_SEMANA.includes(d))
      : [];

    membros[nome] = { nome, maxPlantoes, podeDividir, ativo, diasFixos };
  }

  return membros;
}

// ──────────────────────────────────────────────
// LER DIRETORES FIXOS
// Retorna: { 'Segunda': 'NomeDiretor', ... }
// ──────────────────────────────────────────────
function lerDiretores() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABAS.CONFIG);

  const diretores = {};
  DIAS_SEMANA.forEach(d => diretores[d] = '');
  if (!aba) return diretores;

  const dados = aba.getDataRange().getValues();
  let emSecaoDiretores = false;

  for (let i = 0; i < dados.length; i++) {
    const col0 = String(dados[i][0] || '').trim().toUpperCase();
    const col1 = String(dados[i][1] || '').trim();

    if (col0 === 'DIRETORES') {
      emSecaoDiretores = true;
      continue;
    }

    if (emSecaoDiretores) {
      if (!col0 && !col1) break;
      if (col0 === 'CHAVE') break;

      DIAS_SEMANA.forEach(dia => {
        if (normalizarTexto(col0) === normalizarTexto(dia)) {
          diretores[dia] = col1;
        }
      });
    }
  }

  return diretores;
}

// ──────────────────────────────────────────────
// LER HISTÓRICO DE PLANTÕES
// ──────────────────────────────────────────────
function lerHistorico() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABAS.HISTORICO);
  const historico = {};
  if (!aba) return historico;

  const dados = aba.getDataRange().getValues();
  if (dados.length <= 1) return historico;

  for (let i = 1; i < dados.length; i++) {
    const row  = dados[i];
    const nome = String(row[COL_HIST.NOME] || '').trim();
    const dia  = String(row[COL_HIST.DIA]  || '').trim();
    if (!nome || !dia) continue;

    if (!historico[nome]) historico[nome] = {};
    historico[nome][dia] = (historico[nome][dia] || 0) + 1;
  }

  return historico;
}

// ──────────────────────────────────────────────
// NORMALIZAR TEXTO (remove acentos, lowercase)
// ──────────────────────────────────────────────
function normalizarTexto(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Alias para compatibilidade com outros arquivos
function normalizarDia(str) {
  return normalizarTexto(str);
}
