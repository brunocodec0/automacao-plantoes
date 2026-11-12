// ============================================================
// SETUP INICIAL DA PLANILHA
// Arquivo: Setup.gs
// ============================================================

// ──────────────────────────────────────────────
// CONFIGURAR PLANILHA (primeira execução)
// ──────────────────────────────────────────────
function configurarPlanilha() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const resp = ui.alert(
    '🏗️ Configurar Planilha',
    'Isso criará todas as abas necessárias (se não existirem) e aplicará a estrutura do sistema.\n\nAbas existentes NÃO serão sobrescritas.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  const resultados = [];

  // 1. Aba Membros
  if (!ss.getSheetByName(ABAS.MEMBROS)) {
    criarAbaMembros(ss);
    resultados.push('✅ Aba "Membros" criada');
  } else {
    resultados.push('⏭️ Aba "Membros" já existe — mantida');
  }

  // 2. Aba Escala Base
  if (!ss.getSheetByName(ABAS.ESCALA_BASE)) {
    criarAbaEscalaBase(ss);
    resultados.push('✅ Aba "Escala Base" criada');
  } else {
    resultados.push('⏭️ Aba "Escala Base" já existe — mantida');
  }

  // 3. Aba Trocas
  if (!ss.getSheetByName(ABAS.TROCAS)) {
    criarAbaTrocas(ss);
    resultados.push('✅ Aba "Trocas" criada');
  } else {
    resultados.push('⏭️ Aba "Trocas" já existe — mantida');
  }

  // 4. Aba Escala Final
  if (!ss.getSheetByName(ABAS.ESCALA_FINAL)) {
    criarAbaEscalaFinal(ss);
    resultados.push('✅ Aba "Escala Final" criada');
  } else {
    resultados.push('⏭️ Aba "Escala Final" já existe — mantida');
  }

  // 5. Aba Config
  if (!ss.getSheetByName(ABAS.CONFIG)) {
    criarAbaConfig(ss);
    resultados.push('✅ Aba "Config" criada com valores padrão');
  } else {
    resultados.push('⏭️ Aba "Config" já existe — mantida');
  }

  // 6. Aba Histórico
  if (!ss.getSheetByName(ABAS.HISTORICO)) {
    criarAbaHistorico(ss);
    resultados.push('✅ Aba "Histórico" criada');
  } else {
    resultados.push('⏭️ Aba "Histórico" já existe — mantida');
  }

  // 7. Verificar aba Disponibilidade
  if (!ss.getSheetByName(ABAS.DISPONIBILIDADE)) {
    criarAbaDisponibilidadeDemo(ss);
    resultados.push('⚠️ Aba "Disponibilidade" criada como DEMO — conecte seu Google Forms a ela');
  } else {
    resultados.push('✅ Aba "Disponibilidade" encontrada');
  }

  ui.alert(
    '✅ Configuração Concluída',
    resultados.join('\n') +
    '\n\n📌 PRÓXIMOS PASSOS:\n' +
    '1. Preencha a aba "Config" com os diretores fixos de cada dia\n' +
    '2. Preencha a aba "Membros" com os membros e regras\n' +
    '3. Conecte o Google Forms à aba "Disponibilidade"\n' +
    '4. Use o menu ⚙️ Escala > Gerar Escala Semanal',
    ui.ButtonSet.OK
  );
}

// ──────────────────────────────────────────────
// CRIADORES DE ABAS
// ──────────────────────────────────────────────

function criarAbaMembros(ss) {
  const aba = ss.insertSheet(ABAS.MEMBROS);

  const cabecalho = [['Nome', 'Max_Plantões_Semana', 'Pode_Dividir', 'Ativo', 'Dia_Fixo']];
  aba.getRange(1, 1, 1, 5).setValues(cabecalho);
  aba.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor('#FFFFFF');

  // Linhas de exemplo
  aba.appendRow(['Gabriela Torres', 2, 'TRUE',  'TRUE', '']);
  aba.appendRow(['Henrique Lopes',  2, 'TRUE',  'TRUE', '']);
  aba.appendRow(['Alice Prado',     1, 'FALSE', 'TRUE', 'Quarta']);   // dia fixo
  aba.appendRow(['Bruno Meireles',  1, 'FALSE', 'TRUE', '']);

  // Validação para Pode_Dividir
  const regra = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .setAllowInvalid(false)
    .build();
  aba.getRange('C2:C100').setDataValidation(regra);

  // Validação para Ativo
  const regraAtivo = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .setAllowInvalid(false)
    .build();
  aba.getRange('D2:D100').setDataValidation(regraAtivo);

  // Validação para Dia_Fixo (dropdown com opções)
  const regraDia = SpreadsheetApp.newDataValidation()
    .requireValueInList(['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta',
                         'Segunda,Terça', 'Segunda,Quarta', 'Segunda,Quinta', 'Segunda,Sexta',
                         'Terça,Quarta', 'Terça,Quinta', 'Terça,Sexta',
                         'Quarta,Quinta', 'Quarta,Sexta', 'Quinta,Sexta'], true)
    .setAllowInvalid(true) // permite digitar combinações customizadas
    .build();
  aba.getRange('E2:E100').setDataValidation(regraDia);

  // Notas explicativas
  aba.getRange('B1').setNote('Máximo de plantões que este membro pode fazer por semana');
  aba.getRange('C1').setNote('TRUE = pode dividir plantão em mais de um dia');
  aba.getRange('D1').setNote('FALSE = membro inativo (não será alocado)');
  aba.getRange('E1').setNote('Dia fixo de plantão. Ex: "Quarta" ou "Segunda,Sexta". Deixe vazio para rotação normal.');

  aba.setColumnWidth(1, 200);
  aba.setColumnWidth(2, 180);
  aba.setColumnWidth(3, 130);
  aba.setColumnWidth(4, 80);
  aba.setColumnWidth(5, 160);
}

function criarAbaEscalaBase(ss) {
  const aba = ss.insertSheet(ABAS.ESCALA_BASE);

  const cabecalho = [['ID', 'Dia', 'Diretor', 'Membro', 'Semana', 'Ano']];
  aba.getRange(1, 1, 1, 6).setValues(cabecalho);
  aba.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor('#FFFFFF');

  aba.setColumnWidth(1, 200);
  aba.setColumnWidth(2, 100);
  aba.setColumnWidth(3, 160);
  aba.setColumnWidth(4, 160);
  aba.setColumnWidth(5, 80);
  aba.setColumnWidth(6, 60);
}

function criarAbaTrocas(ss) {
  const aba = ss.insertSheet(ABAS.TROCAS);

  const cabecalho = [['ID_Escala', 'Nome_Original', 'Novo_Membro', 'Dia', 'Semana', 'Status', 'Data_Solicitacao']];
  aba.getRange(1, 1, 1, 7).setValues(cabecalho);
  aba.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor('#FFFFFF');

  // Validação de status
  const regraStatus = SpreadsheetApp.newDataValidation()
    .requireValueInList(['pendente', 'aprovado', 'rejeitado'], true)
    .setAllowInvalid(false)
    .build();
  aba.getRange('F2:F200').setDataValidation(regraStatus);

  // Linha de exemplo
  aba.appendRow([
    'Segunda-S25-2026-AlicePrado',
    'Alice Prado',
    'Bruno Meireles',
    'Segunda',
    25,
    'pendente',
    new Date().toLocaleDateString('pt-BR')
  ]);

  // Formatação condicional: aprovado = verde, pendente = amarelo, rejeitado = vermelho
  const regras = [];

  const regraAprov = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('aprovado')
    .setBackground('#C8E6C9')
    .setRanges([aba.getRange('F2:F200')])
    .build();

  const regraPend = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('pendente')
    .setBackground('#FFF9C4')
    .setRanges([aba.getRange('F2:F200')])
    .build();

  const regraRej = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('rejeitado')
    .setBackground('#FFCDD2')
    .setRanges([aba.getRange('F2:F200')])
    .build();

  regras.push(regraAprov, regraPend, regraRej);
  aba.setConditionalFormatRules(regras);

  // Notas
  aba.getRange('A1').setNote('Cole o ID da linha da "Escala Base" que deseja trocar');
  aba.getRange('B1').setNote('Nome exato do membro original na escala');
  aba.getRange('F1').setNote('Altere para "aprovado" para que a troca apareça na Escala Final');

  aba.setColumnWidth(1, 230);
  aba.setColumnWidth(2, 160);
  aba.setColumnWidth(3, 160);
  aba.setColumnWidth(4, 100);
  aba.setColumnWidth(5, 80);
  aba.setColumnWidth(6, 120);
  aba.setColumnWidth(7, 140);
}

function criarAbaEscalaFinal(ss) {
  const aba = ss.insertSheet(ABAS.ESCALA_FINAL);

  // Apenas estrutura base — será preenchida pelo gerador
  aba.getRange('A1').setValue('📅 ESCALA FINAL — execute "Gerar Escala Semanal" para preencher');
  aba.getRange('A1').setFontStyle('italic').setFontColor('#888888');
}

function criarAbaConfig(ss) {
  const aba = ss.insertSheet(ABAS.CONFIG);

  // Seção de parâmetros gerais
  aba.appendRow(['CHAVE', 'VALOR', 'DESCRIÇÃO']);
  aba.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor('#FFFFFF');

  aba.appendRow(['MAX_PLANTOES_SEMANA', 2, 'Máximo de plantões por membro por semana (global)']);
  aba.appendRow(['MEMBROS_POR_DIA', 2, 'Quantidade ideal de membros por dia']);
  aba.appendRow(['ROTACAO_ATIVA', 'TRUE', 'Ativar rotação semanal (TRUE/FALSE)']);

  // Linha separadora
  aba.appendRow(['', '', '']);
  aba.appendRow(['DIRETORES', '', 'Diretor fixo por dia (preencha o VALOR)']);
  aba.getRange(6, 1, 1, 3).setFontWeight('bold').setBackground('#37474F').setFontColor('#FFFFFF');

  DIAS_SEMANA.forEach(dia => {
    aba.appendRow([dia, '', `Diretor fixo da ${dia}`]);
  });

  aba.setColumnWidth(1, 200);
  aba.setColumnWidth(2, 200);
  aba.setColumnWidth(3, 350);

  aba.getRange('B2').setNote('Número inteiro ≥ 1');
  aba.getRange('B3').setNote('Número inteiro ≥ 1');
  aba.getRange('B4').setNote('Escreva TRUE ou FALSE');
}

function criarAbaHistorico(ss) {
  const aba = ss.insertSheet(ABAS.HISTORICO);

  const cabecalho = [['Nome', 'Dia', 'Semana', 'Ano']];
  aba.getRange(1, 1, 1, 4).setValues(cabecalho);
  aba.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground(COR_CABECALHO).setFontColor('#FFFFFF');

  aba.setColumnWidth(1, 180);
  aba.setColumnWidth(2, 100);
  aba.setColumnWidth(3, 80);
  aba.setColumnWidth(4, 60);
}

function criarAbaDisponibilidadeDemo(ss) {
  const aba = ss.insertSheet(ABAS.DISPONIBILIDADE);

  // Mesmo cabeçalho gerado pelo Google Forms real (formato das respostas)
  const cab = [
    'Carimbo de data/hora', 'Endereço de e-mail', 'Digite seu nome',
    'Insira a sua grade curricular desse semestre:',
    'Você faz plantão?', 'Você precisará dividir plantão?',
    'Você pode fazer plantão às segundas-feiras?',
    'Você pode fazer plantão às terças-feiras?',
    'Você pode fazer plantão às quartas-feiras?',
    'Você pode fazer plantão às quintas-feiras?',
    'Você pode fazer plantão às sextas-feiras?',
    'Se você selecionou "Não" em algum momento, apresente o(s) motivo(s) pelo(s) qual(is) você não pode fazer plantão.',
    'Qual é o motivo pelo qual você precisa dividir plantão? ',
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira',
  ];
  aba.getRange(1, 1, 1, cab.length).setValues([cab]);
  aba.getRange(1, 1, 1, cab.length).setFontWeight('bold').setBackground('#B71C1C').setFontColor('#FFFFFF');

  // Dados FICTÍCIOS de exemplo. Quem divide plantão informa o horário por dia (texto livre).
  const S = 'Sim', N = 'Não', ts = new Date(), v = '';
  const ex = [
    [ts,'a@ex.com','Alice Prado','',S,N, S,N,S,N,N, v,v, v,v,v,v,v],
    [ts,'b@ex.com','Bruno Meireles','',S,N, N,S,N,S,N, v,v, v,v,v,v,v],
    [ts,'c@ex.com','Carla Nogueira','',S,N, S,S,N,N,S, v,v, v,v,v,v,v],
    [ts,'d@ex.com','Diego Fontes','',S,N, N,N,S,S,S, v,v, v,v,v,v,v],
    [ts,'e@ex.com','Elisa Barros','',S,N, S,S,S,S,S, v,v, v,v,v,v,v],
    [ts,'f@ex.com','Felipe Aragão','',S,N, N,S,S,N,N, v,v, v,v,v,v,v],
    [ts,'g@ex.com','Gabriela Torres','',S,S, N,N,N,N,N, 'Estágio à tarde', '13h às 15h','15h às 18h',v,v,v],
    [ts,'h@ex.com','Henrique Lopes','',S,S, N,N,N,N,N, 'Aulas', v,'13:00 até 16:00',v,'de 16h às 18h',v],
    [ts,'i@ex.com','Isadora Ramos','',S,N, S,N,N,S,S, v,v, v,v,v,v,v],
    [ts,'j@ex.com','João Teixeira','',S,N, N,N,S,N,S, v,v, v,v,v,v,v],
    [ts,'k@ex.com','Kátia Moura','',S,N, S,S,N,N,N, v,v, v,v,v,v,v],
    [ts,'l@ex.com','Lucas Pacheco','',S,N, N,S,N,S,S, v,v, v,v,v,v,v],
  ];
  aba.getRange(2, 1, ex.length, cab.length).setValues(ex);

  aba.getRange('A1').setNote('Esta aba deve receber as respostas do seu Google Forms. Os dados atuais são FICTÍCIOS (demo).');
  aba.setColumnWidth(1, 160);
  aba.setColumnWidth(3, 180);
}
