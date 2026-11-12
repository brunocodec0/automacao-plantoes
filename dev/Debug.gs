function debugCompleto() {
  const disp = lerDisponibilidade();
  
  console.log('=== DISPONIBILIDADE LIDA (' + disp.length + ' membros) ===');
  disp.forEach(m => {
    const dias = Object.entries(m.disponivel)
      .filter(([d, v]) => v)
      .map(([d]) => d)
      .join(', ');
    console.log('"' + m.nome + '" | divide=' + m.dividePlantao + ' | dias: [' + dias + ']');
  });
}

function debugAlgoritmo() {
  const disponibilidade = lerDisponibilidade();
  const membros   = lerMembros();
  const diretores = lerDiretores();
  const historico = lerHistorico();
  const semana    = getSemanaISO(new Date());
  const ano       = new Date().getFullYear();

  const escala = gerarEscalaBase(disponibilidade, membros, diretores, historico, semana, ano);

  console.log('=== ESCALA GERADA ===');
  const porDia = {};
  escala.forEach(e => {
    if (!porDia[e.dia]) porDia[e.dia] = [];
    porDia[e.dia].push(e.membro);
  });

  ['Segunda','Terça','Quarta','Quinta','Sexta'].forEach(dia => {
    const lista = porDia[dia] || [];
    const duplicatas = lista.filter((v, i) => lista.indexOf(v) !== i);
    const flag = duplicatas.length > 0 ? ' ⚠️ DUPLICATA: ' + duplicatas.join(', ') : '';
    console.log(dia + ' (' + lista.length + '): [' + lista.join(', ') + ']' + flag);
  });

  console.log('=== PLANTÕES POR MEMBRO ===');
  const porMembro = {};
  escala.forEach(e => {
    if (e.membro.startsWith('(sem')) return;
    if (!porMembro[e.membro]) porMembro[e.membro] = [];
    porMembro[e.membro].push(e.dia);
  });
  Object.entries(porMembro).forEach(([nome, dias]) => {
    const divInfo = disponibilidade.find(m => m.nome.trim() === nome.trim());
    const divide  = divInfo ? divInfo.dividePlantao : '?';
    const flag    = (!divide && dias.length > 1) ? ' ⚠️ NAO DIVIDE MAS ESTA EM ' + dias.length + ' DIAS' : '';
    if (dias.length > 1 || flag) {
      console.log('"' + nome + '" divide=' + divide + ' -> [' + dias.join(', ') + ']' + flag);
    }
  });
}
