// pomodoro-worker.js

// O estado interno do nosso worker. Ele não tem acesso
// direto à store do Zustand, então mantém sua própria "memória".
let intervalId = null;
let timeRemaining = 0;
let isRunning = false;
let currentState = 'idle';
let elapsedSeconds = 0;
let settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};

// A função principal que roda a cada segundo.
const tick = () => {
  if (!isRunning) {
    return;
  }

  timeRemaining--;
  elapsedSeconds++;

  // Envia uma atualização de tempo para a UI a cada segundo.
  self.postMessage({ type: 'TICK', timeRemaining });

  // Se for uma sessão de foco e um minuto se passou,
  // envia um evento para salvar o progresso.
  if (currentState === 'focus' && elapsedSeconds > 0 && elapsedSeconds % 60 === 0) {
    self.postMessage({ type: 'MINUTE_COMPLETED' });
  }

  // Quando o tempo acaba, para o timer e envia um evento de final de ciclo.
  if (timeRemaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    self.postMessage({ type: 'CYCLE_ENDED', finalState: currentState });
  }
};

// Ouve os comandos vindos da aplicação principal.
self.onmessage = (e) => {
  const { command, newSettings, newTime } = e.data;

  switch (command) {
    case 'START':
      if (!isRunning) {
        isRunning = true;
        // Se o tempo não foi definido (iniciando um novo ciclo), usa as configurações.
        // Se foi definido (retomando de uma pausa), usa o tempo restante.
        timeRemaining = newTime !== undefined ? newTime : settings.focusDuration * 60;
        currentState = 'focus';
        elapsedSeconds = 0;
        
        if (!intervalId) {
          intervalId = setInterval(tick, 1000);
        }
      }
      break;

    case 'PAUSE':
      if (isRunning) {
        isRunning = false;
        clearInterval(intervalId);
        intervalId = null;
      }
      break;

    case 'RESUME':
      if (!isRunning && timeRemaining > 0) {
        isRunning = true;
        if (!intervalId) {
          intervalId = setInterval(tick, 1000);
        }
      }
      break;

    case 'RESET':
      isRunning = false;
      clearInterval(intervalId);
      intervalId = null;
      currentState = 'idle';
      elapsedSeconds = 0;
      timeRemaining = newSettings.focusDuration * 60;
      settings = newSettings; // Atualiza as configurações
      self.postMessage({ type: 'TICK', timeRemaining }); // Envia o tempo resetado para a UI
      break;
      
    case 'SKIP':
        isRunning = false;
        clearInterval(intervalId);
        intervalId = null;
        self.postMessage({ type: 'CYCLE_ENDED', finalState: currentState });
        break;

    case 'SET_STATE':
        currentState = e.data.state;
        timeRemaining = e.data.time;
        elapsedSeconds = 0;
        isRunning = true;
        if (!intervalId) {
            intervalId = setInterval(tick, 1000);
        }
        break;
        
    case 'UPDATE_SETTINGS':
        settings = newSettings;
        // Se não estiver rodando, atualiza o tempo inicial com a nova duração de foco
        if (!isRunning && currentState === 'idle') {
            timeRemaining = newSettings.focusDuration * 60;
            self.postMessage({ type: 'TICK', timeRemaining });
        }
        break;
  }
}; 