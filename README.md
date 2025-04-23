# Studar - Plataforma de Gerenciamento de Estudos

O Studar é uma aplicação web desenvolvida para ajudar estudantes a organizar e otimizar seu tempo de estudo, combinando as técnicas de Pomodoro e revisão espaçada.

## Principais Funcionalidades

### 🎯 Gerenciamento de Matérias e Tópicos
- Crie e organize matérias por cores
- Adicione tópicos específicos dentro de cada matéria
- Acompanhe seu progresso em cada área de estudo

### ⏱️ Timer Pomodoro
- Técnica de produtividade que alterna entre períodos de foco intenso e pausas curtas
- Personalize a duração de seus períodos de foco e pausa
- Associe suas sessões de estudo a tópicos específicos para acompanhamento

### 📅 Revisão Espaçada
- Sistema automático de agendamento de revisões (1, 7 e 30 dias)
- Visualização em calendário das revisões programadas
- Marcação de revisões como concluídas

### 📊 Estatísticas Detalhadas
- Acompanhe seu tempo total de estudo
- Visualize a distribuição de tempo entre matérias
- Veja o progresso das revisões concluídas

## Instruções de Uso

### Configuração de Ambiente

1. Certifique-se de ter Node.js instalado (v14 ou superior)
2. Clone este repositório
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse a aplicação em `http://localhost:3000`

### Como Começar

1. **Crie suas matérias**: Comece configurando as matérias que você está estudando, atribuindo cores para facilitar a visualização
2. **Adicione tópicos**: Dentro de cada matéria, adicione os tópicos específicos que precisa estudar
3. **Use o Pomodoro**: Selecione um tópico e inicie uma sessão de estudo focado com o timer Pomodoro
4. **Realize revisões**: Acompanhe o calendário para ver quando deve revisar os tópicos e marque-os como concluídos

## Tecnologias Utilizadas

- Next.js (React)
- TypeScript
- Tailwind CSS
- Zustand (gerenciamento de estado)
- Date-fns (manipulação de datas)

## Boas Práticas de Estudo

- **Consistência**: Estude regularmente, mesmo que por períodos curtos, em vez de sessões longas e esporádicas
- **Revisão Espaçada**: Revisite o material em intervalos crescentes para fortalecer a memória de longo prazo
- **Técnica Pomodoro**: Alterne entre períodos de foco intenso e pausas curtas para manter a concentração
- **Organização**: Divida o material em tópicos gerenciáveis para evitar sobrecarga cognitiva

## Contribuição

Contribuições são bem-vindas! Se encontrar problemas ou tiver sugestões para melhorar a aplicação, sinta-se à vontade para abrir uma issue ou enviar um pull request.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## Implementação do Modo Escuro

O projeto utiliza um modo escuro totalmente funcional, que foi integrado à implementação existente:

1. **Estado global com Zustand**:
   - Utilização do store `settingsStore.ts` para gerenciar as configurações da aplicação
   - Persistência das configurações usando `persist` do Zustand
   - Aproveitamento da propriedade `darkMode` e método `toggleDarkMode` existentes

2. **Configuração do Tailwind**:
   - Adição de `darkMode: 'class'` no arquivo `tailwind.config.js`
   - Uso de classes condicionais `dark:class-name` em todos os componentes

3. **Botão de alternância no header**:
   - Implementação de botão no cabeçalho com ícones específicos (Sol/Lua) para cada modo
   - Ícones adaptativos com base no estado atual do tema
   - Versão mobile e desktop do botão

4. **Estilização adaptativa**:
   - Cores de fundo e texto responsivas ao tema
   - Ícones e elementos de interface adaptados para melhor contraste
   - Classes específicas para dark mode em cada componente relevante

5. **Inicialização automática**:
   - Inicialização do tema correto na carga da aplicação
   - Persistência da preferência do usuário entre sessões

## Tecnologias

- Next.js
- TypeScript
- Tailwind CSS
- Zustand para gerenciamento de estado
- HeadlessUI + HeroIcons 