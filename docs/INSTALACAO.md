# Instalação

> Tudo roda no navegador, dentro do Google Sheets. Não precisa de terminal.

## 1. Criar o projeto

1. Crie (ou abra) uma planilha no Google Sheets.
2. **Extensões → Apps Script**.
3. No editor, o arquivo `Code.gs` já existe: **selecione todo o conteúdo e apague** (Ctrl+A, Delete) antes de colar. Não cole dentro de `function myFunction() {}`.

## 2. Adicionar os arquivos

Crie um arquivo `.gs` para cada item de `src/` (botão **+** ao lado de "Arquivos" → *Script*) e cole o conteúdo:

`Code` · `Config` · `Leitura` · `Algoritmo` · `Setup`

Salve com **Ctrl+S**. (`dev/Debug.gs` é opcional, só para diagnóstico.)

## 3. Autorizar e configurar

1. Recarregue a planilha. O menu **⚙️ Escala** aparece.
   - Se não aparecer: no Apps Script, selecione `onOpen` no seletor de funções e clique em **▶ Executar**, aceitando as permissões.
2. **⚙️ Escala → 🏗️ Configurar Planilha** cria as abas: `Membros`, `Config`, `Escala Base`, `Trocas`, `Escala Final`, `Histórico` (e `Disponibilidade` de demonstração, se ainda não existir).

## 4. Preencher

- **Config**: diretor de cada dia e parâmetros (`MEMBROS_POR_DIA`, `MAX_PLANTOES_SEMANA`, `ROTACAO_ATIVA`).
- **Membros**: nome (idêntico ao do Forms), máximo de plantões, se divide, ativo e `Dia_Fixo` (ex.: `Quarta` ou `Segunda,Sexta`).
- **Disponibilidade**: vem do Google Forms. Os cabeçalhos devem seguir o formato da demonstração (as colunas são localizadas pelo texto da pergunta).

## 5. Usar

| Ação | Menu |
|---|---|
| Gerar a escala da semana | ⚙️ Escala → 📋 Gerar Escala Semanal |
| Aplicar trocas aprovadas | ⚙️ Escala → 🔄 Aplicar Trocas Aprovadas |
| Refazer só a visualização | ⚙️ Escala → 📊 Atualizar Escala Final |
| Refazer a semana do zero | ⚙️ Escala → 🧹 Limpar Escala da Semana Atual |

## Trocas

Na aba `Trocas`, adicione uma linha com o `ID_Escala` (coluna A da `Escala Base`), o nome original, o novo membro e mude o status para `aprovado`. Depois aplique pelo menu. A escala original não é alterada.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Membro não aparece | Nome diferente entre Forms e `Membros` | Igualar os nomes |
| Menu não aparece | Script não salvo / página não recarregada | Salvar e recarregar |
| Escala Final vazia | Nenhuma escala gerada para a semana | Gerar pelo menu |
| Dia com poucos membros | Poucos disponíveis no Forms | Comportamento esperado |
