// Simple Web Audio API Synthesizer for Sci-Fi UI Sounds

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume context if suspended (browser auto-play policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Returns a reference to an oscillator to allow stopping it
export const playProcessingHum = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine'; // Low hum
    osc.frequency.setValueAtTime(55, ctx.currentTime); // Low frequency A1
    
    // Add a slight wobble (LFO effect) by automating frequency slightly
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 1.0);
    osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 1.5);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5); // Fade in

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();

    // Return a function to stop the hum gracefully
    return () => {
      const stopTime = ctx.currentTime + 0.5;
      gainNode.gain.linearRampToValueAtTime(0, stopTime);
      osc.stop(stopTime);
    };
  } catch (e) {
    console.error("Audio generation failed:", e);
    return () => {};
  }
};

export const playSuccessPing = () => {
  try {
    const ctx = getAudioContext();
    
    // Create two oscillators for a richer, sci-fi "chime"
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // High tech ping frequencies
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Slide up to A6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime); // A6
    
    // Envelope: sharp attack, quick decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error("Audio generation failed:", e);
  }
};
