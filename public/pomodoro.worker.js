let timerId = null;

self.onmessage = (e) => {
  const { command } = e.data;

  if (command === 'start') {
    // Garante que não haja múltiplos intervalos rodando
    if (timerId) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      // Envia uma mensagem 'tick' para a thread principal a cada segundo
      self.postMessage({ type: 'tick' });
    }, 1000);
  } else if (command === 'stop') {
    // Para o intervalo quando instruído
    clearInterval(timerId);
    timerId = null;
  }
}; 