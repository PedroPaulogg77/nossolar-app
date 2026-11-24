# Validação — 24/11/2026

- Build de produção Next.js e TypeScript strict aprovados.
- 15 testes automatizados passaram, incluindo fórmulas, dados ausentes, filtros de cidade/bairro, validação de anexos e autorização com Postgres local em memória. O teste de acesso executa as migrações, permite os dois membros e bloqueia um terceiro e anônimos nos registros e no Storage.
- 8 cenários Playwright passaram no build de produção: cadastro, persistência, comparação, finanças, preferências, filtros de localização, anexos, backup/restauração, rejeição de arquivo disfarçado e tela privada sem sessão.
- Capturas desktop e mobile em `test-results/` foram revisadas. A home agora abre diretamente na lista do casal, sem apresentação de produto; cidade e bairro possuem filtros claros no celular; anexos ficam na ficha.
- A chave do Gemini, os e-mails de acesso e o SQL local com esses e-mails estão ignorados pelo Git. A IA permanece desligada.

Não verificado no projeto real: execução das migrações, login por e-mail, upload no Storage, Gemini e publicação Vercel. A conexão pública do Supabase respondeu, mas ainda não há tabelas da aplicação. O painel não pôde ser automatizado porque a ferramenta de controle do navegador não confirmou a URL aberta; nenhuma alteração foi feita nele.

## Revisão de usabilidade
A ficha ampla, entrada parcelada parcialmente e reserva editável foram conferidas em desktop. A tela Finanças com seletores de mês/ano e cores distintas foi revisada em 390px. Build, TypeScript, testes de domínio e navegador passaram após os ajustes.
