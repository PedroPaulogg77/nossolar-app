# Nosso Lar — arquitetura e experiência

Navegação principal: Imóveis, Mobília, Lista inicial e Inspirações. Comparar e Finanças ficam dentro de Imóveis. Sidebar no desktop; navegação inferior no celular. Preferências secundárias. Cadastro e ficha em diálogo acessível com foco contido e retorno ao acionador.

## Wireframes textuais
- Imóveis: contexto discreto / título + adicionar / apresentação editorial / busca e filtros / cards / orientação de próximo passo. Card abre ficha: Visão geral | Avaliação | Custos.
- Comparar: título / seleção de 2–3 imóveis / colunas com métricas essenciais / detalhes recolhidos. Nenhum vencedor quando faltam avaliações.
- Finanças: seletor do imóvel / reserva e métricas / mês inicial / barras de 12 meses por vez com navegação pelos períodos seguintes / detalhe do mês selecionado. Pendências em resumo acessível.

## Tokens
Inter hospedada localmente; títulos 28–40px, corpo 14–16px, métricas 28px. Fundo #F7F9F8, papel #FFF, texto #182521, secundário #697875, borda #E5EAE8, destaque #175E55. Escala de espaços 4/8px. Raios 12px. Foco visível de 3px. Ícones Lucide; placeholders geométricos sem fotografias fabricadas.

## Integridade
Somente o exemplo real do briefing. Dados desconhecidos são null. Zero exige entrada explícita. Nota final apenas com todos os critérios de peso positivo preenchidos; progresso por peso, sem renormalização. Indicadores objetivos não viram notas automaticamente. Salvamento explícito com feedback e backup validado.

## Ajustes de usabilidade
A ficha ocupa quase toda a área útil em desktop e permanece um painel de tela inteira no celular. A home abre direto na lista, sem faixa de apresentação. A entrada pode ser simples ou detalhada em etapas com meses e parcelas próprios. A reserva atual é editável em Finanças e comparada aos pagamentos à vista, documentação e gastos eventuais. Meses usam seletores separados de mês e ano; o fluxo mostra apenas as categorias presentes no período planejado.
