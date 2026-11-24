# Nosso Lar

Aplicação pessoal em português para comparar apartamentos e planejar custos. Next.js App Router, TypeScript strict, Tailwind CSS, primitivas acessíveis Radix (a mesma base do shadcn/ui), Lucide e Inter hospedada localmente. Sem analytics, imagens fictícias ou dependências pagas.

## Executar

Node.js 22 ou superior:

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. Em localhost, o app funciona sem conta e guarda os registros no localStorage e os anexos no IndexedDB. Em um endereço publicado, exige sessão e autorização no Supabase antes de abrir os imóveis. Inclui somente a cobertura do briefing. Limpar o navegador remove a cópia local: baixe uma cópia com anexos em Preferências antes disso.

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Os imóveis criados pelos testes são dados de teste isolados, nunca conteúdo inicial do aplicativo. Capturas das telas ficam em `test-results/`.

## Fluxos disponíveis

- **Imóveis:** cadastro, edição, favoritos, status e checklist. Cidade e bairro separados geram filtros automaticamente; bairros são filtrados pela cidade. O link original fica na ficha e pode ser aberto pelo card. Destaques factuais do anúncio ficam separados das anotações pessoais. Valores antigos são preservados sem inferir a separação.
- **Anexos por imóvel:** fotos, planos de pagamento e documentos. PDF, JPG, PNG, WebP, DOCX e XLSX; até 10 MB/arquivo, 20 arquivos/imóvel e 100 MB referenciados no espaço. É possível colar uma foto com Ctrl+V na ficha ou na importação com IA; a primeira foto anexada pode ser a capa. Anexos não são enviados para IA. A cópia JSON inclui os bytes dos arquivos e pode ser restaurada em outro navegador.
- **Comparar:** duas ou três opções; métricas sem preencher desconhecidos com zero; nota consensual ponderada e requisitos configuráveis.
- **Finanças:** entrada em dinheiro informada diretamente, parte à vista e parte parcelada, reserva atual editável e diferença para entrada/documentação/gastos eventuais; prestação real informada, condomínio, IPTU anual dividido por 12, obra fixa com vigência e fluxo interativo de 12 meses. Valores antigos de FGTS e subsídio continuam preservados nos dados, sem campos na interface.
- **Preferências:** renda, teto, requisitos, pesos, exportação/importação JSON e cópia manual na nuvem.

Veja `docs/DESIGN.md` para arquitetura, wireframes textuais e tokens.

## Supabase Free (configuração manual)

1. Crie um projeto no plano Free, sem ativar upgrades ou cobrança.
2. Execute `supabase/001_initial.sql` e depois `supabase/002_private_couple_and_files.sql` no SQL Editor. Insira somente os dois e-mails autorizados em `private.allowed_members`. O arquivo `supabase/003_access.local.sql`, quando fornecido localmente, contém os e-mails e é ignorado pelo Git. Em uma instalação nova, `supabase/setup.local.sql` reúne tudo em uma única transação. As tabelas e o Storage privado têm RLS; helpers privilegiados validam a identidade confirmada e a lista de acesso.
3. Copie `.env.example` para `.env.local`. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com URL e chave pública publishable (ou anon). Nunca use `service_role`. Segredos e arquivos `*.local.sql` não são versionados.
4. Em Authentication → URL Configuration, use `https://larpedroevivian.vercel.app` em **Site URL**. Em **Redirect URLs**, adicione `https://larpedroevivian.vercel.app` e `http://127.0.0.1:3000` para testes locais. Ative login por e-mail/magic link. Limites do serviço gratuito podem impedir envio; não adicione SMTP pago.
5. Cadastre os dois usuários em Authentication → Users e configure seus e-mails. O app usa `shouldCreateUser: false` e não oferece cadastro público. Recomenda-se desativar novos cadastros em Auth após criar os dois usuários.
6. Reinicie. Preferências → Nossa conta e outros aparelhos → receba o link. **Guardar na nossa conta** envia registros e anexos; **Trazer da nossa conta** recupera os imóveis. Arquivos são baixados de forma autenticada ao abrir.

Os dois e-mails autorizados compartilham um único household, criado de forma serializada. A sincronização é explícita: traga a versão da conta antes de editar em outro aparelho e guarde as mudanças depois. Não há mesclagem automática de edições simultâneas. Falhas na conta não apagam os dados locais.

O bucket `nosso-lar-private` é privado. As políticas autorizam somente os dois membros a ler ou escrever seus arquivos; não são geradas URLs públicas. Remover um anexo o desvincula da ficha; cópias já armazenadas podem permanecer para recuperação. Backups exportados anteriormente conservam seus arquivos. Não há scraping, geocodificação ou mapas.

Antes de disponibilizar a conta, valide RLS: os dois membros compartilham dados; uma terceira conta e anônimos não podem ler nem escrever registros ou anexos. O teste local em PGlite executa as migrações e verifica esses casos. Isso não substitui a verificação no projeto real.

**Estado da configuração:** a conexão pública do projeto respondeu, mas a tabela `households` ainda não existia na última verificação. O SQL não foi aplicado ao projeto real: o controle do navegador foi interrompido por não conseguir confirmar sua URL. A conexão PostgreSQL fornecida contém um placeholder de senha. Execute o script local no SQL Editor para liberar conta e arquivos entre aparelhos.

## Gemini opcional

Desativado por padrão. A integração aceita um link HTTPS público ou **texto colado**. Para links, o servidor lê apenas o HTML público, limita tamanho, tempo, redirecionamentos e destinos de rede, e envia o texto encontrado à IA. Portais que exigem sessão, renderizam tudo por JavaScript ou bloqueiam robôs podem impedir a leitura; nesse caso, cole o texto do anúncio. O link fica guardado na ficha e uma foto pode ser colada na mesma etapa. PDF e imagem não são analisados pela IA.

1. Use `gemini-3.5-flash-lite`. Em 24/11/2026, a [tabela oficial de preços](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite) indica entrada e saída de texto gratuitas no Free Tier, e a chave fornecida lista esse modelo com suporte a `generateContent`. Confirme que o projeto dessa chave está no Free Tier antes de ativar a integração; a lista de modelos não informa o plano de faturamento.
2. Configure apenas no servidor `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_ENABLED=true` e `GEMINI_FREE_TIER_CONFIRMED=true` para a conta gratuita. Se o projeto for convertido em conta paga, configure `GEMINI_BILLING_MODE=paid`; os custos devem ser monitorados no AI Studio. Nunca coloque a chave em `NEXT_PUBLIC_`.
3. A importação exige login autorizado no Supabase. Aplique `supabase/003_ai_import_success_limit.sql`: o espaço compartilhado tem limite persistente de 10 importações concluídas e 50 tentativas em 24h; falhas não consomem a cota de importações concluídas. O cache por hash/modelo dura 24h e o texto pode ter até 50.000 caracteres. Se o modelo configurado falhar por erro de servidor, timeout ou resposta sem dados válidos, há uma única tentativa com `gemini-3.1-flash-lite`. Cada chamada tem timeout de 25s; a rota tem limite de 60s.
4. O usuário autoriza o envio do texto, vê a política do Free Tier e revisa valores/fontes antes de salvar. Não envie dados financeiros pessoais. A chave só existe na rota do servidor; não é enviada ao navegador nem registrada em logs.

Os limites do aplicativo e os erros de cota do Google apresentam mensagens diferentes. Nenhum resultado atribui notas. O backend valida a resposta com Zod.

## Groq para importação

Configure `GROQ_API_KEY` apenas em Environment Variables do Vercel e mantenha `AI_ENABLED=true`. Quando a chave Groq estiver presente, o aplicativo usa `openai/gpt-oss-20b` no Groq para extrair o anúncio; sem ela, continua usando Gemini. Não é necessário mudar o Supabase. O texto público do anúncio é enviado somente ao provedor ativo, e o aplicativo mostra qual provedor receberá o texto antes do envio. A resposta passa pela mesma validação de campos e pela revisão antes de salvar. O Groq oferece camada gratuita com limites por conta/modelo; consulte os limites da sua organização antes de ativar cobrança.

## Vercel Hobby

Importe este repositório para um projeto Hobby; framework Next.js, comando de build `npm run build`. Configure as variáveis no painel Environment Variables e as URLs de Auth do Supabase. Não é preciso adicionar cartão, ativar Pro ou instalar serviços extras. Confirme que seu uso continua pessoal e não comercial conforme os [termos do Hobby](https://vercel.com/docs/plans/hobby). Se quotas gratuitas acabarem, aguarde o reset; não faça upgrade automático.

Referências: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Free](https://supabase.com/pricing). Os limites e as condições podem mudar; confira no painel antes de ativar integrações.

## Regras e limites de planejamento

Desconhecido é `null`, não zero. Entrada exige preço, financiamento, FGTS e subsídio explicitamente informados. Documentação detalhada substitui a estimativa de 6%. Os centavos das parcelas são distribuídos sem alterar o total. Sinal e primeira parcela podem ter meses diferentes; se o início das parcelas estiver vazio, usa-se o mês da entrada. Obra fixa usa os meses informados; série variável pode ser registrada como gastos eventuais identificados. Prestação não é calculada com taxas inventadas.

“Para adquirir / entrar” reúne entrada em dinheiro e documentação; gastos eventuais aparecem separadamente no fluxo. Custo recorrente é prestação + condomínio + IPTU equivalente, não evolução de obra nem parcelas transitórias da entrada. Barras parciais são subtotais conhecidos e exibem pendências. A carta de crédito de R$ 400 mil não preenche financiamento nem promete elegibilidade.

A avaliação possui cinco grupos: financeiro, localização, planta/acabamento, condomínio e riscos. Nota final só aparece com todos os grupos de peso positivo preenchidos. Pesos somam 100. Não há normalização que favoreça avaliações incompletas.

## Itens ainda não entregues

- Extração de PDF/imagem pela IA e busca direta de anúncio. Guardar anexos já está disponível e não envia conteúdo ao Gemini.
- Resolução automática de conflitos entre dispositivos. O acesso dos dois membros é configurado pelo administrador, sem convites públicos.

- Validação em Supabase/Gemini reais e publicação: dependem da configuração manual da conta, sem segredos no código.
