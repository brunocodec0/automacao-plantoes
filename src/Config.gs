// ============================================================
// CONFIGURAÇÕES E CONSTANTES
// Arquivo: Config.gs
// ============================================================

// ──────────────────────────────────────────────
// NOMES DAS ABAS
// ──────────────────────────────────────────────
const ABAS = {
  DISPONIBILIDADE : 'Disponibilidade',
  MEMBROS         : 'Membros',
  ESCALA_BASE     : 'Escala Base',
  TROCAS          : 'Trocas',
  ESCALA_FINAL    : 'Escala Final',
  CONFIG          : 'Config',
  HISTORICO       : 'Histórico',
};

// ──────────────────────────────────────────────
// MAPEAMENTO DE COLUNAS — Disponibilidade
// (ajuste se a ordem do Forms for diferente)
// Índice 0-based
// ──────────────────────────────────────────────
const COL_DISP = {
  TIMESTAMP : 0,
  NOME      : 1,
  SEGUNDA   : 2,
  TERCA     : 3,
  QUARTA    : 4,
  QUINTA    : 5,
  SEXTA     : 6,
};

// ──────────────────────────────────────────────
// MAPEAMENTO DE COLUNAS — Membros
// ──────────────────────────────────────────────
const COL_MEMBROS = {
  NOME            : 0,
  MAX_PLANTOES    : 1,  // número máximo de plantões na semana
  PODE_DIVIDIR    : 2,  // TRUE/FALSE — pode ter >1 plantão/dia?
  ATIVO           : 3,  // TRUE/FALSE — está ativo na equipe?
  DIA_FIXO        : 4,  // dia(s) fixo(s) — ex: "Quarta" ou "Segunda,Sexta"
};

// ──────────────────────────────────────────────
// MAPEAMENTO DE COLUNAS — Escala Base
// ──────────────────────────────────────────────
const COL_BASE = {
  ID      : 0,
  DIA     : 1,
  DIRETOR : 2,
  MEMBRO  : 3,
  SEMANA  : 4,
  ANO     : 5,
};

// ──────────────────────────────────────────────
// MAPEAMENTO DE COLUNAS — Trocas
// ──────────────────────────────────────────────
const COL_TROCAS = {
  ID_ESCALA     : 0,
  NOME_ORIGINAL : 1,
  NOVO_MEMBRO   : 2,
  DIA           : 3,
  SEMANA        : 4,
  STATUS        : 5,  // pendente / aprovado / rejeitado
  DATA_SOLICIT  : 6,
};

// ──────────────────────────────────────────────
// MAPEAMENTO DE COLUNAS — Histórico
// ──────────────────────────────────────────────
const COL_HIST = {
  NOME    : 0,
  DIA     : 1,
  SEMANA  : 2,
  ANO     : 3,
};

// ──────────────────────────────────────────────
// DIAS DA SEMANA (ordem canônica)
// ──────────────────────────────────────────────
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

// Mapeamento para leitura da disponibilidade
const DIA_PARA_COL_DISP = {
  'Segunda' : COL_DISP.SEGUNDA,
  'Terça'   : COL_DISP.TERCA,
  'Quarta'  : COL_DISP.QUARTA,
  'Quinta'  : COL_DISP.QUINTA,
  'Sexta'   : COL_DISP.SEXTA,
};

// ──────────────────────────────────────────────
// CORES DA INTERFACE
// ──────────────────────────────────────────────
const COR_TITULO    = '#1a237e'; // azul escuro
const COR_CABECALHO = '#283593'; // azul médio

const COR_DIAS = {
  'Segunda' : '#E8EAF6',
  'Terça'   : '#E3F2FD',
  'Quarta'  : '#E8F5E9',
  'Quinta'  : '#FFF3E0',
  'Sexta'   : '#FCE4EC',
};

// ──────────────────────────────────────────────
// DEFAULTS DE CONFIGURAÇÃO
// (lidos da aba "Config" se existir)
// ──────────────────────────────────────────────
const CONFIG_DEFAULTS = {
  MAX_PLANTOES_SEMANA    : 2,   // max de plantões por membro por semana (global)
  MEMBROS_POR_DIA        : 2,   // quantos membros por dia (ideal)
  ROTACAO_ATIVA          : true,
  SEED_ROTACAO           : 'semana', // 'semana' = seed pela semana ISO
};

// ──────────────────────────────────────────────
// LEITURA DE CONFIGS DA ABA Config
// ──────────────────────────────────────────────
function lerConfig() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABAS.CONFIG);
  if (!aba) return CONFIG_DEFAULTS;

  const dados = aba.getDataRange().getValues();
  const config = Object.assign({}, CONFIG_DEFAULTS);

  for (let i = 1; i < dados.length; i++) {
    const chave = String(dados[i][0]).trim();
    const valor = dados[i][1];
    if (!chave) continue;

    switch (chave) {
      case 'MAX_PLANTOES_SEMANA':
        config.MAX_PLANTOES_SEMANA = parseInt(valor) || CONFIG_DEFAULTS.MAX_PLANTOES_SEMANA;
        break;
      case 'MEMBROS_POR_DIA':
        config.MEMBROS_POR_DIA = parseInt(valor) || CONFIG_DEFAULTS.MEMBROS_POR_DIA;
        break;
      case 'ROTACAO_ATIVA':
        config.ROTACAO_ATIVA = String(valor).toUpperCase() === 'TRUE';
        break;
    }
  }

  return config;
}
