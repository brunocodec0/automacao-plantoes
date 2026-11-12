// ============================================================
// ESCALA DE PLANTÕES — SISTEMA PRINCIPAL
// Arquivo: Code.gs
// ============================================================

// ──────────────────────────────────────────────
// MENU PERSONALIZADO
// ──────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Escala')
    .addItem('📋 Gerar Escala Semanal', 'gerarEscalaSemanal')
    .addSeparator()
    .addItem('🔄 Aplicar Trocas Aprovadas', 'aplicarTrocas')
    .addItem('📊 Atualizar Escala Final', 'atualizarEscalaFinal')
    .addSeparator()
    .addItem('🏗️ Configurar Planilha (1ª vez)', 'configurarPlanilha')
    .addItem('🧹 Limpar Escala da Semana Atual', 'limparEscalaAtual')
    .addToUi();
}

// ──────────────────────────────────────────────
// GATILHO PRINCIPAL
// ──────────────────────────────────────────────
function gerarEscalaSemanal() {
  const ui = SpreadsheetApp.getUi();

  try {
    const refData     = getDataReferencia();
    const semanaAtual = getSemanaISO(refData);
    const anoAtual    = refData.getFullYear();

    const resp = ui.alert(
      '📋 Gerar Escala',
      `Gerar escala para Semana ${semanaAtual}/${anoAtual}?\n\nIsso substituirá qualquer escala base existente para essa semana.`,
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;

    const disponibilidade = lerDisponibilidade();
    if (!disponibilidade || disponibilidade.length === 0) {
      ui.alert('❌ Erro', 'Nenhuma disponibilidade encontrada na aba "Disponibilidade".', ui.ButtonSet.OK);
      return;
    }

    const membros  = lerMembros();
    const diretores = lerDiretores();
    const historico = lerHistorico();

    const escalaBase = gerarEscalaBase(disponibilidade, membros, diretores, historico, semanaAtual, anoAtual);
    salvarEscalaBase(escalaBase, semanaAtual, anoAtual);
    atualizarHistorico(escalaBase);
    atualizarEscalaFinal();

    ui.alert('✅ Sucesso', `Escala da Semana ${semanaAtual}/${anoAtual} gerada!\n\nAcesse a aba "Escala Final" para visualizar e tirar print.`, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('❌ Erro inesperado', e.message + '\n\n' + e.stack, ui.ButtonSet.OK);
    console.error(e);
  }
}

// ──────────────────────────────────────────────
// ATUALIZAR ESCALA FINAL — Visual tipo tabela de grupo
// ──────────────────────────────────────────────
function atualizarEscalaFinal() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const abaBase   = ss.getSheetByName(ABAS.ESCALA_BASE);
  const abaTrocas = ss.getSheetByName(ABAS.TROCAS);
  const abaFinal  = ss.getSheetByName(ABAS.ESCALA_FINAL);

  if (!abaBase || !abaFinal) {
    throw new Error('Abas "Escala Base" ou "Escala Final" não encontradas.');
  }

  const dadosBase = abaBase.getDataRange().getValues();
  if (dadosBase.length <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ Aviso', 'Nenhuma escala base encontrada. Gere a escala semanal primeiro.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // ── Trocas aprovadas ────────────────────────
  const mapaTrocas = {};
  if (abaTrocas) {
    const dadosTrocas = abaTrocas.getDataRange().getValues();
    for (let i = 1; i < dadosTrocas.length; i++) {
      const row = dadosTrocas[i];
      const id     = String(row[COL_TROCAS.ID_ESCALA]).trim();
      const orig   = String(row[COL_TROCAS.NOME_ORIGINAL]).trim();
      const novo   = String(row[COL_TROCAS.NOVO_MEMBRO]).trim();
      const status = String(row[COL_TROCAS.STATUS]).trim().toLowerCase();
      if (status === 'aprovado' && id && novo) {
        mapaTrocas[`${id}::${orig}`] = novo;
      }
    }
  }

  // ── Agrupar membros por dia — APENAS semana atual ───
  const _refData     = getDataReferencia();
  const semanaFiltro = String(getSemanaISO(_refData));
  const anoFiltro    = String(_refData.getFullYear());

  const escalaPorDia = {};
  DIAS_SEMANA.forEach(dia => { escalaPorDia[dia] = { diretor: '', membros: [] }; });

  for (let i = 1; i < dadosBase.length; i++) {
    const row    = dadosBase[i];
    const id     = String(row[COL_BASE.ID]).trim();
    const dia    = String(row[COL_BASE.DIA]).trim();
    const dir    = String(row[COL_BASE.DIRETOR]).trim();
    const membro = String(row[COL_BASE.MEMBRO]).trim();
    const semR   = String(row[COL_BASE.SEMANA]).trim();
    const anoR   = String(row[COL_BASE.ANO]).trim();

    // FILTRO: ignorar registros de outras semanas
    if (semR !== semanaFiltro || anoR !== anoFiltro) continue;
    if (!dia || !escalaPorDia[dia]) continue;

    escalaPorDia[dia].diretor = dir;

    if (membro.startsWith('(sem')) continue;

    const chave       = `${id}::${membro}`;
    const membroFinal = mapaTrocas[chave] || membro;
    escalaPorDia[dia].membros.push(membroFinal);
  }

  // ── Calcular datas da semana atual ──────────
  const _ref2  = getDataReferencia();
  const semana = getSemanaISO(_ref2);
  const ano    = _ref2.getFullYear();
  const datas  = getDatasDaSemana(semana, ano);

  // ── Limpar e formatar a aba Final ───────────
  abaFinal.clear();
  abaFinal.clearFormats();

  // Descongelar linhas/colunas antigas
  abaFinal.setFrozenRows(0);
  abaFinal.setFrozenColumns(0);

  // Cores do modelo
  const COR_HEADER     = '#3d1a6e'; // roxo escuro
  const COR_DIRETOR    = '#5c3399'; // roxo médio
  const COR_MEMBRO     = '#e8dff5'; // roxo claro
  const COR_MEMBRO_ALT = '#f3eefa'; // roxo mais claro (alternado)
  const FONTE_BRANCA   = '#ffffff';
  const FONTE_ESCURA   = '#2d1a4a';

  // ── Linha 1: cabeçalhos dos dias ────────────
  const labelsDias = DIAS_SEMANA.map((dia, i) => {
    const data = datas[i];
    const dd   = String(data.getDate()).padStart(2, '0');
    const mm   = String(data.getMonth() + 1).padStart(2, '0');
    return `${dia}-Feira\n(${dd}/${mm})`;
  });

  abaFinal.getRange(1, 1, 1, 5).setValues([labelsDias]);
  const headerRange = abaFinal.getRange(1, 1, 1, 5);
  headerRange
    .setBackground(COR_HEADER)
    .setFontColor(FONTE_BRANCA)
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // Altura do cabeçalho
  abaFinal.setRowHeight(1, 50);

  // ── Linha 2: diretores fixos ─────────────────
  const nomesDiretores = DIAS_SEMANA.map(dia => escalaPorDia[dia].diretor || '—');
  abaFinal.getRange(2, 1, 1, 5).setValues([nomesDiretores]);
  const diretorRange = abaFinal.getRange(2, 1, 1, 5);
  diretorRange
    .setBackground(COR_DIRETOR)
    .setFontColor(FONTE_BRANCA)
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  abaFinal.setRowHeight(2, 36);

  // ── Linhas 3+: membros ───────────────────────
  // Descobrir quantas linhas precisamos (maior lista de membros)
  const maxMembros = Math.max(...DIAS_SEMANA.map(d => escalaPorDia[d].membros.length));

  for (let i = 0; i < maxMembros; i++) {
    const linhaDados = DIAS_SEMANA.map(dia => escalaPorDia[dia].membros[i] || '');
    const linhaNum   = i + 3;

    abaFinal.getRange(linhaNum, 1, 1, 5).setValues([linhaDados]);

    // Cor alternada para facilitar leitura
    const cor = (i % 2 === 0) ? COR_MEMBRO : COR_MEMBRO_ALT;
    abaFinal.getRange(linhaNum, 1, 1, 5)
      .setBackground(cor)
      .setFontColor(FONTE_ESCURA)
      .setFontSize(10)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    abaFinal.setRowHeight(linhaNum, 30);
  }

  // ── Bordas na tabela inteira ─────────────────
  const totalLinhas = maxMembros + 2; // header + diretor + membros
  abaFinal.getRange(1, 1, totalLinhas, 5)
    .setBorder(true, true, true, true, true, true, '#5c3399', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Borda mais grossa no header e diretor
  abaFinal.getRange(1, 1, 2, 5)
    .setBorder(true, true, true, true, true, true, COR_HEADER, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // ── Largura das colunas ──────────────────────
  for (let c = 1; c <= 5; c++) {
    abaFinal.setColumnWidth(c, 160);
  }

  // ── Rodapé ───────────────────────────────────
  const linhaRodape = totalLinhas + 2;
  abaFinal.getRange(linhaRodape, 1).setValue(`Semana ${semana}/${ano}  •  Gerado em ${new Date().toLocaleString('pt-BR')}`);
  abaFinal.getRange(linhaRodape, 1, 1, 5).merge();
  abaFinal.getRange(linhaRodape, 1)
    .setFontStyle('italic')
    .setFontColor('#888888')
    .setFontSize(9)
    .setHorizontalAlignment('center');

  // Ocultar linhas/colunas além da tabela para print limpo
  const ultimaColuna = abaFinal.getMaxColumns();
  if (ultimaColuna > 5) {
    abaFinal.hideColumns(6, ultimaColuna - 5);
  }

  SpreadsheetApp.flush();
}

// ──────────────────────────────────────────────
// CALCULAR DATAS DA SEMANA ISO
// Retorna array de 5 Dates (seg a sex) da semana dada
// ──────────────────────────────────────────────
function getDatasDaSemana(semana, ano) {
  // Encontrar a primeira segunda-feira da semana ISO
  // A semana ISO começa na segunda-feira
  const jan4 = new Date(ano, 0, 4); // 4 de janeiro sempre está na semana 1
  const diaSemanaJan4 = jan4.getDay() || 7; // 1=seg ... 7=dom
  const primeiraSeg   = new Date(jan4);
  primeiraSeg.setDate(jan4.getDate() - (diaSemanaJan4 - 1));

  // Segunda-feira da semana desejada
  const segDesejada = new Date(primeiraSeg);
  segDesejada.setDate(primeiraSeg.getDate() + (semana - 1) * 7);

  // Retornar seg, ter, qua, qui, sex
  return [0, 1, 2, 3, 4].map(offset => {
    const d = new Date(segDesejada);
    d.setDate(segDesejada.getDate() + offset);
    return d;
  });
}

// ──────────────────────────────────────────────
// APLICAR TROCAS
// ──────────────────────────────────────────────
function aplicarTrocas() {
  atualizarEscalaFinal();
  SpreadsheetApp.getUi().alert('✅ Trocas aplicadas', 'A Escala Final foi atualizada com as trocas aprovadas.', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ──────────────────────────────────────────────
// LIMPAR ESCALA DA SEMANA ATUAL
// ──────────────────────────────────────────────
function limparEscalaAtual() {
  const ui  = SpreadsheetApp.getUi();
  const resp = ui.alert('🧹 Limpar Escala', 'Remove os registros da semana atual da "Escala Base". Continuar?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const abaBase = ss.getSheetByName(ABAS.ESCALA_BASE);
  if (!abaBase) return;

  const _refLimp    = getDataReferencia();
  const semanaAtual = String(getSemanaISO(_refLimp));
  const anoAtual    = String(_refLimp.getFullYear());
  const dados       = abaBase.getDataRange().getValues();
  const linhas      = [];

  for (let i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][COL_BASE.SEMANA]) === semanaAtual && String(dados[i][COL_BASE.ANO]) === anoAtual) {
      linhas.push(i + 1);
    }
  }

  linhas.forEach(l => abaBase.deleteRow(l));
  ui.alert('✅ Pronto', `${linhas.length} registros removidos.`, ui.ButtonSet.OK);
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function getSemanaISO(data) {
  const d      = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Retorna a data de referência para geração da escala:
// - Se hoje é seg-sex: usa a semana atual
// - Se hoje é sáb ou dom: usa a próxima semana
function getDataReferencia() {
  const hoje     = new Date();
  const diaSemana = hoje.getDay(); // 0=dom, 6=sáb
  if (diaSemana === 0 || diaSemana === 6) {
    // Avançar para a próxima segunda-feira
    const diasAteSegunda = diaSemana === 6 ? 2 : 1;
    const proxSegunda    = new Date(hoje);
    proxSegunda.setDate(hoje.getDate() + diasAteSegunda);
    return proxSegunda;
  }
  return hoje;
}

function formatarCelula(range, cor) {
  range.setBackground(cor).setFontColor('#FFFFFF');
}

function gerarId(dia, semana, ano, membro) {
  return `${dia}-S${semana}-${ano}-${membro}`.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 40);
}
