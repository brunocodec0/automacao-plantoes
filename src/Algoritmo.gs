// ============================================================
// ALGORITMO DE GERAÇÃO DE ESCALA
// Arquivo: Algoritmo.gs
// ============================================================

function gerarEscalaBase(disponibilidade, membros, diretores, historico, semana, ano) {
  const config = lerConfig();
  const meta   = config.MEMBROS_POR_DIA;

  // ── 1. Pré-computar limite máximo de dias por membro ─────
  // divide=false → SEMPRE 1 dia na semana, sem exceção
  // divide=true  → usa MAX_PLANTOES_SEMANA da Config (padrão 2)
  // IMPORTANTE: usar .trim() no nome para evitar espaços sobrando
  const maxPorMembro = {};
  disponibilidade.forEach(m => {
    const nome = m.nome.trim();
    if (!m.dividePlantao) {
      maxPorMembro[nome] = 1;
    } else {
      const cfg = membros[nome];
      maxPorMembro[nome] = (cfg && cfg.maxPlantoes) ? cfg.maxPlantoes : config.MAX_PLANTOES_SEMANA;
    }
  });

  console.log('=== LIMITES POR MEMBRO ===');
  Object.keys(maxPorMembro).forEach(nome => {
    console.log(nome + ' → max=' + maxPorMembro[nome]);
  });

  // ── 2. Disponíveis por dia ───────────────────────────────
  const disponiveisPorDia = {};
  DIAS_SEMANA.forEach(dia => {
    disponiveisPorDia[dia] = disponibilidade
      .filter(m => {
        const ativo = !membros[m.nome] || membros[m.nome].ativo !== false;
        return m.disponivel[dia] && ativo;
      })
      .map(m => m.nome);
  });

  // ── 3. Ordenar candidatos por dia ────────────────────────
  // Critério: histórico neste dia (menos vezes = prioridade maior)
  // + rotação semanal por seed para variar ao longo das semanas
  DIAS_SEMANA.forEach(dia => {
    let lista = disponiveisPorDia[dia].slice();

    if (config.ROTACAO_ATIVA) {
      lista = rotacionarArray(lista, semana, dia);
    }

    lista.sort((a, b) => {
      const ha = (historico[a] && historico[a][dia]) || 0;
      const hb = (historico[b] && historico[b][dia]) || 0;
      return ha - hb;
    });

    disponiveisPorDia[dia] = lista;
  });

  // ── 4. Estruturas de controle da alocação ───────────────
  const alocadosPorDia    = {};  // { dia: [nomes já alocados] }
  const plantoesPorMembro = {};  // { nome: contagem de dias alocados na semana }

  DIAS_SEMANA.forEach(dia => { alocadosPorDia[dia] = []; });
  disponibilidade.forEach(m => { plantoesPorMembro[m.nome] = 0; });

  // Verifica se um membro PODE ser alocado num dia específico
  function podeAlocar(nome, dia) {
    if (alocadosPorDia[dia].includes(nome))       return false; // já está neste dia
    if (plantoesPorMembro[nome] >= maxPorMembro[nome]) return false; // atingiu limite semanal
    return true;
  }

  // Efetua a alocação
  function alocar(nome, dia) {
    alocadosPorDia[dia].push(nome);
    plantoesPorMembro[nome]++;
  }

  // ── 5. ALOCAÇÃO DE DIAS FIXOS (prioridade máxima) ──────
  // Membros com Dia_Fixo na aba Membros são alocados primeiro,
  // ignorando a ordem do round-robin mas respeitando disponibilidade do Forms
  DIAS_SEMANA.forEach(dia => {
    disponibilidade.forEach(m => {
      const nome    = m.nome.trim();
      const cfg     = membros[nome];
      const fixos   = cfg && cfg.diasFixos ? cfg.diasFixos : [];
      if (!fixos.includes(dia)) return;          // não tem dia fixo aqui
      if (cfg && cfg.ativo === false) return;    // membro inativo nunca é alocado
      if (!m.disponivel[dia]) return;            // marcou indisponível no Forms esta semana
      if (!podeAlocar(nome, dia)) return;        // já alocado ou limite atingido
      alocar(nome, dia);
    });
  });

  // ── 6. ROUND-ROBIN: rodada a rodada até atingir meta ────
  // Rodada 1: cada dia pega seu 1º candidato elegível
  // Rodada 2: cada dia pega seu 2º candidato elegível
  // ...
  // Isso garante que TODOS os dias têm pelo menos 1 membro
  // antes de qualquer dia ter 2, 3, etc.
  for (let rodada = 0; rodada < meta; rodada++) {
    DIAS_SEMANA.forEach(dia => {
      if (alocadosPorDia[dia].length > rodada) return; // este dia já tem membro nesta rodada

      for (const candidato of disponiveisPorDia[dia]) {
        if (podeAlocar(candidato, dia)) {
          alocar(candidato, dia);
          break;
        }
      }
    });
  }

  // ── 7. Completar dias abaixo da meta com quem ainda pode ──
  //   // Nunca duplica no mesmo dia
  DIAS_SEMANA.forEach(dia => {
    // Tentar completar até a meta com quem ainda pode
    const candidatosExtras = disponiveisPorDia[dia]
      .filter(c => podeAlocar(c, dia))
      .sort((a, b) => (plantoesPorMembro[a] || 0) - (plantoesPorMembro[b] || 0));

    for (const c of candidatosExtras) {
      if (alocadosPorDia[dia].length >= meta) break;
      alocar(c, dia);
    }
  });

  // ── 8. Dias sem candidatos elegíveis ────────────────────
  // Decisão de projeto: NUNCA violar o limite semanal para preencher um dia.
  // Se ninguém elegível está disponível, o dia fica vazio — melhor do que
  // colocar em dois dias quem não divide plantão.

  // ── 9. Log final ─────────────────────────────────────────
  console.log('=== ESCALA GERADA (Semana ' + semana + '/' + ano + ') ===');
  DIAS_SEMANA.forEach(dia => {
    console.log(dia + ': [' + alocadosPorDia[dia].join(', ') + ']');
  });
  console.log('Plantões/membro: ' + JSON.stringify(plantoesPorMembro));

  // ── 10. Montar resultado ──────────────────────────────────
  const resultado = [];
  DIAS_SEMANA.forEach(dia => {
    const diretor = diretores[dia] || '';
    const aloc    = alocadosPorDia[dia];

    if (aloc.length === 0) {
      resultado.push({
        id: gerarId(dia, semana, ano, 'VAZIO'),
        dia, diretor,
        membro: '(sem membros disponíveis)',
        semana, ano,
      });
      return;
    }

    aloc.forEach(membro => {
      resultado.push({
        id: gerarId(dia, semana, ano, membro),
        dia, diretor, membro, semana, ano,
      });
    });
  });

  return resultado;
}

// ──────────────────────────────────────────────
// ROTAÇÃO SEMANAL
// ──────────────────────────────────────────────
function rotacionarArray(arr, semana, dia) {
  if (!arr || arr.length === 0) return arr;
  const idxDia = DIAS_SEMANA.indexOf(dia);
  const seed   = (semana * 7 + idxDia) % arr.length;
  return [...arr.slice(seed), ...arr.slice(0, seed)];
}

// ──────────────────────────────────────────────
// SALVAR ESCALA BASE
// ──────────────────────────────────────────────
function salvarEscalaBase(escala, semana, ano) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const abaBase = ss.getSheetByName(ABAS.ESCALA_BASE);

  if (!abaBase) throw new Error('Aba "' + ABAS.ESCALA_BASE + '" não encontrada.');

  const dadosExistentes = abaBase.getDataRange().getValues();
  const linhasParaDeletar = [];
  for (let i = dadosExistentes.length - 1; i >= 1; i--) {
    const s = String(dadosExistentes[i][COL_BASE.SEMANA]).trim();
    const a = String(dadosExistentes[i][COL_BASE.ANO]).trim();
    if (s === String(semana) && a === String(ano)) linhasParaDeletar.push(i + 1);
  }
  linhasParaDeletar.forEach(l => abaBase.deleteRow(l));

  const novasLinhas = escala.map(e => [e.id, e.dia, e.diretor, e.membro, e.semana, e.ano]);

  if (novasLinhas.length > 0) {
    const ultimaLinha = abaBase.getLastRow() + 1;
    abaBase.getRange(ultimaLinha, 1, novasLinhas.length, 6).setValues(novasLinhas);
    for (let i = 0; i < novasLinhas.length; i++) {
      const cor = COR_DIAS[novasLinhas[i][COL_BASE.DIA]] || '#FFFFFF';
      abaBase.getRange(ultimaLinha + i, 1, 1, 6).setBackground(cor);
    }
  }

  SpreadsheetApp.flush();
}

// ──────────────────────────────────────────────
// ATUALIZAR HISTÓRICO
// ──────────────────────────────────────────────
function atualizarHistorico(escala) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let abaHist = ss.getSheetByName(ABAS.HISTORICO);

  if (!abaHist) {
    abaHist = ss.insertSheet(ABAS.HISTORICO);
    abaHist.appendRow(['Nome', 'Dia', 'Semana', 'Ano']);
    abaHist.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor('#FFFFFF');
  }

  const novasLinhas = escala
    .filter(e => !e.membro.startsWith('(sem'))
    .map(e => [e.membro, e.dia, e.semana, e.ano]);

  if (novasLinhas.length > 0) {
    abaHist.getRange(abaHist.getLastRow() + 1, 1, novasLinhas.length, 4).setValues(novasLinhas);
  }

  SpreadsheetApp.flush();
}
